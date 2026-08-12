import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Event as CalendarEvent, View, EventProps } from 'react-big-calendar';
import { format, parse, startOfWeek, endOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { fromZonedTime } from 'date-fns-tz';
import { supabase, Class, Teacher } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import 'react-big-calendar/lib/css/react-big-calendar.css';

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

// Custom Event Interface mapping to our data
interface CalendarClassEvent extends CalendarEvent {
    resource: Class & { color?: string }; 
}

const CustomEvent = ({ event }: EventProps<CalendarClassEvent>) => {
    return (
        <div 
            className="h-full w-full flex flex-col justify-start overflow-hidden p-0.5"
            title={`${event.title}\n${format(event.start!, 'h:mm a')} - ${format(event.end!, 'h:mm a')}\nJoin: ${event.resource?.link_url || 'No link'}`}
        >
            <div className="font-semibold text-[9px] sm:text-[10px] leading-[1.1] line-clamp-2 break-words">
                {event.title}
            </div>
            <div className="text-[8px] sm:text-[9px] opacity-90 leading-none mt-0.5 truncate">
                {format(event.start!, 'h:mm a')}
            </div>
            {event.resource?.link_url && (
                <div className="text-[8px] opacity-75 mt-0.5 truncate">
                    Join link
                </div>
            )}
        </div>
    );
};

interface ReadOnlyCalendarProps {
    role: 'student' | 'teacher';
    identifier: string; // studentName or teacherName
    compact?: boolean;
}

export const ReadOnlyCalendar: React.FC<ReadOnlyCalendarProps> = ({ role, identifier, compact }) => {
    const { toast } = useToast();
    const [events, setEvents] = useState<CalendarClassEvent[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);

    const [currentRange, setCurrentRange] = useState<{ start: Date; end: Date }>({
        start: startOfWeek(new Date()),
        end: endOfWeek(new Date())
    });

    const fetchTeachers = async () => {
        const { data: teachersData } = await supabase.from('teachers').select('*');
        if (teachersData) setTeachers(teachersData);
        return teachersData || [];
    };

    const fetchClasses = async (start: Date, end: Date, teachersList?: Teacher[]) => {
        setLoading(true);

        const startDateStr = format(start, 'yyyy-MM-dd');
        const endDateStr = format(end, 'yyyy-MM-dd');

        let query = supabase
            .from('classes')
            .select(`*`)
            .gte('date', startDateStr)
            .lte('date', endDateStr)
            .order('date', { ascending: true })
            .order('time', { ascending: true });

        // Filter based on role
        if (role === 'student') {
            // The class title usually contains the student name, or the student_name column has it
            query = query.ilike('student_name', `%${identifier}%`);
        } else if (role === 'teacher') {
            query = query.or(`title.ilike.%${identifier}%,title.eq.${identifier}`);
        }

        const { data, error } = await query;

        if (error) {
            toast({ title: 'Error loading classes', description: error.message, variant: 'destructive' });
            setLoading(false);
            return;
        }

        if (data) {
            const rawEvents: CalendarClassEvent[] = data.map((cls: any) => {
                const dateStr = cls.date;
                const startTimeStr = cls.start_time || cls.time || '10:00';
                const timeZone = cls.timezone || 'America/Sao_Paulo';

                let eventStart;
                try {
                    const timePart = startTimeStr.includes('T') ? startTimeStr.split('T')[1].substring(0, 5) : startTimeStr;
                    eventStart = fromZonedTime(`${dateStr} ${timePart}:00`, timeZone);
                } catch(e) {
                    if (startTimeStr.includes('T')) eventStart = new Date(startTimeStr);
                    else eventStart = new Date(`${dateStr}T${startTimeStr}`);
                }

                let eventEnd;
                try {
                    if (cls.end_time) {
                        const endPart = cls.end_time.includes('T') ? cls.end_time.split('T')[1].substring(0, 5) : cls.end_time;
                        eventEnd = fromZonedTime(`${dateStr} ${endPart}:00`, timeZone);
                    } else {
                        eventEnd = new Date(eventStart.getTime() + 50 * 60 * 1000);
                    }
                } catch(e) {
                    if (cls.end_time && cls.end_time.includes('T')) eventEnd = new Date(cls.end_time);
                    else if (cls.end_time) eventEnd = new Date(`${dateStr}T${cls.end_time}`);
                    else eventEnd = new Date(eventStart.getTime() + 50 * 60 * 1000);
                }

                if (isNaN(eventStart.getTime())) eventStart = new Date();
                if (isNaN(eventEnd.getTime()) || eventEnd <= eventStart) {
                    eventEnd = new Date(eventStart.getTime() + 50 * 60 * 1000);
                }

                const currentTeachers = teachersList || teachers;
                const teacher = currentTeachers.find(t => t.id === cls.teacher_id);
                let color = '#3788d8';
                
                if (teacher) {
                    color = teacher.color;
                } else {
                    const tName = cls.title || '';
                    if (tName.includes('-')) {
                        const parts = tName.split('-');
                        const lastPart = parts[parts.length - 1].trim();
                        const t = currentTeachers.find(t => lastPart.toLowerCase().includes(t.name.toLowerCase()));
                        if (t) color = t.color;
                    }
                }

                return {
                    title: cls.title + (cls.status === 'draft' ? ' (Draft)' : ''),
                    start: eventStart,
                    end: eventEnd,
                    resource: {
                        ...cls,
                        color,
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
            const fetchedTeachers = await fetchTeachers();
            fetchClasses(currentRange.start, currentRange.end, fetchedTeachers);
        };
        if (identifier) {
            init();
        }
    }, [identifier]);

    useEffect(() => {
        if (teachers.length > 0 && identifier) {
            fetchClasses(currentRange.start, currentRange.end);
        }
    }, [currentRange, teachers, identifier]);

    const handleRangeChange = useCallback((range: Date[] | { start: Date; end: Date }) => {
        let start, end;
        if (Array.isArray(range)) {
            start = range[0];
            end = range[range.length - 1];
        } else {
            start = range.start;
            end = range.end;
        }
        setCurrentRange({ start, end });
    }, []);

    const { min, max } = React.useMemo(() => {
        if (events.length === 0) {
            return {
                min: new Date(1970, 1, 1, 8, 0, 0),
                max: new Date(1970, 1, 1, 20, 0, 0),
            };
        }

        let minHour = 24;
        let maxHour = 0;

        events.forEach(evt => {
            const startH = evt.start!.getHours();
            const endH = evt.end!.getHours();
            const endM = evt.end!.getMinutes();
            if (startH < minHour) minHour = startH;
            
            let calcEndH = endH;
            if (endM > 0) calcEndH++;
            if (calcEndH > maxHour) maxHour = calcEndH;
        });

        minHour = Math.max(0, minHour - 1);
        maxHour = Math.min(23, maxHour + 1);

        if (maxHour - minHour < 6) {
             const pad = Math.floor((6 - (maxHour - minHour)) / 2);
             minHour = Math.max(0, minHour - pad);
             maxHour = Math.min(23, maxHour + pad);
        }

        return {
            min: new Date(1970, 1, 1, minHour, 0, 0),
            max: new Date(1970, 1, 1, maxHour, 59, 59),
        };
    }, [events]);

    const eventStyleGetter = (event: CalendarClassEvent) => {
        const cls = event.resource;
        const color = cls.color || '#3788d8';

        const teacher = teachers.find(t => t.id === cls.teacher_id);
        const isBruno = teacher?.name?.toLowerCase().includes('bruno') ||
            (!teacher && cls.title?.toLowerCase().includes('bruno'));

        return {
            style: {
                backgroundColor: color,
                borderRadius: '4px',
                opacity: 1,
                border: 'none',
                color: isBruno ? 'black' : 'white',
                display: 'block'
            }
        };
    };

    return (
        <Card className={`${compact ? 'h-[24rem]' : 'h-[calc(100vh-12rem)]'} p-4 relative bg-card`}>
            {loading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            )}
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                defaultView="week"
                views={compact ? ['week'] : ['month', 'week', 'day']}
                components={{
                    event: CustomEvent
                }}
                min={min}
                max={max}
                eventPropGetter={eventStyleGetter}
                onRangeChange={handleRangeChange}
                popup
                selectable={false} // Read only
                toolbar={!compact} // Hide toolbar in compact mode if desired, but actually week switching is useful! Let's keep toolbar so they can switch weeks.
            />
        </Card>
    );
};
