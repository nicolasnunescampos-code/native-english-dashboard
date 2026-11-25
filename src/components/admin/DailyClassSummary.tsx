import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase, Class } from '@/lib/supabase';
import { WhiteboardViewer } from '@/components/WhiteboardPreviewModal';
import {
  extractWhiteboardUrl,
  stripWhiteboardTag,
  cleanupExpiredWhiteboards,
} from '@/lib/whiteboardUtils';
import { addDays, format, parseISO, subDays } from 'date-fns';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Image as ImageIcon,
  Search,
  UserX,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type StatusFilter = 'all' | 'graded' | 'absent' | 'pending' | 'whiteboard';

function extractTeacherName(title?: string | null): string {
  if (!title) return 'Unassigned';
  if (!title.includes(' - ')) return title.trim();
  const parts = title.split(' - ');
  return parts[1]?.trim() || title.trim();
}

interface DailyClassSummaryProps {
  compact?: boolean;
  headerAction?: React.ReactNode;
}

export const DailyClassSummary: React.FC<DailyClassSummaryProps> = ({
  compact = false,
  headerAction,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    format(new Date(), 'yyyy-MM-dd')
  );
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachersList, setTeachersList] = useState<string[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const fetchDayData = async () => {
      setLoading(true);
      try {
        const [{ data: cData, error: cErr }, { data: tData }] = await Promise.all([
          supabase
            .from('classes')
            .select('*')
            .eq('date', selectedDate)
            .order('time', { ascending: true }),
          supabase.from('teachers').select('name').order('name'),
        ]);

        if (cErr) throw cErr;

        const activeClasses = (cData || []).filter(
          (c: any) => c.status !== 'cancelled' && c.status !== 'rescheduled'
        );
        setClasses(activeClasses);

        if (tData) {
          setTeachersList(tData.map((t: any) => t.name));
        }
      } catch (err) {
        console.error('Error fetching daily class summary:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDayData();
  }, [selectedDate]);

  useEffect(() => {
    cleanupExpiredWhiteboards();
  }, []);

  // Summary metrics for the selected day
  const summary = useMemo(() => {
    const total = classes.length;
    const graded = classes.filter((c) => !c.is_absent && c.class_grade !== null && c.class_grade !== undefined);
    const absent = classes.filter((c) => !!c.is_absent);
    const pending = classes.filter((c) => !c.is_absent && (c.class_grade === null || c.class_grade === undefined));
    const withWhiteboard = classes.filter((c) => !!extractWhiteboardUrl(c));

    const avgGrade =
      graded.length > 0
        ? graded.reduce((acc, c) => acc + (Number(c.class_grade) || 0), 0) / graded.length
        : null;

    // Group by teacher
    const byTeacherMap: Record<
      string,
      {
        teacher: string;
        total: number;
        graded: number;
        absentStudents: string[];
        pending: number;
        whiteboards: number;
      }
    > = {};

    for (const cls of classes) {
      const teacher = extractTeacherName(cls.title);
      if (!byTeacherMap[teacher]) {
        byTeacherMap[teacher] = {
          teacher,
          total: 0,
          graded: 0,
          absentStudents: [],
          pending: 0,
          whiteboards: 0,
        };
      }
      const entry = byTeacherMap[teacher];
      entry.total += 1;
      if (cls.is_absent) {
        entry.absentStudents.push(cls.student_name || 'Student');
      } else if (cls.class_grade !== null && cls.class_grade !== undefined) {
        entry.graded += 1;
      } else {
        entry.pending += 1;
      }
      if (extractWhiteboardUrl(cls)) {
        entry.whiteboards += 1;
      }
    }

    const teacherSummaries = Object.values(byTeacherMap).sort((a, b) =>
      a.teacher.localeCompare(b.teacher)
    );
    const teachersWithAbsences = teacherSummaries.filter((t) => t.absentStudents.length > 0);

    return {
      total,
      gradedCount: graded.length,
      absentCount: absent.length,
      pendingCount: pending.length,
      whiteboardCount: withWhiteboard.length,
      avgGrade,
      teacherSummaries,
      teachersWithAbsences,
    };
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const tName = extractTeacherName(cls.title).toLowerCase();
      if (selectedTeacher !== 'all' && !tName.includes(selectedTeacher.toLowerCase())) {
        return false;
      }
      const isGraded = !cls.is_absent && cls.class_grade !== null && cls.class_grade !== undefined;
      const isAbsent = !!cls.is_absent;
      const isPending = !isAbsent && !isGraded;
      const hasWb = !!extractWhiteboardUrl(cls);

      if (statusFilter === 'graded' && !isGraded) return false;
      if (statusFilter === 'absent' && !isAbsent) return false;
      if (statusFilter === 'pending' && !isPending) return false;
      if (statusFilter === 'whiteboard' && !hasWb) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const studentMatch = (cls.student_name || '').toLowerCase().includes(q);
        const teacherMatch = tName.includes(q);
        const notesMatch = stripWhiteboardTag(cls.notes).toLowerCase().includes(q);
        if (!studentMatch && !teacherMatch && !notesMatch) return false;
      }
      return true;
    });
  }, [classes, selectedTeacher, statusFilter, searchQuery]);

  const formattedDate = useMemo(() => {
    try {
      return format(parseISO(selectedDate), 'EEEE, MMM d, yyyy');
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const visibleRows = compact ? filteredClasses.slice(0, 8) : filteredClasses;

  return (
    <Card className="border-border/70 bg-card/80 backdrop-blur-sm shadow-sm">
      <CardHeader className="pb-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2 flex-wrap">
              <Calendar className="w-5 h-5 text-blue-600" />
              {compact ? "Today's Classes Summary" : 'Daily Classes & Grades Summary'}
              {selectedDate === todayStr && (
                <Badge className="bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-300/40 text-xs">
                  Today
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-0.5">
              {formattedDate} — Track graded classes, absences by teacher, pending grades, and Grammar whiteboards.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!compact && (
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))
                  }
                  title="Previous day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="h-8 w-[140px] border-0 bg-transparent text-xs font-medium focus-visible:ring-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'))
                  }
                  title="Next day"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {selectedDate !== todayStr && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setSelectedDate(todayStr)}
                  >
                    Today
                  </Button>
                )}
              </div>
            )}

            {headerAction}

            {compact && (
              <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
                <Link to="/admin/grades">
                  Full Daily View
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800'
                : 'bg-background/60 hover:bg-muted/40'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              Total Classes
            </p>
            <p className="text-2xl font-extrabold mt-1">{summary.total}</p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'graded' ? 'all' : 'graded')}
            className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
              statusFilter === 'graded'
                ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                : 'bg-background/60 hover:bg-muted/40'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Graded
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                {summary.gradedCount}
              </p>
              {summary.avgGrade !== null && (
                <span className="text-xs text-muted-foreground">
                  avg {summary.avgGrade.toFixed(1)}/10
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'absent' ? 'all' : 'absent')}
            className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
              statusFilter === 'absent'
                ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
                : 'bg-background/60 hover:bg-muted/40'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <UserX className="w-3.5 h-3.5 text-rose-600" />
              Absences
            </p>
            <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {summary.absentCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                : 'bg-background/60 hover:bg-muted/40'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Pending Grade
            </p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {summary.pendingCount}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'whiteboard' ? 'all' : 'whiteboard')}
            className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
              statusFilter === 'whiteboard'
                ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800'
                : 'bg-background/60 hover:bg-muted/40'
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
              Whiteboards
            </p>
            <p className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
              {summary.whiteboardCount}
            </p>
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Teachers with Absent Students Callout + Per-Teacher Summary */}
        {summary.teachersWithAbsences.length > 0 && (
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20 p-3.5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <UserX className="w-4 h-4" />
              Teachers with Absent Students ({summary.teachersWithAbsences.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {summary.teachersWithAbsences.map((t) => (
                <button
                  key={t.teacher}
                  type="button"
                  onClick={() => {
                    setSelectedTeacher(t.teacher);
                    setStatusFilter('absent');
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-white/90 dark:bg-slate-900 border border-rose-200 dark:border-rose-800 hover:border-rose-400 transition-colors cursor-pointer text-left"
                >
                  <span className="font-bold text-foreground">{t.teacher}:</span>{' '}
                  <span className="text-rose-700 dark:text-rose-300 font-medium">
                    {t.absentStudents.join(', ')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Per-Teacher Breakdown */}
        {summary.teacherSummaries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {summary.teacherSummaries.map((t) => {
              const isSelected = selectedTeacher.toLowerCase() === t.teacher.toLowerCase();
              return (
                <button
                  key={t.teacher}
                  type="button"
                  onClick={() => setSelectedTeacher(isSelected ? 'all' : t.teacher)}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500/30'
                      : 'bg-background/60 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm truncate">{t.teacher}</span>
                    <Badge variant="outline" className="text-[11px] shrink-0">
                      {t.total} {t.total === 1 ? 'class' : 'classes'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-2 text-[11px]">
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {t.graded} graded
                    </span>
                    {t.absentStudents.length > 0 && (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        • {t.absentStudents.length} absent
                      </span>
                    )}
                    {t.pending > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        • {t.pending} pending
                      </span>
                    )}
                    {t.whiteboards > 0 && (
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                        • {t.whiteboards} board{t.whiteboards > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Filter Bar (shown in full view, or if filters active) */}
        {(!compact || selectedTeacher !== 'all' || statusFilter !== 'all') && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {!compact && (
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search student, teacher, notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="All Teachers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachersList.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(selectedTeacher !== 'all' || statusFilter !== 'all' || searchQuery) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => {
                    setSelectedTeacher('all');
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Classes Table */}
        <div className="rounded-xl border overflow-x-auto bg-background/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Type / Ch.</TableHead>
                <TableHead>Class</TableHead>
                {!compact && (
                  <>
                    <TableHead>Spk</TableHead>
                    <TableHead>Lst</TableHead>
                    <TableHead>Grm</TableHead>
                    <TableHead>Rdg</TableHead>
                    <TableHead className="min-w-[180px]">Notes</TableHead>
                  </>
                )}
                <TableHead>Whiteboard</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={compact ? 6 : 11} className="text-center py-8 text-muted-foreground text-sm">
                    Loading classes for {formattedDate}...
                  </TableCell>
                </TableRow>
              ) : visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={compact ? 6 : 11} className="text-center py-8 text-muted-foreground text-sm">
                    No classes match the selected filters for {formattedDate}.
                  </TableCell>
                </TableRow>
              ) : (
                visibleRows.map((cls) => {
                  const teacherName = extractTeacherName(cls.title);
                  const wbUrl = extractWhiteboardUrl(cls);
                  const cleanNotes = stripWhiteboardTag(cls.notes);
                  const isGraded =
                    !cls.is_absent && cls.class_grade !== null && cls.class_grade !== undefined;

                  return (
                    <TableRow
                      key={cls.id}
                      className={cls.is_absent ? 'bg-rose-50/50 dark:bg-rose-950/15' : ''}
                    >
                      <TableCell className="text-xs font-mono whitespace-nowrap">
                        {cls.time || '-'}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {cls.student_name || 'Student'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {teacherName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {cls.class_type ? (
                            <Badge variant="outline" className="text-[11px]">
                              {cls.class_type}
                            </Badge>
                          ) : null}
                          {cls.class_chapter && !cls.is_absent ? (
                            <Badge variant="secondary" className="text-[11px]">
                              Ch. {cls.class_chapter}
                            </Badge>
                          ) : null}
                          {!cls.class_type && !cls.class_chapter && (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                      </TableCell>

                      {cls.is_absent ? (
                        <TableCell colSpan={compact ? 1 : 5}>
                          <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800">
                            ✗ Absent
                          </Badge>
                        </TableCell>
                      ) : !isGraded ? (
                        <TableCell colSpan={compact ? 1 : 5}>
                          <Badge variant="secondary" className="text-amber-700 bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                            Pending Grade
                          </Badge>
                        </TableCell>
                      ) : (
                        <>
                          <TableCell className="font-bold text-primary whitespace-nowrap">
                            {cls.class_grade}/10
                          </TableCell>
                          {!compact && (
                            <>
                              <TableCell className="text-xs">{cls.speaking_grade ?? '-'}</TableCell>
                              <TableCell className="text-xs">{cls.listening_grade ?? '-'}</TableCell>
                              <TableCell className="text-xs">{cls.grammar_grade ?? '-'}</TableCell>
                              <TableCell className="text-xs">{cls.reading_grade ?? '-'}</TableCell>
                            </>
                          )}
                        </>
                      )}

                      {!compact && (
                        <TableCell className="text-xs text-muted-foreground max-w-[240px]">
                          {cleanNotes ? (
                            <p className="line-clamp-2 italic">“{cleanNotes}”</p>
                          ) : (
                            <span>-</span>
                          )}
                        </TableCell>
                      )}

                      <TableCell>
                        {wbUrl ? (
                          <WhiteboardViewer
                            url={wbUrl}
                            classDate={cls.date}
                            compact
                            subtitle={`${cls.student_name || 'Student'} • ${teacherName} • ${formattedDate}`}
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {compact && filteredClasses.length > 8 && (
          <div className="flex justify-center pt-1">
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
              <Link to="/admin/grades">
                Show all {filteredClasses.length} classes from today
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
