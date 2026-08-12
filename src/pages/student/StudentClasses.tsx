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
        setClasses(data || []);

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
      
      // 1. Delete class
      const { error: deleteError } = await supabase.from('classes').delete().eq('id', cls.id);
      if (deleteError) throw deleteError;

      // 2. Add recuperation
      const { error: recupError } = await supabase.from('recuperation_classes').insert({
        student_id: user.id,
        status: 'pending',
        date: cls.date, // optional reference
        notes: `Rescheduled from ${cls.date} ${cls.time}`
      });
      if (recupError) throw recupError;

      // 3. Notify teacher (optional, doing it if possible)
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

      toast.success('Class rescheduled! A recuperation credit has been added.');
      setClasses(prev => prev.filter(c => c.id !== cls.id));

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
        <ReadOnlyCalendar role="student" identifier={studentName || ''} />
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
