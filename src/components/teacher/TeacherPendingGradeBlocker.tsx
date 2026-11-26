import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { toLocalDate } from '@/lib/dateUtils';
import { cleanStudentName } from '@/lib/courseUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  GraduationCap,
  UserX,
  Clock,
  Calendar,
  LogOut,
  RefreshCw,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

export interface PendingClass {
  id: number;
  date: string;
  time: string;
  start_time?: string | null;
  end_time?: string | null;
  timezone?: string | null;
  title: string;
  student_name: string;
  class_grade?: number | null;
  is_absent?: boolean | null;
  class_type?: string | null;
  class_chapter?: string | null;
  class_level?: string | null;
  notes?: string | null;
  teacher_id?: string | null;
}

/**
 * Determines whether today's class scheduled session has ended ("past the time of class").
 * Strictly checks classes for today; ignores past and future days.
 */
export const isClassPast = (cls: {
  date: string;
  time?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  timezone?: string | null;
}): boolean => {
  if (!cls.date) return false;

  const now = new Date();

  // Determine today in school timezone (America/Sao_Paulo)
  let todayInSchoolTz = format(now, 'yyyy-MM-dd');
  try {
    const schoolNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    todayInSchoolTz = format(schoolNow, 'yyyy-MM-dd');
  } catch {
    // fallback to local date
  }

  // Only check classes for today (not past or future days)
  if (cls.date !== todayInSchoolTz) {
    return false;
  }

  // Class is TODAY. Compare class end time to current time
  const timeSource = cls.end_time || cls.start_time || cls.time;
  if (!timeSource) {
    return false;
  }

  try {
    const tz = cls.timezone || 'America/Sao_Paulo';

    if (cls.end_time) {
      let cleanEnd = cls.end_time.trim();
      if (cleanEnd.includes('T')) {
        cleanEnd = cleanEnd.split('T')[1];
      }
      cleanEnd = cleanEnd.substring(0, 5);

      const classEndDate = toLocalDate(cls.date, cleanEnd, tz);
      return now.getTime() >= classEndDate.getTime();
    } else {
      // If end_time is not explicitly set, calculate end time as start time + 50 minutes (standard class duration)
      const startStr = cls.start_time || cls.time || '00:00';
      let cleanStart = startStr.trim();
      if (cleanStart.includes('T')) {
        cleanStart = cleanStart.split('T')[1];
      }
      cleanStart = cleanStart.substring(0, 5);

      const classStartDate = toLocalDate(cls.date, cleanStart, tz);
      const classEndDate = new Date(classStartDate.getTime() + 50 * 60 * 1000);
      return now.getTime() >= classEndDate.getTime();
    }
  } catch (err) {
    console.error('Error determining if class is past:', err);
    return false;
  }
};

