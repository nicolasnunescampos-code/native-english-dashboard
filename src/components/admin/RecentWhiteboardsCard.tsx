import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase, Class } from '@/lib/supabase';
import {
  WHITEBOARD_RETENTION_DAYS,
  getWhiteboardStatus,
  cleanupExpiredWhiteboards,
} from '@/lib/whiteboardUtils';
import { WhiteboardViewer } from '@/components/WhiteboardPreviewModal';
import { Image as ImageIcon, ArrowRight } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import { Link } from 'react-router-dom';

function extractTeacherName(title?: string | null): string {
  if (!title) return 'Teacher';
  if (!title.includes(' - ')) return title.trim();
  const parts = title.split(' - ');
  return parts[1]?.trim() || title.trim();
}

export const RecentWhiteboardsCard: React.FC = () => {
  const [items, setItems] = useState<(Class & { whiteboardUrl: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentWhiteboards = async () => {
      try {
        const cutoffDate = format(subDays(new Date(), WHITEBOARD_RETENTION_DAYS), 'yyyy-MM-dd');
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .gte('date', cutoffDate)
          .or('class_type.eq.Grammar,notes.ilike.%[Whiteboard:%')
          .order('date', { ascending: false })
          .order('time', { ascending: false })
          .limit(30);

        if (error) throw error;

        const withWhiteboards: (Class & { whiteboardUrl: string })[] = [];
        for (const cls of data || []) {
          const status = getWhiteboardStatus(cls);
          if (status?.url) {
            withWhiteboards.push({ ...cls, whiteboardUrl: status.url });
          }
        }
        setItems(withWhiteboards);
      } catch (err) {
        console.error('Error fetching recent grammar whiteboards:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentWhiteboards();
    cleanupExpiredWhiteboards();
  }, []);

  return (
    <Card className="border-indigo-200/70 dark:border-indigo-900/40 bg-card/80 backdrop-blur-sm shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3 flex-wrap">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            Recent Grammar Whiteboard Screenshots
            {!loading && (
              <Badge variant="secondary" className="text-xs font-semibold">
                {items.length} active
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Whiteboard screenshots sent by teachers when grading Grammar classes (kept for {WHITEBOARD_RETENTION_DAYS} days).
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
          <Link to="/admin/grades">
            View All Grades
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-28 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-xl">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-25" />
            <p className="font-medium text-foreground">No Grammar whiteboard screenshots in the last {WHITEBOARD_RETENTION_DAYS} days</p>
            <p className="text-xs mt-1">
              When a teacher grades a Grammar class, their whiteboard screenshot will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
            {items.slice(0, 9).map((cls) => {
              const teacherName = extractTeacherName(cls.title);
              const studentName = cls.student_name || 'Student';
              const dateLabel = format(parseISO(cls.date), 'MMM d, yyyy');

              return (
                <div
                  key={cls.id}
                  className="rounded-xl border bg-background/70 p-3 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 truncate">
                        {teacherName}
                      </span>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {dateLabel}
                      </span>
                    </div>
                    <p className="text-xs text-foreground">
                      Sent a grammar whiteboard for{' '}
                      <span className="font-semibold">{studentName}</span>
                    </p>
                    {(cls.class_level || cls.class_chapter) && (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        {cls.class_level && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            {cls.class_level}
                          </Badge>
                        )}
                        {cls.class_chapter && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            Ch. {cls.class_chapter}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <WhiteboardViewer
                    url={cls.whiteboardUrl}
                    classDate={cls.date}
                    subtitle={`${teacherName} → ${studentName} • ${dateLabel}`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
