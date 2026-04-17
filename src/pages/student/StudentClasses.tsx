import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchStudentNextChapters, NextChapterInfo, ClassType } from '@/lib/courseUtils';
import { supabase, Class } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { toLocalDate, formatClassTime, getTimeZoneLabel } from '@/lib/dateUtils';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const extractTeacherName = (title: string) => {
  if (!title) return '';
  const parts = title.split(' - ');
  return parts.length > 1 ? parts[1] : title;
};

const StudentClasses: React.FC = () => {
  const { studentName } = useAuth();
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
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('student_name', studentName)
          .gte('date', today)
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
      <h2 className="text-xl font-semibold flex items-center gap-2">
        📅 Upcoming Classes
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
                        const localDate = toLocalDate(cls.date, cls.time);
                        return format(localDate, 'EEEE, MMMM d, yyyy');
                      })()}
                    </p>
                    {cls.title && (
                      <p className="text-base font-medium mt-1">
                        {cls.title}
                      </p>
                    )}
                    <p className="text-primary font-medium flex items-center gap-2 mt-1">
                      {formatClassTime(cls.date, cls.time)}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({getTimeZoneLabel()})
                      </span>
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Teacher: {extractTeacherName(cls.title)}
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
