import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchStudentNextChapters, NextChapterInfo, ClassType } from '@/lib/courseUtils';
import { supabase, Class } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { toLocalDate, formatClassTime, getTimeZoneLabel } from '@/lib/dateUtils';
import { ExternalLink, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReadOnlyCalendar } from '@/components/calendar/ReadOnlyCalendar';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const extractClassName = (title: string, studentName?: string) => {
  if (!title) return 'Class';
  if (!title.includes(' - ')) return studentName ? `${studentName.split(' ')[0]}'s class` : 'Class';
  const parts = title.split(' - ');
  return parts[0].trim();
};

const extractTeacherName = (title: string) => {
  if (!title) return '';
  if (!title.includes(' - ')) return title;
  const parts = title.split(' - ');
  return parts.length > 1 ? parts[1].trim() : '';
};

const StudentClasses: React.FC = () => {
  const { studentName, user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [calendarKey, setCalendarKey] = useState(0);
  const [nextChapters, setNextChapters] = useState<Partial<Record<ClassType, NextChapterInfo>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!studentName) {
        setLoading(false);
        return;
      }

      try {
        const today = format(new Date(), 'yyyy-MM-dd');

        let matchedClassIds: number[] = [];
        if (user?.id) {
          // Fetch student UUID based on auth user
          const { data: studentData } = await supabase.from('students').select('id').eq('email', user.email).maybeSingle();
          if (studentData?.id) {
             const { data: assignments } = await supabase.from('class_assignments').select('class_id').eq('student_id', studentData.id);
             if (assignments) matchedClassIds = assignments.map(a => a.class_id);
          }
        }

        let query = supabase.from('classes').select('*').gte('date', today);
        if (matchedClassIds.length > 0) {
           // We found relational links, so use them OR legacy name matching
           query = query.or(`id.in.(${matchedClassIds.join(',')}),student_name.ilike.%${studentName}%`);
        } else {
           // Fallback to purely name matching
           query = query.ilike('student_name', `%${studentName}%`);
        }

        const { data, error } = await query
          .order('date', { ascending: true })
          .order('time', { ascending: true });

        if (error) throw error;
        const validClasses = (data || []).filter(
          (c: any) => c.status !== 'cancelled' && c.status !== 'rescheduled'
        );
        setClasses(validClasses);

        const chapters = await fetchStudentNextChapters(studentName);
        setNextChapters(chapters);
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [studentName]);

  const confirmReschedule = async (cls: Class) => {
    try {
      if (!user) throw new Error("Not logged in");
      
      // 1. Delete associated assignments first
      try {
        await supabase.from('class_assignments').delete().eq('class_id', cls.id);
      } catch (assignErr) {
        console.warn('Could not delete class_assignments:', assignErr);
      }

      // 2. Delete class from classes table
      const { error: deleteError } = await supabase.from('classes').delete().eq('id', cls.id);
      
      // If direct delete is prevented by DB foreign keys or RLS, update status to cancelled and clear student_name
      if (deleteError) {
        console.warn('Direct delete failed, marking cancelled instead:', deleteError);
        await supabase
          .from('classes')
          .update({
            status: 'cancelled',
            student_name: '',
            notes: `Rescheduled by student ${studentName || user.email}. [Cancelled]`,
          })
          .eq('id', cls.id);
      }

      // 3. Add recuperation credit
      const { error: recupError } = await supabase.from('recuperation_classes').insert({
        student_id: user.id,
        status: 'pending',
        date: cls.date, // optional reference
        notes: `Cancelled by student. Rescheduled from ${cls.date} ${cls.time}`
      });
      if (recupError) throw recupError;

      // 4. Notify teacher (optional, doing it if possible)
      const teacherName = extractTeacherName(cls.title);
      if (teacherName) {
        const { data: teacherData } = await supabase.from('teachers').select('id').ilike('name', teacherName).maybeSingle();
        if (teacherData) {
          await supabase.from('messages').insert({
            sender_id: user.id,
            receiver_id: teacherData.id,
            content: `Hello! I have rescheduled our class on ${cls.date} at ${cls.time}. A recuperation has been added to my account.`,
            is_read: false
          });
        }
      }

      // 5. Notify admins so they can slot the extra class and add to personal calendar
      try {
        const { data: admins } = await supabase.from('admins').select('id');
        if (admins && admins.length > 0) {
          const adminMsgs = admins.map(a => ({
            sender_id: user.id,
            receiver_id: a.id,
            content: `🔔 Recuperation Alert: ${studentName || 'A student'} rescheduled class on ${cls.date} at ${cls.time}. Please schedule their extra class in the Admin Calendar tray and remember to add it to your personal Google Calendar!`,
            is_read: false,
          }));
          await supabase.from('messages').insert(adminMsgs);
        }
      } catch (adminErr) {
        console.error("Failed to notify admins of reschedule", adminErr);
      }

      toast.success('Class rescheduled! A recuperation credit has been added.');

      // 6. Remove class from list, refresh calendar, and notify other views
      setClasses(prev => prev.filter(c => c.id !== cls.id));
      setCalendarKey(prev => prev + 1);
      window.dispatchEvent(new CustomEvent('class-rescheduled', { detail: { classId: cls.id } }));

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to reschedule.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <ReadOnlyCalendar key={calendarKey} role="student" identifier={studentName || ''} />
      </div>

      <h2 className="text-xl font-semibold flex items-center gap-2 mt-8">
        📅 Upcoming Classes List
      </h2>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No upcoming classes scheduled
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => (
            <Card key={cls.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">
                      {(() => {
                        const localDate = toLocalDate(cls.date, cls.time, cls.timezone);
                        return format(localDate, 'EEEE, MMMM d, yyyy');
                      })()}
                    </p>
                    {cls.title && (
                      <p className="text-base font-medium mt-1">
                        {extractClassName(cls.title, studentName || undefined)}
                      </p>
                    )}
                    <p className="text-primary font-medium flex items-center gap-2 mt-1">
                      {formatClassTime(cls.date, cls.time, cls.timezone)}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({getTimeZoneLabel()})
                      </span>
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Teacher: {extractTeacherName(cls.title) || 'Unknown'}
                    </p>
                    {cls.class_type && (
                      <p className="text-sm text-muted-foreground">
                        Type: {cls.class_type}
                      </p>
                    )}

                    {Object.keys(nextChapters).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(nextChapters).map(
                          ([type, info]) =>
                            info && (
                              <Badge key={type} variant="secondary">
                                {type}: Chapter {info.chapter} ({info.level})
                              </Badge>
                            )
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {cls.link_url && (
                      <Button asChild>
                        <a
                          href={cls.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Join Class
                          <ExternalLink className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    
                    {(() => {
                      const localDate = toLocalDate(cls.date, cls.time, cls.timezone);
                      const msDiff = localDate.getTime() - new Date().getTime();
                      const hoursDiff = msDiff / (1000 * 60 * 60);
                      const isPastDeadline = hoursDiff < 24;

                      return (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              className={isPastDeadline ? "bg-muted text-muted-foreground hover:bg-muted hover:text-muted-foreground cursor-not-allowed" : ""}
                              onClick={(e) => {
                                if (isPastDeadline) {
                                  e.preventDefault();
                                  toast.error('Unreschedulable due to timing.');
                                }
                              }}
                            >
                              Reschedule
                              <CalendarClock className="ml-2 h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          {!isPastDeadline && (
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reschedule Class?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to reschedule this class? It will be removed from your calendar, and you will receive one (1) recuperation credit to use later.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => confirmReschedule(cls)}>
                                  Yes, Reschedule
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          )}
                        </AlertDialog>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentClasses;
