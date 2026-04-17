import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Event as CalendarEvent, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, endOfWeek, getDay, addWeeks } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { supabase, Class, Teacher, Student } from '@/lib/supabase';
import { ClassModal, ClassFormData } from '@/components/calendar/ClassModal';
import { Button } from '@/components/ui/button';
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
        <div className="h-full w-full flex flex-col justify-start overflow-hidden">
            <div className="font-semibold text-xs leading-tight mb-0.5">
                {event.title}
            </div>
            <div className="text-[10px] opacity-90 leading-tight">
                {format(event.start!, 'h:mm a')} - {format(event.end!, 'h:mm a')}
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
            .order('start_time', { ascending: true });

        if (error) {
            toast({ title: 'Error loading classes', description: error.message, variant: 'destructive' });
            setLoading(false);
            return;
        }

        if (data) {
            // console.log('AdminCalendar: raw data', data);
            const formattedEvents: CalendarClassEvent[] = data.map((cls: any) => {
                // Construct Start/End dates from date + time columns
                // Assuming cls.date is 'YYYY-MM-DD' and cls.time/start_time is 'HH:MM'
                // If start_time exists, use it. Fallback to 'time' (legacy)

                const dateStr = cls.date;
                const startTimeStr = cls.start_time || cls.time || '10:00';
                const endTimeStr = cls.end_time || '11:00'; // Default duration if missing

                let start, end;

                // Check if start_time is a full ISO timestamp (contains T)
                if (startTimeStr.includes('T')) {
                    start = new Date(startTimeStr);
                } else {
                    // Legacy: use date + time string
                    start = new Date(`${dateStr}T${startTimeStr}`);
                }

                // Check if end_time is a full ISO timestamp (contains T)
                if (endTimeStr && endTimeStr.includes('T')) {
                    end = new Date(endTimeStr);
                } else {
                    // Legacy or fallback
                    const t = endTimeStr || '11:00';
                    end = new Date(`${dateStr}T${t}`);
                }

                // Safety: Valid dates check
                if (isNaN(start.getTime())) start = new Date();
                if (isNaN(end.getTime()) || end <= start) {
                    end = new Date(start.getTime() + 50 * 60 * 1000);
                }

                // console.log('Parsed event:', { title: cls.title, start, end });

                // Find teacher for color
                // Find teacher for color
                // Use provided list or state
                const currentTeachers = teachersList || teachers;
                const teacher = currentTeachers.find(t => t.id === cls.teacher_id);
                // Fallback color if using legacy data without teacher_id
                let color = '#3788d8';
                if (teacher) {
                    color = teacher.color;
                } else {
                    // Try to match legacy title to teacher name if no ID
                    const tName = cls.title || '';
                    // Case insensitive partial match for legacy titles like "Student's class - Teacher"
                    const t = currentTeachers.find(t => tName.toLowerCase().includes(t.name.toLowerCase()));
                    if (t) color = t.color;
                }

                return {
                    title: cls.title + (cls.status === 'draft' ? ' (Draft)' : ''),
                    start,
                    end,
                    resource: {
                        ...cls,
                        // attach color for styling
                        color,
                    },
                };
            });
            // console.log('AdminCalendar: events', formattedEvents);
            setEvents(formattedEvents);
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
        let startTime = cls.start_time || cls.time || '10:00';
        if (startTime.includes('T')) {
            startTime = format(new Date(startTime), 'HH:mm');
        }

        let endTime = cls.end_time || '11:00';
        if (endTime.includes('T')) {
            endTime = format(new Date(endTime), 'HH:mm');
        }

        // Fallback: Legacy Teacher Matching
        let teacherId = cls.teacher_id || '';
        if (!teacherId) {
            const tName = cls.title || '';
            // specific logic: if title contains teacher name
            const t = teachers.find(teacher => tName.toLowerCase().includes(teacher.name.toLowerCase()));
            if (t) {
                teacherId = t.id;
                console.log('DEBUG: Inferred teacherId from title:', tName, teacherId);
            }
        }

        setSelectedEvent({
            id: cls.id,
            title: cls.title,
            date: cls.date,
            start_time: startTime,
            end_time: endTime,
            teacher_id: teacherId,
            student_ids: studentIds,
            status: cls.status || 'published',
            event_id: cls.event_id, // Pass for recurrence logic
        });
        setIsModalOpen(true);
    };

    const handleEventDrop = async (args: any) => {
        const { event, start, end } = args;
        const cls = (event as CalendarClassEvent).resource;
        if (!cls.id) return;

        const newDate = format(start, 'yyyy-MM-dd');
        const newStartTime = format(start, 'HH:mm');
        const newEndTime = format(end, 'HH:mm');

        try {
            // Optimistic update
            const updatedEvents = events.map(e => {
                if (e.resource.id === cls.id) {
                    return { ...e, start, end };
                }
                return e;
            });
            setEvents(updatedEvents);

            const { error } = await supabase
                .from('classes')
                .update({
                    date: newDate,
                    start_time: start.toISOString(),
                    end_time: end.toISOString(),
                })
                .eq('id', cls.id);

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
            const createPayload = (dateStr: string) => ({
                date: dateStr,
                start_time: new Date(`${dateStr}T${formData.start_time}:00`).toISOString(),
                end_time: new Date(`${dateStr}T${formData.end_time}:00`).toISOString(),
                teacher_id: formData.teacher_id,
                status: formData.status,
                title: title,
                student_name: formData.student_ids.length > 0
                    ? students.filter(s => formData.student_ids.includes(s.id)).map(s => s.student_name).join(', ')
                    : 'Multiple',
                time: formData.start_time,
                link_url: link_url,
                class_level: 'Mixed',
                event_id: formData.event_id || `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Ensure event_id
            });

            // ─────────────────────────────────────────────────────────────
            // CASE 1: NEW CLASS (Possibly Recurring)
            // ─────────────────────────────────────────────────────────────
            if (!formData.id) {
                const newEventId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const classesToInsert = [];

                if (formData.is_recurring && formData.repeat_until) {
                    // Generate weekly dates
                    let currentDate = new Date(formData.date);
                    const endDate = new Date(formData.repeat_until);

                    // Safety cap: max 52 occurrences (1 year) to prevent infinite loops
                    let count = 0;
                    while (currentDate <= endDate && count < 150) {
                        const dateStr = format(currentDate, 'yyyy-MM-dd');
                        classesToInsert.push({
                            ...createPayload(dateStr),
                            event_id: newEventId // All share same ID
                        });
                        currentDate = addWeeks(currentDate, 1);
                        count++;
                    }
                } else {
                    // Single insert
                    classesToInsert.push({
                        ...createPayload(formData.date),
                        event_id: newEventId
                    });
                }

                // Insert Classes
                const { data: insertedClasses, error } = await supabase.from('classes').insert(classesToInsert).select();
                if (error) throw error;

                // Insert Assignments for ALL created classes
                if (formData.student_ids.length > 0 && insertedClasses) {
                    const allAssignments = insertedClasses.flatMap(cls =>
                        formData.student_ids.map(sid => ({
                            class_id: cls.id,
                            student_id: sid
                        }))
                    );
                    const { error: assignError } = await supabase.from('class_assignments').insert(allAssignments);
                    if (assignError) throw assignError;
                }

            }
            // ─────────────────────────────────────────────────────────────
            // CASE 2: EDIT EXISTING CLASS
            // ─────────────────────────────────────────────────────────────
            else {
                const basePayload = createPayload(formData.date);
                // Remove id from payload as we are updating or re-inserting
                // But we need to handle specific logic based on edit_mode

                if (formData.edit_mode === 'single') {
                    console.log('Edit mode: SINGLE');

                    // Case 2a: Convert Single to Recurring
                    if (formData.is_recurring && formData.repeat_until) {
                        console.log('Converting Single to Series');
                        const newEventId = `calc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                        // 1. Update current class to be the start of the series
                        const payload = { ...basePayload, event_id: newEventId };
                        const { error } = await supabase.from('classes').update(payload).eq('id', formData.id);
                        if (error) throw error;

                        // Update assignments for current class
                        await supabase.from('class_assignments').delete().eq('class_id', formData.id);
                        if (formData.student_ids.length > 0) {
                            const assignments = formData.student_ids.map(sid => ({ class_id: formData.id!, student_id: sid }));
                            await supabase.from('class_assignments').insert(assignments);
                        }

                        // 2. Generate Future Classes
                        const classesToInsert = [];
                        let currentDate = addWeeks(new Date(formData.date), 1); // Start next week
                        const endDate = new Date(formData.repeat_until);
                        let count = 0;

                        while (currentDate <= endDate && count < 150) {
                            const dateStr = format(currentDate, 'yyyy-MM-dd');
                            classesToInsert.push({
                                ...createPayload(dateStr),
                                event_id: newEventId // Share the new Series ID
                            });
                            currentDate = addWeeks(currentDate, 1);
                            count++;
                        }

                        if (classesToInsert.length > 0) {
                            const { data: insertedClasses, error: insertError } = await supabase.from('classes').insert(classesToInsert).select();
                            if (insertError) throw insertError;

                            // Insert Assignments for new future classes
                            if (formData.student_ids.length > 0 && insertedClasses) {
                                const allAssignments = insertedClasses.flatMap(cls =>
                                    formData.student_ids.map(sid => ({
                                        class_id: cls.id,
                                        student_id: sid
                                    }))
                                );
                                await supabase.from('class_assignments').insert(allAssignments);
                            }
                        }

                    } else {
                        // Case 2b: Update Single Class Only (Standard)
                        // IMPORTANT: Detach from series by giving it a NEW event_id (if it was part of one), 
                        // or just keep it as single if it was already single.
                        // To be safe and support "This event only" detachment:
                        const payload = { ...basePayload, event_id: `calc-${Date.now()}-ex` };

                        const { error } = await supabase.from('classes').update(payload).eq('id', formData.id);
                        if (error) {
                            console.error('Error updating single class:', error);
                            throw error;
                        }

                        // Update assignments (clear and re-add)
                        await supabase.from('class_assignments').delete().eq('class_id', formData.id);
                        if (formData.student_ids.length > 0) {
                            const assignments = formData.student_ids.map(sid => ({ class_id: formData.id!, student_id: sid }));
                            const { error: assignError } = await supabase.from('class_assignments').insert(assignments);
                            if (assignError) console.error('Error updating assignments:', assignError);
                        }
                    }

                } else if (formData.edit_mode === 'following') {
                    // Update this AND future events in same series
                    // 1. Fetch all future IDs
                    const { data: futureClasses } = await supabase
                        .from('classes')
                        .select('id, date')
                        .eq('event_id', formData.event_id)
                        .gte('date', formData.date); // This includes today

                    if (futureClasses && futureClasses.length > 0) {
                        const newSeriesId = `calc-${Date.now()}-future`;
                        const idsToUpdate = futureClasses.map(c => c.id);

                        // We need to update time/details, BUT date must remain compatible?
                        // If user changed DATE (e.g. moved Monday to Tuesday), we need to shift all future dates?
                        // Complexity: Shifting dates is hard.
                        // SIMPLIFICATION: We only apply TIME/TITLE/TEACHER changes to future events.
                        // We do NOT shift dates for now (unless I calculate offsets).
                        // Let's assume standard field update for now.

                        // Apply updates
                        const { error } = await supabase
                            .from('classes')
                            .update({
                                start_time: basePayload.start_time, // This sets them all to the SAME timestamp? NO!
                                // ISSUE: `start_time` contains the DATE. 
                                // If I update all future rows with `basePayload.start_time`, they all move to TODAY.
                                // I must NOT update the DATE part of start_time/end_time if I'm bulk updating.
                                // Only update: title, teacher_id, status, class_level, notes.
                                // Time update is complex.

                                title: basePayload.title,
                                teacher_id: basePayload.teacher_id,
                                status: basePayload.status,
                                student_name: basePayload.student_name,
                                event_id: newSeriesId, // Detach to new series
                                // If user changed time (e.g. 10am -> 11am), we ideally want to propagate that.
                                // But without date-shifting logic, we can't easily.
                                // For now: Only update metadata.
                            })
                            .in('id', idsToUpdate);

                        if (error) throw error;

                        // Bulk update assignments? 
                        // It's hard to do bulk assignment update.
                        // We'd need to delete assignments for all these IDs and re-insert.
                        await supabase.from('class_assignments').delete().in('class_id', idsToUpdate);
                        if (formData.student_ids.length > 0) {
                            const assignments = idsToUpdate.flatMap(cid =>
                                formData.student_ids.map(sid => ({ class_id: cid, student_id: sid }))
                            );
                            await supabase.from('class_assignments').insert(assignments);
                        }
                    }

                } else if (formData.edit_mode === 'all') {
                    // Update ALL events in series
                    const { data: allClasses } = await supabase
                        .from('classes')
                        .select('id')
                        .eq('event_id', formData.event_id);

                    if (allClasses && allClasses.length > 0) {
                        const idsToUpdate = allClasses.map(c => c.id);

                        const { error } = await supabase
                            .from('classes')
                            .update({
                                title: basePayload.title,
                                teacher_id: basePayload.teacher_id,
                                status: basePayload.status,
                                student_name: basePayload.student_name,
                                // Again, avoiding date clobbering.
                            })
                            .in('id', idsToUpdate);

                        if (error) throw error;

                        await supabase.from('class_assignments').delete().in('class_id', idsToUpdate);
                        if (formData.student_ids.length > 0) {
                            const assignments = idsToUpdate.flatMap(cid =>
                                formData.student_ids.map(sid => ({ class_id: cid, student_id: sid }))
                            );
                            await supabase.from('class_assignments').insert(assignments);
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
                        start_time: startTimeISO,
                        end_time: endTimeISO,
                        teacher_id: cls.teacher_id,
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

        return {
            style: {
                backgroundColor: color,
                borderRadius: '4px',
                opacity: 1, // Force solid opacity (no transparency)
                border: 'none',
                color: isBruno ? 'black' : 'white',
                display: 'block'
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
                <div className="flex gap-2">
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
