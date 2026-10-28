import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export interface PendingRecuperationItem {
  id: string;
  student_id: string;
  student_name: string;
  date: string | null;
  notes: string | null;
  created_at?: string;
  status: 'pending' | 'completed' | 'cancelled';
}

/**
 * Creates a recuperation credit for a student (e.g. from courtesy cancellation or reschedule)
 */
export async function grantRecuperationCredit({
  studentId,
  studentName,
  originalDate,
  originalTime,
  reason = 'Admin courtesy reschedule',
}: {
  studentId: string;
  studentName?: string;
  originalDate?: string;
  originalTime?: string;
  reason?: string;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const formattedNotes = originalDate 
      ? `[Courtesy Credit] ${reason}. Cancelled class on ${originalDate}${originalTime ? ` at ${originalTime}` : ''}.`
      : `[Courtesy Credit] ${reason}.`;

    const { data, error } = await supabase
      .from('recuperation_classes')
      .insert({
        student_id: studentId,
        status: 'pending',
        date: originalDate || null,
        notes: formattedNotes,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    console.error('Error granting recuperation credit:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Marks a recuperation as scheduled with a specific class
 */
export async function linkRecuperationToScheduledClass({
  recuperationId,
  classId,
  classDate,
  classTime,
  teacherName,
}: {
  recuperationId: string;
  classId: number | string;
  classDate: string;
  classTime: string;
  teacherName?: string;
}): Promise<boolean> {
  try {
    // 1. Fetch current recuperation notes
    const { data: recup } = await supabase
      .from('recuperation_classes')
      .select('notes')
      .eq('id', recuperationId)
      .single();

    const existingNotes = recup?.notes || '';
    const scheduledNote = `[Scheduled: ${classDate} ${classTime}${teacherName ? ` with ${teacherName}` : ''}] [Class ID: ${classId}]`;
    const updatedNotes = existingNotes ? `${existingNotes} | ${scheduledNote}` : scheduledNote;

    // 2. Mark recuperation as completed/resolved now that date and time have been set by admin
    const { error: recupErr } = await supabase
      .from('recuperation_classes')
      .update({
        status: 'completed',
        date: classDate,
        notes: updatedNotes,
      })
      .eq('id', recuperationId);

    if (recupErr) throw recupErr;

    // 3. Mark the class with class_type = 'recuperation' and reference the recuperation
    await supabase
      .from('classes')
      .update({
        class_type: 'recuperation',
        notes: `Recuperation Class [Recup ID: ${recuperationId}]`,
      })
      .eq('id', classId);

    return true;
  } catch (err) {
    console.error('Failed to link recuperation to class:', err);
    return false;
  }
}

/**
 * Automatically inspects past classes and pending recuperations,
 * transitioning past extra classes to 'completed' with accurate notes
 * (e.g., Graded, Student absent without notice, or Session elapsed).
 */
export async function syncRecuperationsStatus(): Promise<number> {
  try {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const currentTimeStr = format(new Date(), 'HH:mm');

    // 1. Fetch all pending recuperations
    const { data: pendingRecups, error: recupError } = await supabase
      .from('recuperation_classes')
      .select('*')
      .eq('status', 'pending');

    if (recupError || !pendingRecups || pendingRecups.length === 0) {
      return 0;
    }

    let updatedCount = 0;

    for (const recup of pendingRecups) {
      const notes = recup.notes || '';
      
      // Check if this recuperation has a linked Class ID in its notes
      const classIdMatch = notes.match(/\[Class ID:\s*(\d+)\]/i);
      
      if (classIdMatch && classIdMatch[1]) {
        const classId = parseInt(classIdMatch[1], 10);
        
        const { data: cls } = await supabase
          .from('classes')
          .select('id, date, time, end_time, is_absent, class_grade, speaking_grade')
          .eq('id', classId)
          .maybeSingle();

        if (cls) {
          const classDate = cls.date;
          const classTime = cls.end_time || cls.time || '23:59';
          const isPast = classDate < todayStr || (classDate === todayStr && classTime <= currentTimeStr);

          if (isPast) {
            let resolutionNote = 'Class recuperated: session elapsed';
            
            if (cls.is_absent) {
              resolutionNote = "Class recuperated: student didn't come and didn't cancel on time";
            } else if (cls.class_grade != null || cls.speaking_grade != null) {
              const gradesSummary = [
                cls.class_grade != null ? `Class: ${cls.class_grade}` : null,
                cls.speaking_grade != null ? `Speaking: ${cls.speaking_grade}` : null,
              ].filter(Boolean).join(', ');
              resolutionNote = `Class recuperated, grades: ${gradesSummary || 'Recorded'}`;
            }

            await supabase
              .from('recuperation_classes')
              .update({
                status: 'completed',
                notes: `${notes} — [${resolutionNote}]`,
              })
              .eq('id', recup.id);

            updatedCount++;
            continue;
          }
        }
      }

      // If scheduled date is in the past without class ID (legacy/manual), resolve if date is older than today
      if (recup.date && recup.date < todayStr && notes.includes('[Scheduled:')) {
        await supabase
          .from('recuperation_classes')
          .update({
            status: 'completed',
            notes: `${notes} — [Class recuperated: scheduled date passed]`,
          })
          .eq('id', recup.id);

        updatedCount++;
      }
    }

    return updatedCount;
  } catch (err) {
    console.error('Error during recuperations sync:', err);
    return 0;
  }
}

/**
 * Fetches all pending recuperations and guarantees student names are resolved
 */
export async function fetchPendingRecuperations(): Promise<PendingRecuperationItem[]> {
  try {
    // 1. Auto-resolve any past classes/sessions first
    await syncRecuperationsStatus();

    // 2. Auto-resolve any recuperation where date/time has already been set by admin
    try {
      const { data: alreadyScheduled } = await supabase
        .from('recuperation_classes')
        .select('id, notes')
        .eq('status', 'pending')
        .or('notes.ilike.%[Scheduled:%,notes.ilike.%[Class ID:%');

      if (alreadyScheduled && alreadyScheduled.length > 0) {
        for (const item of alreadyScheduled) {
          await supabase
            .from('recuperation_classes')
            .update({ status: 'completed' })
            .eq('id', item.id);
        }
      }
    } catch (e) {
      // Non-blocking fallback
    }

    // 3. Fetch pending recuperations and students table in parallel
    const [recupsRes, studentsRes] = await Promise.all([
      supabase
        .from('recuperation_classes')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('students')
        .select('id, student_name, email')
        .order('student_name', { ascending: true })
    ]);

    if (recupsRes.error) {
      console.error('Error fetching recuperation_classes:', recupsRes.error);
      return [];
    }

    const recups = recupsRes.data || [];
    const students = studentsRes.data || [];

    // Build multi-key student map (by id, trimmed id, lowercase id, and email)
    const studentMap: Record<string, string> = {};
    students.forEach((s: any) => {
      if (s.id) {
        studentMap[String(s.id).trim()] = s.student_name;
        studentMap[String(s.id).trim().toLowerCase()] = s.student_name;
      }
      if (s.email) {
        studentMap[String(s.email).trim().toLowerCase()] = s.student_name;
      }
    });

    // Check if any recuperation student IDs need resolving via class assignments fallback
    const unresolvedIds = recups
      .filter((r: any) => !r.student_name && !studentMap[String(r.student_id).trim()])
      .map((r: any) => r.student_id)
      .filter(Boolean);

    if (unresolvedIds.length > 0) {
      try {
        const { data: assignments } = await supabase
          .from('class_assignments')
          .select('student_id, classes ( student_name )')
          .in('student_id', unresolvedIds)
          .limit(100);

        (assignments || []).forEach((a: any) => {
          if (a.student_id && a.classes?.student_name) {
            studentMap[String(a.student_id).trim()] = a.classes.student_name;
          }
        });
      } catch (e) {
        // Fallback silently
      }
    }

    const enriched: PendingRecuperationItem[] = recups.map((r: any) => {
      let resolvedName: string | null = null;

      // 1. Direct column on row
      if (r.student_name && r.student_name.trim() !== '' && r.student_name.toLowerCase() !== 'student') {
        resolvedName = r.student_name;
      }

      // 2. Lookup via student_id in studentMap
      if (!resolvedName && r.student_id) {
        const idKey = String(r.student_id).trim();
        resolvedName = studentMap[idKey] || studentMap[idKey.toLowerCase()] || null;
      }

      // 3. Fallback: check notes for names
      if (!resolvedName && r.notes) {
        const forMatch = r.notes.match(/for\s+([A-Za-zÀ-ÿ\s]+?)(?:\.|\s+cancelled|\s+class|\s+on|\s*\[|$)/i);
        if (forMatch && forMatch[1] && forMatch[1].trim().length > 2) {
          resolvedName = forMatch[1].trim();
        }
      }

      return {
        id: r.id,
        student_id: r.student_id,
        student_name: resolvedName || 'Student',
        date: r.date,
        notes: r.notes,
        status: r.status,
        created_at: r.created_at,
      };
    });

    return enriched;
  } catch (err) {
    console.error('Failed to fetch pending recuperations:', err);
    return [];
  }
}