export const TeacherPendingGradeBlocker: React.FC = () => {
  const { role, teacherName, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingClasses, setPendingClasses] = useState<PendingClass[]>([]);
  const [teacherDbId, setTeacherDbId] = useState<string | null>(null);

  // Absence State (inline confirmation per class id)
  const [confirmingAbsenceId, setConfirmingAbsenceId] = useState<number | null>(null);
  const [submittingAbsenceId, setSubmittingAbsenceId] = useState<number | null>(null);

  // Fetch teacher database ID
  useEffect(() => {
    if (role !== 'teacher' || !teacherName) {
      setLoading(false);
      return;
    }

    const fetchTeacherId = async () => {
      try {
        const { data: teacherRecord } = await supabase
          .from('teachers')
          .select('id, name')
          .ilike('name', teacherName)
          .maybeSingle();

        setTeacherDbId(teacherRecord?.id || null);
      } catch (err) {
        console.error('Error fetching teacher ID:', err);
      }
    };

    fetchTeacherId();
  }, [role, teacherName]);

  // Main check function to find today's past classes that are neither graded nor marked absent
  const checkPendingGrades = useCallback(async () => {
    if (role !== 'teacher' || !teacherName) {
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      let todayStr = format(now, 'yyyy-MM-dd');
      try {
        const schoolNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        todayStr = format(schoolNow, 'yyyy-MM-dd');
      } catch {}

      // Only check classes scheduled for TODAY (not past days)
      let query = supabase
        .from('classes')
        .select('id, date, time, start_time, end_time, timezone, title, student_name, class_grade, is_absent, class_type, class_chapter, class_level, notes, teacher_id')
        .eq('date', todayStr)
        .is('class_grade', null)
        .or('is_absent.is.null,is_absent.eq.false')
        .order('date', { ascending: false });

      if (teacherDbId) {
        query = query.or(`teacher_id.eq.${teacherDbId},title.eq.${teacherName},title.ilike.%- ${teacherName}%`);
      } else {
        query = query.or(`title.eq.${teacherName},title.ilike.%- ${teacherName}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error checking pending grades:', error);
        return;
      }

      if (!data || data.length === 0) {
        setPendingClasses([]);
        return;
      }

      // Filter on client side to ensure strict teacher ownership & strictly past scheduled time today
      const overdue: PendingClass[] = [];

      for (const cls of data) {
        // Skip drafts if draft status exists
        if ((cls as any).status === 'draft') continue;

        // Skip if already graded or marked absent
        if (cls.class_grade !== null && cls.class_grade !== undefined) continue;
        if (cls.is_absent === true) continue;

        // Verify teacher title match to prevent substring mismatches
        const title = cls.title || '';
        const parts = title.split(' - ');
        const teacherNameFromTitle = parts.length > 1 ? parts[1].trim().toLowerCase() : title.toLowerCase();

        const isAssigned =
          (teacherDbId && cls.teacher_id === teacherDbId) ||
          teacherNameFromTitle.includes(teacherName.toLowerCase());

        if (!isAssigned) continue;

        // Check if class time has already elapsed today
        if (isClassPast(cls)) {
          overdue.push(cls);
        }
      }

      setPendingClasses(overdue);
    } catch (err) {
      console.error('Error evaluating pending classes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role, teacherName, teacherDbId]);

  // Run check on mount, route changes, or teacher ID load
  useEffect(() => {
    checkPendingGrades();

    // Check periodically every 60 seconds (so as soon as an in-progress class ends, it triggers)
    const interval = setInterval(() => {
      checkPendingGrades();
    }, 60 * 1000);

    // Listen to custom 'class-graded' event dispatched by TeacherGrade
    const handleClassGraded = (event: any) => {
      const gradedId = event?.detail?.classId;
      if (gradedId) {
        setPendingClasses((prev) => prev.filter((c) => c.id !== gradedId));
      }
      checkPendingGrades();
    };

    window.addEventListener('class-graded', handleClassGraded);
    window.addEventListener('focus', checkPendingGrades);

    return () => {
      clearInterval(interval);
      window.removeEventListener('class-graded', handleClassGraded);
      window.removeEventListener('focus', checkPendingGrades);
    };
  }, [checkPendingGrades, location.pathname]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkPendingGrades();
    toast.success('Classes refreshed');
  };

  // Handle Mark as Absent (Direct inline execution)
  const handleConfirmAbsence = async (cls: PendingClass) => {
    setSubmittingAbsenceId(cls.id);

    try {
      const { data, error } = await supabase
        .from('classes')
        .update({
          is_absent: true,
          class_grade: null,
        })
        .eq('id', cls.id)
        .select('*');

      if (error) throw error;

      const studentNameClean = cleanStudentName(cls.student_name);
      toast.success(`Marked ${studentNameClean} as absent.`);

      // Dispatch event to inform other schedule/calendar views
      window.dispatchEvent(new CustomEvent('class-graded', { detail: { classId: cls.id } }));

      const updated = pendingClasses.filter((c) => c.id !== cls.id);
      setPendingClasses(updated);
      setConfirmingAbsenceId(null);

      if (updated.length === 0) {
        toast.success('🎉 All pending classes resolved! Platform unlocked.');
      }
    } catch (err: any) {
      console.error('Error marking absent:', err);
      toast.error('Failed to mark student as absent. Please try again.');
    } finally {
      setSubmittingAbsenceId(null);
    }
  };

  // Only teachers are subject to this requirement
  if (role !== 'teacher' || loading) {
    return null;
  }

  // If there are no pending classes, nothing to block
  if (pendingClasses.length === 0) {
    return null;
  }

  const isOnGradePage = location.pathname === '/teacher/grade';

  // ─────────────────────────────────────────────────────────────
  // RENDER: Overdue Classes List with Inline Actions
  // ─────────────────────────────────────────────────────────────

  const renderOverdueClassesList = () => (
    <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
      {pendingClasses.map((cls) => {
        const studentClean = cleanStudentName(cls.student_name);
        const isConfirmingAbsence = confirmingAbsenceId === cls.id;
        const isSubmittingAbsence = submittingAbsenceId === cls.id;

        return (
          <div
            key={cls.id}
            className="p-4 rounded-2xl border border-border/80 bg-background/80 hover:bg-background transition-all shadow-xs"
          >
            {/* Top row: Student info and action buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-foreground tracking-tight">
                    {studentClean}
                  </span>
                  {cls.class_level && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                      {cls.class_level}
                    </Badge>
                  )}
                  {cls.class_type && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                      {cls.class_type}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Today
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {cls.time}
                  </span>
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-semibold">
                    Awaiting Action
                  </Badge>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                {isConfirmingAbsence ? (
                  <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 p-1 rounded-xl border border-red-200 dark:border-red-900/50">
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 px-1.5">
                      Confirm absence?
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleConfirmAbsence(cls)}
                      disabled={isSubmittingAbsence}
                      className="rounded-lg text-xs h-8 px-2.5 shadow-xs"
                    >
                      {isSubmittingAbsence ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        'Yes, Confirm'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmingAbsenceId(null)}
                      disabled={isSubmittingAbsence}
                      className="rounded-lg text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmingAbsenceId(cls.id)}
                      className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 rounded-xl text-xs h-9"
                    >
                      <UserX className="w-3.5 h-3.5 mr-1.5" />
                      Mark Absent
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => navigate(`/teacher/grade?class=${cls.id}`)}
                      className="flex-1 sm:flex-none rounded-xl text-xs h-9 shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                      Grade Class
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          CASE 1: Teacher is on /teacher/grade
          Use fixed bottom-right compact banner so it NEVER participates
          in DashboardLayout's flex row or obstructs the grading form.
      ───────────────────────────────────────────────────────────── */}
      {isOnGradePage && (
        <div className="fixed bottom-4 right-4 z-40 w-[min(92vw,400px)] rounded-2xl bg-background/95 border border-destructive/30 p-3.5 shadow-lg backdrop-blur-md animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-foreground truncate">
                  {pendingClasses.length} class{pendingClasses.length > 1 ? 'es' : ''} awaiting grades today
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Finish grading to unlock other pages.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-7 px-2.5 text-xs rounded-xl border-destructive/30 hover:bg-destructive/10 text-destructive dark:text-red-400 shrink-0"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CASE 2: Teacher is on any OTHER route
          Show full-screen non-dismissible blocker modal.
      ───────────────────────────────────────────────────────────── */}
      {!isOnGradePage && (
        <div className="fixed inset-0 z-40 bg-background/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <Card className="max-w-2xl w-full my-auto rounded-3xl shadow-2xl border border-destructive/20 bg-card text-card-foreground overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold tracking-wide uppercase">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Action Required
                </div>

                <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs">
                  {pendingClasses.length} Today's Overdue Class{pendingClasses.length > 1 ? 'es' : ''}
                </Badge>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-4">
                Today's Class Resolution Required
              </h2>
              <p className="text-red-50 text-sm sm:text-base mt-1.5 leading-relaxed max-w-xl">
                Classes scheduled for today must be graded or marked as absent once the class time has ended.
                Please resolve each class below to continue using the platform.
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Summary Bar */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-destructive/5 border border-destructive/15">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-destructive dark:text-red-400">
                    Awaiting Your Feedback
                  </span>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {pendingClasses.length} class{pendingClasses.length > 1 ? 'es' : ''} past scheduled time today
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-xl text-xs h-9"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>

              {/* Class list */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Select an action for each class:
                </p>
                {renderOverdueClassesList()}
              </div>

              {/* Footer info & Logout */}
              <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                <p className="text-center sm:text-left">
                  Recording grades & absences immediately ensures accurate student records and eliminates payroll delays.
                </p>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0 rounded-xl"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Log Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default TeacherPendingGradeBlocker;
