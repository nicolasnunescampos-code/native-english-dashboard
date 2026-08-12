import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Event as CalendarEvent, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, endOfWeek, getDay, addWeeks } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { supabase, Class, Teacher, Student } from '@/lib/supabase';
import { ClassModal, ClassFormData } from '@/components/calendar/ClassModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

// Custom Event Interface mapping to our data
interface CalendarClassEvent extends CalendarEvent {
    resource: Class; // Store the full class object
}

import { EventProps } from 'react-big-calendar';

const CustomEvent = ({ event }: EventProps<CalendarClassEvent>) => {
    return (
        <div 
            className="h-full w-full flex flex-col justify-start overflow-hidden p-0.5" 
            title={`${event.title}\n${format(event.start!, 'h:mm a')} - ${format(event.end!, 'h:mm a')}`}
        >
            <div className="font-semibold text-[9px] sm:text-[10px] leading-[1.1] line-clamp-3 break-words">
                {event.title}
            </div>
            <div className="text-[8px] sm:text-[9px] opacity-90 leading-none mt-0.5 truncate">
                {format(event.start!, 'h:mm a')}
            </div>
        </div>
    );
};

const AdminCalendar: React.FC = () => {
    const { toast } = useToast();
    const [events, setEvents] = useState<CalendarClassEvent[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<ClassFormData | null>(null);
    const [modalLoading, setModalLoading] = useState(false);

    const [date, setDate] = useState(new Date());
    const [view, setView] = useState<View>('week');
    const [searchQuery, setSearchQuery] = useState('');

    // Track the currently visible range to fetch only what's needed
    const [currentRange, setCurrentRange] = useState<{ start: Date; end: Date }>({
        start: startOfWeek(new Date()),
        end: endOfWeek(new Date())
    });

    const fetchReferenceData = async () => {
        // Fetch Teachers
        const { data: teachersData } = await supabase.from('teachers').select('*');
        if (teachersData) setTeachers(teachersData);

        // Fetch Students
        const { data: studentsData } = await supabase.from('students').select('*');
        if (studentsData) setStudents(studentsData);

        return teachersData || [];
    };

    const fetchClasses = async (start: Date, end: Date, teachersList?: Teacher[]) => {
        setLoading(true);

        const startDateStr = format(start, 'yyyy-MM-dd');
        const endDateStr = format(end, 'yyyy-MM-dd');

        console.log('Fetching classes range:', startDateStr, 'to', endDateStr);

        // Join classes with teachers and assignments
        const { data, error } = await supabase
            .from('classes')
            .select(`
        *,
        class_assignments (
          student_id
        )
      `)
            .gte('date', startDateStr)
            .lte('date', endDateStr)
            .order('date', { ascending: true })
            .order('time', { ascending: true });

        if (error) {
            toast({ title: 'Error loading classes', description: error.message, variant: 'destructive' });
            setLoading(false);
            return;
        }

        if (data) {
            // console.log('AdminCalendar: raw data', data);
            const rawEvents: CalendarClassEvent[] = data.map((cls: any) => {
                const dateStr = cls.date;
                const startTimeStr = cls.start_time || cls.time || '10:00';
                const timeZone = cls.timezone || 'America/Sao_Paulo';

                let start;
                try {
                    const timePart = startTimeStr.includes('T') ? startTimeStr.split('T')[1].substring(0, 5) : startTimeStr;
                    start = fromZonedTime(`${dateStr} ${timePart}:00`, timeZone);
                } catch(e) {
                    if (startTimeStr.includes('T')) start = new Date(startTimeStr);
                    else start = new Date(`${dateStr}T${startTimeStr}`);
                }

                let end;
                try {
                    if (cls.end_time) {
                        const endPart = cls.end_time.includes('T') ? cls.end_time.split('T')[1].substring(0, 5) : cls.end_time;
                        end = fromZonedTime(`${dateStr} ${endPart}:00`, timeZone);
                    } else {
                        end = new Date(start.getTime() + 50 * 60 * 1000);
                    }
                } catch(e) {
                    if (cls.end_time && cls.end_time.includes('T')) end = new Date(cls.end_time);
                    else if (cls.end_time) end = new Date(`${dateStr}T${cls.end_time}`);
                    else end = new Date(start.getTime() + 50 * 60 * 1000);
                }

                if (isNaN(start.getTime())) start = new Date();
                if (isNaN(end.getTime()) || end <= start) {
                    end = new Date(start.getTime() + 50 * 60 * 1000);
                }

                const currentTeachers = teachersList || teachers;
                const teacher = currentTeachers.find(t => t.id === cls.teacher_id);
                let color = '#3788d8';
                
                if (teacher) {
                    color = teacher.color;
                } else {
                    if (cls.link_url) {
                        const t = currentTeachers.find(t => t.meet_link === cls.link_url);
                        if (t) color = t.color;
                    }
                    if (color === '#3788d8') {
                        const tName = cls.title || '';
                        if (tName.includes('-')) {
                            const parts = tName.split('-');
                            const lastPart = parts[parts.length - 1].trim();
                            let t = currentTeachers.find(t => lastPart.toLowerCase().includes(t.name.toLowerCase()));
                            if (t) color = t.color;
                        }
                    }
                }

                return {
                    title: cls.title + (cls.status === 'draft' ? ' (Draft)' : ''),
                    start,
                    end,
                    resource: {
                        ...cls,
                        color,
                        merged_ids: [cls.id]
                    },
                };
            });

            // Group events by event_id to merge legitimate group classes (but keep double bookings separate)
            const grouped = new Map<string, CalendarClassEvent>();
            rawEvents.forEach(evt => {
                // If it has an event_id, use it. Otherwise, use its unique DB id so it doesn't merge with anything else.
                const key = evt.resource.event_id || `unique-${evt.resource.id}`;
                
                if (grouped.has(key) && evt.resource.event_id) {
                    const existing = grouped.get(key)!;
                    
                    const getStudentName = (title: string) => title.split("'s class")[0].trim();
                    const name1 = getStudentName(existing.title);
                    const name2 = getStudentName(evt.title);
                    
                    if (!name1.includes(name2) && !name2.includes(name1)) {
                        const combinedName = `${name1} and ${name2}`;
                        const suffix = existing.title.includes(' - ') ? ` - ${existing.title.split(' - ')[1]}` : '';
                        existing.title = `${combinedName}'s class${suffix}`;
                    }
                    
                    if (existing.resource.student_name && evt.resource.student_name && !existing.resource.student_name.includes(evt.resource.student_name)) {
                        existing.resource.student_name = `${existing.resource.student_name}, ${evt.resource.student_name}`;
                    }
                    
                    if (evt.resource.id) {
                        if (!existing.resource.merged_ids) existing.resource.merged_ids = [existing.resource.id];
                        existing.resource.merged_ids.push(evt.resource.id);
                    }
                    
                    if ((evt.resource as any).class_assignments) {
                        if (!(existing.resource as any).class_assignments) (existing.resource as any).class_assignments = [];
                        (existing.resource as any).class_assignments = [...(existing.resource as any).class_assignments, ...(evt.resource as any).class_assignments];
                    }
                } else {
                    grouped.set(key, { ...evt });
                }
            });

            setEvents(Array.from(grouped.values()));
        }
        setLoading(false);
    };

    useEffect(() => {
        const init = async () => {
            const fetchedTeachers = await fetchReferenceData();
            // Initial load for current week
            fetchClasses(currentRange.start, currentRange.end, fetchedTeachers);
        };
        init();
    }, []);

    // Re-fetch when range changes (and teachers are loaded to ensure colors)
    useEffect(() => {
        if (teachers.length > 0) {
            fetchClasses(currentRange.start, currentRange.end);
        }
    }, [currentRange, teachers]);

    // Handle specific fetch dependency
    const handleRangeChange = useCallback((range: Date[] | { start: Date; end: Date }, view?: View) => {
        let start, end;
        if (Array.isArray(range)) {
            // Day or Week view usually returns array of days
            start = range[0];
            end = range[range.length - 1];
        } else {
            // Month view returns object
            start = range.start;
            end = range.end;
        }
        setCurrentRange({ start, end });
    }, []);

    const DEFAULT_TEACHERS = [
        { name: 'Nicolas', color: 'blue', meet_link: 'https://meet.google.com/oft-tdyo-bqv' },
        { name: 'Mariana', color: 'purple', meet_link: 'https://meet.google.com/gbm-pxgu-rnt' },
        { name: 'Fred', color: 'gray', meet_link: 'https://meet.google.com/tzm-kdbu-jky' },
        { name: 'Taina', color: 'green', meet_link: 'https://meet.google.com/ztk-bhmm-tgx' },
        { name: 'Bruno', color: 'yellow', meet_link: 'https://meet.google.com/uuw-iobt-aqc' },
    ];

    const initializeTeachers = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.from('teachers').insert(DEFAULT_TEACHERS);
            if (error) throw error;
            toast({ title: 'Success', description: 'Teachers initialized successfully!' });
            fetchReferenceData();
        } catch (err: any) {
            toast({
                title: 'Setup Required',
                description: 'Could not create teachers. Did you run the SQL script? Error: ' + err.message,
                variant: 'destructive',
                duration: 10000
            });
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // HANDLERS
    // ─────────────────────────────────────────────────────────────

    const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
        setSelectedEvent({
            title: '', // Will be auto-generated
            date: format(start, 'yyyy-MM-dd'),
            start_time: format(start, 'HH:mm'),
            end_time: format(end, 'HH:mm'),
            timezone: 'America/Sao_Paulo',
            teacher_id: '',
            student_ids: [],
            status: 'draft',
        });
        setIsModalOpen(true);
    };

    const handleSelectEvent = (event: CalendarClassEvent) => {
        const cls = event.resource;
        console.log('DEBUG: Clicked Event Resource:', cls);

        // Map assignments to IDs
        let studentIds = (cls as any).class_assignments?.map((a: any) => a.student_id) || [];

        // Fallback: Legacy Student Name Matching
        if (studentIds.length === 0 && cls.student_name) {
            const names = cls.student_name.split(',').map((s: string) => s.trim().toLowerCase());
            const matchedStudents = students.filter(s => names.includes(s.student_name.toLowerCase()));
            studentIds = matchedStudents.map(s => s.id);
            console.log('DEBUG: Inferred studentIds from name:', cls.student_name, studentIds);
        }

        console.log('DEBUG: Final Parsing studentIds:', studentIds);

        // Parse time: handle ISO or legacy HH:mm
        let startTime = cls.time || '10:00';
        if (!cls.time && cls.start_time) {
            startTime = cls.start_time.includes('T') ? cls.start_time.split('T')[1].substring(0, 5) : cls.start_time;
        }

        let endTime = '11:00';
        if (cls.end_time) {
            endTime = cls.end_time.includes('T') ? cls.end_time.split('T')[1].substring(0, 5) : cls.end_time;
        } else {
            // Default 50 mins from start time
            try {
                const s = new Date(`1970-01-01T${startTime}`);
                endTime = format(new Date(s.getTime() + 50 * 60 * 1000), 'HH:mm');
            } catch(e) {}
        }

        // Fallback: Legacy Teacher Matching
        let teacherId = cls.teacher_id || '';
        if (!teacherId) {
            if (cls.link_url) {
                const t = teachers.find(teacher => teacher.meet_link === cls.link_url);
                if (t) teacherId = t.id;
            }
            if (!teacherId) {
                const tName = cls.title || '';
                const parts = tName.split('-');
                const lastPart = parts[parts.length - 1] || tName;
                let t = teachers.find(teacher => lastPart.toLowerCase().includes(teacher.name.toLowerCase()));
                if (!t) t = teachers.find(teacher => tName.toLowerCase().includes(teacher.name.toLowerCase()));
                if (t) {
                    teacherId = t.id;
                    console.log('DEBUG: Inferred teacherId from title:', tName, teacherId);
                }
            }
        }

        setSelectedEvent({
            id: cls.id,
            title: cls.title,
            date: cls.date,
            start_time: startTime,
            end_time: endTime,
            timezone: cls.timezone || 'America/Sao_Paulo',
            teacher_id: teacherId,
            student_ids: studentIds,
            status: cls.status || 'published',
            event_id: cls.event_id, // Pass for recurrence logic
            merged_ids: (cls as any).merged_ids || [cls.id],
        });
        setIsModalOpen(true);
    };

    const handleEventDrop = async (args: any) => {
        const { event, start, end } = args;
        const cls = (event as CalendarClassEvent).resource;
        if (!cls.id) return;

        const timeZone = cls.timezone || 'America/Sao_Paulo';
        const newDate = formatInTimeZone(start, timeZone, 'yyyy-MM-dd');
        const newStartTime = formatInTimeZone(start, timeZone, 'HH:mm');

        try {
            // Optimistic update
            const updatedEvents = events.map(e => {
                if (e.resource.id === cls.id) {
                    return { ...e, start, end };
                }
                return e;
            });
            setEvents(updatedEvents);

            const idsToUpdate = [cls.id]; // Only update the primary class to allow 'peeling off' accidental merges

            const { error } = await supabase
                .from('classes')
                .update({
                    date: newDate,
                    time: newStartTime,
                })
                .in('id', idsToUpdate);

            if (error) throw error;

            toast({ title: 'Schedule updated', description: 'Class moved successfully' });
            // Refresh to ensure server sync
            fetchClasses(currentRange.start, currentRange.end);

        } catch (err: any) {
            toast({ title: 'Move failed', description: err.message, variant: 'destructive' });
            fetchClasses(currentRange.start, currentRange.end); // Revert
        }
    };

    // ─────────────────────────────────────────────────────────────
    // SAVE / DELETE
    // ─────────────────────────────────────────────────────────────

    const handleSaveClass = async (formData: ClassFormData) => {
        console.log('handleSaveClass trigger', formData);
        setModalLoading(true);
        try {
            const teacher = teachers.find(t => t.id === formData.teacher_id);
            const title = formData.title || (teacher ? teacher.name : 'Unknown Class');
            const link_url = teacher ? teacher.meet_link : '';


            if (!formData.teacher_id) {
                toast({ title: 'Validation Error', description: 'Please select a teacher', variant: 'destructive' });
                setModalLoading(false);
                return;
            }


            if (formData.end_time <= formData.start_time) {
                toast({ title: 'Validation Error', description: 'End time must be after start time', variant: 'destructive' });
                setModalLoading(false);
                return;
            }

            console.log('handleSaveClass START', { formData });

            // Common payload generator
            const createPayload = (dateStr: string, studentName: string) => ({
                date: dateStr,
                status: formData.status,
                title: title,
                student_name: studentName,
                time: formData.start_time,
                timezone: formData.timezone,
                link_url: link_url,
                class_level: 'Mixed',
                teacher_id: formData.teacher_id,
                event_id: formData.event_id || `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Ensure event_id
            });

            // Exact student names selected
            const selectedStudentNames = formData.student_ids.length > 0
                ? students.filter(s => formData.student_ids.includes(s.id)).map(s => s.student_name)
                : ['Unknown Student'];

            // ─────────────────────────────────────────────────────────────
            // CASE 1: NEW CLASS (Possibly Recurring)
            // ─────────────────────────────────────────────────────────────
            if (!formData.id) {
                const newEventId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const classesToInsert: any[] = [];

                if (formData.is_recurring && formData.repeat_until) {
                    // Generate weekly dates
                    let currentDate = new Date(formData.date);
                    const endDate = new Date(formData.repeat_until);

                    // Safety cap: max 52 occurrences (1 year) to prevent infinite loops
                    let count = 0;
                    while (currentDate <= endDate && count < 150) {
                        const dateStr = format(currentDate, 'yyyy-MM-dd');
                        selectedStudentNames.forEach(studentName => {
                            classesToInsert.push({
                                ...createPayload(dateStr, studentName),
                                event_id: newEventId // All share same ID
                            });
                        });
                        currentDate = addWeeks(currentDate, 1);
                        count++;
                    }
                } else {
                    // Single insert
                    selectedStudentNames.forEach(studentName => {
                        classesToInsert.push({
                            ...createPayload(formData.date, studentName),
                            event_id: newEventId
                        });
                    });
                }

                // Insert Classes ONE BY ONE to prevent sequence duplication issues
                const insertedClasses: any[] = [];
                for (const payload of classesToInsert) {
                    const { data: inserted, error } = await supabase.from('classes').insert(payload).select();
                    if (error) throw error;
                    if (inserted && inserted.length > 0) {
                        insertedClasses.push(inserted[0]);
                    }
                }

                // Insert Assignments for ALL created classes
                if (formData.student_ids.length > 0 && insertedClasses.length > 0) {
                    const allAssignments = insertedClasses.map((cls: any) => {
                        const matchingStudent = students.find(s => s.student_name === cls.student_name);
                        return matchingStudent ? { class_id: cls.id, student_id: matchingStudent.id } : null;
                    }).filter(Boolean) as any[];
                    
                    if (allAssignments.length > 0) {
                        const { error: assignError } = await supabase.from('class_assignments').insert(allAssignments);
                        if (assignError) throw assignError;
                    }
                }

            }
            // ─────────────────────────────────────────────────────────────
            // CASE 2: EDIT EXISTING CLASS
            // ─────────────────────────────────────────────────────────────
            else {
                // Helper to sync a group of students for a specific date and event ID
                const syncGroupForDate = async (targetDate: string, targetEventId: string, specificIds?: number[]) => {
                    let query = supabase.from('classes').select('id, student_name');
                    
                    if (specificIds && specificIds.length > 0) {
                        query = query.in('id', specificIds);
                    } else {
                        query = query.eq('event_id', targetEventId).eq('date', targetDate);
                    }
                    
                    const { data: existingRows } = await query;
                    if (!existingRows || existingRows.length === 0) return;
                    
                    const toUpdate: any[] = [];
                    const toDelete: any[] = [];
                    
                    // Keep track of students as objects to maintain strict alignment of name and ID
                    const toAdd = formData.student_ids.map(id => {
                        const student = students.find(s => s.id === id);
                        return { id, name: student ? student.student_name : 'Unknown Student' };
                    });
                    if (toAdd.length === 0) {
                        toAdd.push({ id: '', name: 'Unknown Student' });
                    }
                    
                    existingRows.forEach(row => {
                         const primaryName = row.student_name.split(',')[0].trim();
                         const matchedIndex = toAdd.findIndex(student => student.name.toLowerCase().trim() === primaryName.toLowerCase());
                         if (matchedIndex !== -1) {
                             const exactStudent = toAdd[matchedIndex];
                             toUpdate.push({ id: row.id, student_name: exactStudent.name });
                             toAdd.splice(matchedIndex, 1);
                         } else {
                             toDelete.push(row);
                         }
                    });
                    
                    // Delete removed students
                    if (toDelete.length > 0) {
                        const idsToDelete = toDelete.map(r => r.id);
                        await supabase.from('class_assignments').delete().in('class_id', idsToDelete);
                        await supabase.from('classes').delete().in('id', idsToDelete);
                    }
                    
                    // Update kept students
                    if (toUpdate.length > 0) {
                        for (const row of toUpdate) {
                            const { error } = await supabase.from('classes').update({
                                date: targetDate,
                                status: formData.status,
                                title: title,
                                student_name: row.student_name, // Normalize the name (removes commas if legacy)
                                time: formData.start_time,
                                timezone: formData.timezone,
                                link_url: link_url,
                                teacher_id: formData.teacher_id,
                                event_id: targetEventId
                            }).eq('id', row.id);
                            if (error) throw error;
                        }
                    }
                    
                    // Add new students ONE BY ONE to prevent sequence duplication issues
                    if (toAdd.length > 0) {
                        const newAssignments: any[] = [];
                        for (const student of toAdd) {
                            const name = student.name;
                            const studentId = student.id; // Use exact ID

                            const payload = createPayload(targetDate, name);
                            payload.event_id = targetEventId;
                            
                            const { data: inserted, error } = await supabase.from('classes').insert(payload).select();
                            if (error) throw error;
                            
                            if (inserted && inserted.length > 0) {
                                const cls = inserted[0];
                                if (studentId) {
                                    newAssignments.push({ class_id: cls.id, student_id: studentId });
                                } else {
                                    // Fallback if somehow ID is missing
                                    const matchingStudent = students.find(s => s.student_name === cls.student_name);
                                    if (matchingStudent) {
                                        newAssignments.push({ class_id: cls.id, student_id: matchingStudent.id });
                                    }
                                }
                            }
                        }
                        
                        if (newAssignments.length > 0) {
                            const { error: assignError } = await supabase.from('class_assignments').insert(newAssignments);
                            if (assignError) throw assignError;
                        }
                    }
                };

                if (formData.edit_mode === 'single') {
                    console.log('Edit mode: SINGLE');

                    // Case 2a: Convert Single to Recurring
                    if (formData.is_recurring && formData.repeat_until) {
                        console.log('Converting Single to Series');
                        const newEventId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                        // 1. Update current class to be the start of the series
                        await syncGroupForDate(formData.date, newEventId, formData.merged_ids);

                        // 2. Generate Future Classes
                        const classesToInsert: any[] = [];
                        let currentDate = addWeeks(new Date(formData.date), 1); // Start next week
                        const endDate = new Date(formData.repeat_until);
                        let count = 0;

                        while (currentDate <= endDate && count < 150) {
                            const dateStr = format(currentDate, 'yyyy-MM-dd');
                            selectedStudentNames.forEach(studentName => {
                                classesToInsert.push({
                                    ...createPayload(dateStr, studentName),
                                    event_id: newEventId // Share the new Series ID
                                });
                            });
                            currentDate = addWeeks(currentDate, 1);
                            count++;
                        }

                        if (classesToInsert.length > 0) {
                            // Insert ONE BY ONE
                            const insertedClasses: any[] = [];
                            for (const payload of classesToInsert) {
                                const { data: inserted, error: insertError } = await supabase.from('classes').insert(payload).select();
                                if (insertError) throw insertError;
                                if (inserted && inserted.length > 0) {
                                    insertedClasses.push(inserted[0]);
                                }
                            }

                            if (formData.student_ids.length > 0 && insertedClasses.length > 0) {
                                const allAssignments = insertedClasses.map((cls: any) => {
                                    const matchingStudent = students.find(s => s.student_name === cls.student_name);
                                    return matchingStudent ? { class_id: cls.id, student_id: matchingStudent.id } : null;
                                }).filter(Boolean) as any[];
                                if (allAssignments.length > 0) {
                                    await supabase.from('class_assignments').insert(allAssignments);
                                }
                            }
                        }

                    } else {
                        // Case 2b: Update Single Class Only (Standard)
                        // Detach from series by giving it a NEW event_id
                        const detachedEventId = `calc-${Date.now()}-ex`;
                        await syncGroupForDate(formData.date, detachedEventId, formData.merged_ids);
                    }

                } else if (formData.edit_mode === 'following') {
                    // Update this AND future events in same series
                    const { data: futureClasses } = await supabase
                        .from('classes')
                        .select('date')
                        .eq('event_id', formData.event_id)
                        .gte('date', formData.date); // This includes today

                    if (futureClasses && futureClasses.length > 0) {
                        const uniqueDates = Array.from(new Set(futureClasses.map(c => c.date)));
                        const newSeriesId = `calc-${Date.now()}-future`;
                        
                        for (const dStr of uniqueDates) {
                            if (dStr === formData.date && formData.merged_ids) {
                                await syncGroupForDate(dStr, newSeriesId, formData.merged_ids);
                            } else {
                                const { data: dateRows } = await supabase.from('classes').select('id').eq('event_id', formData.event_id).eq('date', dStr);
                                if (dateRows && dateRows.length > 0) {
                                    await syncGroupForDate(dStr, newSeriesId, dateRows.map(r => r.id));
                                }
                            }
                        }
                    }

                } else if (formData.edit_mode === 'all') {
                    // Update ALL events in series
                    const { data: allClasses } = await supabase
                        .from('classes')
                        .select('id, date')
                        .eq('event_id', formData.event_id);

                    if (allClasses && allClasses.length > 0) {
                        const uniqueDates = Array.from(new Set(allClasses.map(c => c.date)));
                        for (const dStr of uniqueDates) {
                            const idsForDate = allClasses.filter(c => c.date === dStr).map(c => c.id);
                            await syncGroupForDate(dStr, formData.event_id!, idsForDate);
                        }
                    }
                }
            }

            toast({ title: 'Success', description: 'Schedule updated successfully' });
            setIsModalOpen(false);
            fetchClasses(currentRange.start, currentRange.end);

        } catch (err: any) {
            console.error(err);
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setModalLoading(false);
        }
    };

    const handleDeleteClass = async () => {
        if (!selectedEvent?.id) return;
        if (!confirm('Are you sure you want to delete this class?')) return;

        setModalLoading(true);
        try {
            const { error } = await supabase.from('classes').delete().eq('id', selectedEvent.id);
            if (error) throw error;

            toast({ title: 'Deleted', description: 'Class removed' });
            setIsModalOpen(false);
            fetchClasses(currentRange.start, currentRange.end);
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setModalLoading(false);
        }
    };

    const handleDuplicate = (data: ClassFormData) => {
        // Create a copy of the data but remove IDs to treat as new
        const newEvent: ClassFormData = {
            ...data,
            id: undefined,
            event_id: undefined, // Detach from series
            is_recurring: false, // Reset recurrence? Or keep it? Usually duplicate is single unless specified. 
            // Google Calendar copies recurrence rules too.
            // Let's keep recurrence rules but reset event_id so it starts a NEW series.
            title: data.title + ' (Copy)',
        };
        setSelectedEvent(newEvent);
        // Modal is already open, updating selectedEvent will trigger useEffect in Modal to update form
    };

    const handleDuplicateNextWeek = async () => {
        if (!confirm('This will copy all classes from the CURRENT view to the FOLLOWING WEEK (Date + 7 days). Are you sure?')) return;
        setLoading(true);

        try {
            // events contains the formatted calendar events. resource holds the Supabase data.
            const classesToCopy = events.map(e => e.resource);
            if (classesToCopy.length === 0) {
                toast({ title: 'No classes', description: 'No classes to copy in current view.' });
                setLoading(false);
                return;
            }

            let successCount = 0;

            // Sequential insert to avoid overwhelming DB and ensure correct ID mapping
            for (const cls of classesToCopy) {
                try {
                    const oldDateStr = cls.date; // YYYY-MM-DD
                    const oldDate = new Date(oldDateStr + 'T00:00:00');
                    const newDate = addWeeks(oldDate, 1);
                    const newDateStr = format(newDate, 'yyyy-MM-dd');

                    const newEventId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                    // Extract Start Time and End Time to construct new ISO strings on the NEW date
                    // cls.start_time might be a full ISO string (legacy) or just HH:mm
                    let startTimeISO = cls.start_time;
                    let endTimeISO = cls.end_time;

                    const extractTime = (isoOrTime: string) => {
                        if (!isoOrTime) return '10:00';
                        if (isoOrTime.includes('T')) {
                            // formatted as YYYY-MM-DDTHH:mm:ss...
                            return isoOrTime.split('T')[1].substring(0, 5); // HH:mm
                        }
                        return isoOrTime.substring(0, 5);
                    };

                    const startTimePart = extractTime(cls.start_time || cls.time);
                    const endTimePart = extractTime(cls.end_time);

                    // Reconstruct secure ISO strings for the target date
                    // Note: This assumes local time which is consistent with how the app handles "dates" as strings
                    startTimeISO = new Date(`${newDateStr}T${startTimePart}:00`).toISOString();
                    if (endTimePart) {
                        endTimeISO = new Date(`${newDateStr}T${endTimePart}:00`).toISOString();
                    } else {
                        // Default 50 mins
                        const s = new Date(startTimeISO);
                        endTimeISO = new Date(s.getTime() + 50 * 60 * 1000).toISOString();
                    }

                    const payload = {
                        date: newDateStr,
                        status: 'published', // Force published? Or keep cls.status?
                        title: cls.title,
                        student_name: cls.student_name,
                        time: startTimePart, // Update legacy time field too
                        link_url: cls.link_url,
                        class_level: cls.class_level,
                        event_id: newEventId
                    };

                    const { data: insertedClass, error } = await supabase.from('classes').insert(payload).select().single();
                    if (error) {
                        console.error('Failed to copy class', cls.id, error);
                        continue;
                    }

                    // Copy assignments
                    const studentIds = (cls as any).class_assignments?.map((ca: any) => ca.student_id) || [];
                    if (studentIds.length > 0 && insertedClass) {
                        const assignments = studentIds.map((sid: any) => ({
                            class_id: insertedClass.id,
                            student_id: sid
                        }));
                        await supabase.from('class_assignments').insert(assignments);
                    }
                    successCount++;
                } catch (innerErr) {
                    console.error('Error duplicating class', innerErr);
                }
            }

            toast({ title: 'Success', description: `Duplicated ${successCount} classes to next week.` });

            // Optional: Move view to next week?
            // setDate(addWeeks(date, 1));
            // For now, just refresh current view (user might stay to see more, or manually move)
            fetchClasses(currentRange.start, currentRange.end);

        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // STYLING
    // ─────────────────────────────────────────────────────────────

    const { min, max } = React.useMemo(() => ({
        min: new Date(1970, 1, 1, 6, 0, 0),
        max: new Date(1970, 1, 1, 22, 0, 0),
    }), []);

    const eventStyleGetter = (event: CalendarClassEvent) => {
        const cls = event.resource as any;
        const color = cls.color || '#3788d8';

        // Check if teacher is Bruno
        const teacher = teachers.find(t => t.id === cls.teacher_id);
        // Fallback to checking title if teacher not found (legacy data)
        const isBruno = teacher?.name?.toLowerCase().includes('bruno') ||
            (!teacher && cls.title?.toLowerCase().includes('bruno'));

        // Check if matches search
        const isMatch = !searchQuery || 
            cls.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
            cls.student_name?.toLowerCase().includes(searchQuery.toLowerCase());

        return {
            style: {
                backgroundColor: color,
                borderRadius: '4px',
                opacity: isMatch ? 1 : 0.3,
                border: isMatch && searchQuery ? '2px solid black' : 'none',
                color: isBruno ? 'black' : 'white',
                display: 'block',
                boxShadow: isMatch && searchQuery ? '0 0 5px rgba(0,0,0,0.5)' : 'none'
            }
        };
    };

    return (
        <div className="h-screen p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Admin Calendar</h1>
                    <p className="text-muted-foreground">Manage schedule by dragging and dropping</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        placeholder="Search student or class..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-48 bg-white"
                    />
                    {teachers.length === 0 && !loading && (
                        <Button variant="outline" onClick={initializeTeachers} className="border-yellow-500 text-yellow-600 hover:bg-yellow-50">
                            ⚠ Initialize Teachers
                        </Button>
                    )}
                    <Button onClick={handleDuplicateNextWeek} className="mr-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                        Duplicate to Next Week
                    </Button>
                    <Button onClick={() => {
                        handleSelectSlot({ start: new Date(), end: new Date(new Date().getTime() + 50 * 60 * 1000) });
                    }}>
                        + New Class
                    </Button>
                </div>
            </div>

            <div className="flex-1 bg-background rounded-lg shadow border p-4">
                <DnDCalendar
                    localizer={localizer}
                    events={events}
                    style={{ height: '100%' }}
                    view={view}
                    onView={setView}
                    date={date}
                    onNavigate={setDate}
                    selectable
                    resizable
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    onEventDrop={handleEventDrop}
                    eventPropGetter={eventStyleGetter}
                    step={30}
                    timeslots={2}
                    views={['month', 'week', 'day', 'agenda']}
                    onRangeChange={handleRangeChange}
                    min={min}
                    max={max}
                    components={{
                        event: CustomEvent
                    }}
                    formats={{
                        eventTimeRangeFormat: () => '' // Hide default time label
                    }}
                />
            </div>

            <ClassModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                teachers={teachers}
                students={students}
                initialData={selectedEvent}
                onSubmit={handleSaveClass}
                loading={modalLoading}
                onDelete={selectedEvent?.id ? handleDeleteClass : undefined}
                onDuplicate={selectedEvent?.id ? handleDuplicate : undefined}
                isSeries={selectedEvent?.event_id ? events.filter(e => e.resource.event_id === selectedEvent.event_id).length > 1 : false}
            />
        </div >
    );
};

export default AdminCalendar;
