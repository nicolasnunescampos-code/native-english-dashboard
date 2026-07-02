'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase, Class } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

const StudentHistory: React.FC = () => {
  const { studentName, user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Get Student ID for relational query
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .ilike('email', user.email)
          .maybeSingle();

        const studentId = studentData?.id;

        // 2. Fetch Legacy Classes (by name) - Only if we have a name
        let legacyClasses: Class[] = [];
        if (studentName) {
          const { data } = await supabase
            .from('classes')
            .select('*')
            .eq('student_name', studentName)
            .lte('date', today)
            .order('date', { ascending: false });
          legacyClasses = data || [];
        }

        // 3. Fetch New Relational Classes (by assignment)
        let newClasses: Class[] = [];
        if (studentId) {
          const { data } = await supabase
            .from('classes')
            .select(`
                *,
                teachers (name),
                class_assignments!inner (student_id)
            `)
            .eq('class_assignments.student_id', studentId)
            .lte('date', today) // Past and today's classes
            .eq('status', 'published') // Only published? Or all? Usually history implies it happened.
            .order('date', { ascending: false });

          // Map to respect Teacher Name
          if (data) {
            newClasses = data.map((cls: any) => ({
              ...cls,
              title: cls.teachers?.name || cls.title, // Use teacher name as title
            }));
          }
        }

        // 4. Merge and Deduplicate (by ID)
        const mergedClasses = [...legacyClasses, ...newClasses];
        const uniqueClassesMap = Array.from(new Map(mergedClasses.map(item => [item.id, item])).values());

        // 5. Filter out future classes from today
        const now = new Date();
        const pastClasses = uniqueClassesMap.filter(cls => {
          if (cls.date < today) return true;
          if (cls.date === today) {
            // Already graded or marked absent
            if (cls.class_grade !== null || cls.is_absent) return true;
            
            // Or time has passed (best effort)
            if (cls.time) {
              try {
                // If it's a timestamp
                if (cls.time.includes('T')) {
                  return new Date(cls.time) <= now;
                }
                // If it's HH:MM notation
                const [hours, minutes] = cls.time.split(':').map(Number);
                const classDate = new Date(now);
                classDate.setHours(hours || 0, minutes || 0, 0, 0);
                return classDate <= now;
              } catch (e) {
                return true;
              }
            }
            return true;
          }
          return false;
        });

        // 6. Sort again
        pastClasses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setClasses(pastClasses);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [studentName, user]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        📚 Class History
      </h2>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No class history yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {classes.map((cls, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold">
                        {format(parseISO(cls.date), 'MMMM d, yyyy')}
                      </p>
                      <Badge variant="secondary">{cls.time}</Badge>
                    </div>
                    <p className="text-muted-foreground">Teacher: {cls.title}</p>
                    {cls.class_chapter && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Chapter: {cls.class_chapter}
                      </p>
                    )}
                    {cls.class_type && (
                      <Badge variant="outline" className="mt-2">
                        {cls.class_type}
                      </Badge>
                    )}
                  </div>

                  {/* Grades */}
                  {cls.is_absent ? (
                    <div className="flex items-center justify-center p-4 bg-red-50 rounded-md border border-red-100 min-w-[200px]">
                      <p className="font-semibold text-red-700">Student was Absent</p>
                    </div>
                  ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Class</p>
                      <p className="text-lg font-bold text-primary">
                        {cls.class_grade ?? '-'}
                        <span className="text-xs text-muted-foreground">/10</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Speaking</p>
                      <p className="text-lg font-bold text-primary">
                        {cls.speaking_grade ?? '-'}
                        <span className="text-xs text-muted-foreground">/10</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Grammar</p>
                      <p className="text-lg font-bold text-primary">
                        {cls.grammar_grade ?? '-'}
                        <span className="text-xs text-muted-foreground">/10</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Reading</p>
                      <p className="text-lg font-bold text-primary">
                        {cls.reading_grade ?? '-'}
                        <span className="text-xs text-muted-foreground">/10</span>
                      </p>
                    </div>
                  </div>
                  )}
                </div>

                {/* NOTES */}
                {cls.notes && (
                  <div className="mt-4 bg-muted p-3 rounded-md text-sm italic text-muted-foreground">
                    “{cls.notes}”
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentHistory;