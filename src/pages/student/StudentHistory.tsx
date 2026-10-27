import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase, Class, ExamSubmission } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  MessageSquare,
  Star,
  Award,
  TrendingUp,
  Clock,
  Quote,
  BarChart3,
  GraduationCap
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { cn } from '@/lib/utils';

const TOTAL_COURSE_CLASSES = 160;

const CEFR_LEVELS = [
  { code: 'A1/A2', label: 'A1/A2' },
  { code: 'B1', label: 'B1' },
  { code: 'B2', label: 'B2' },
  { code: 'C1/C2', label: 'C1/C2' },
];

function getLevelStage(levelStr?: string | null, chapterStr?: string | null, completedCount: number = 0): number {
  if (levelStr) {
    const l = levelStr.trim().toLowerCase();
    if (l.includes('c1') || l.includes('c2') || l.includes('advanced 2')) return 3;
    if (l.includes('b2') || l === 'advanced' || l === 'advanced 1') return 2;
    if (l.includes('b1')) return 1;
    if (l.includes('intermediate')) {
      const ch = parseInt(chapterStr || '1', 10);
      return !isNaN(ch) && ch > 10 ? 2 : 1;
    }
    if (l.includes('a1') || l.includes('a2') || l.includes('beginner') || l.includes('mixed') || l.includes('pre-a1') || l.includes('pre a1')) return 0;
  }

  // Fallback according to completed classes out of 160 (approx 40 classes per stage)
  if (completedCount >= 120) return 3; // C1/C2
  if (completedCount >= 80) return 2;  // B2
  if (completedCount >= 40) return 1;  // B1
  return 0; // A1/A2
}

const StudentHistory: React.FC = () => {
  const { studentName, studentId: contextStudentId, user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<ExamSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Get Student ID for relational query if not in context
        let studentId = contextStudentId;
        if (!studentId) {
          const { data: studentData } = await supabase
            .from('students')
            .select('id')
            .ilike('email', user.email)
            .maybeSingle();
          studentId = studentData?.id;
        }

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
            .lte('date', today)
            .eq('status', 'published')
            .order('date', { ascending: false });

          if (data) {
            newClasses = data.map((cls: any) => ({
              ...cls,
              title: cls.teachers?.name || cls.title,
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
            if (cls.class_grade !== null || cls.is_absent) return true;
            if (cls.time) {
              try {
                if (cls.time.includes('T')) {
                  return new Date(cls.time) <= now;
                }
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

        // 6. Sort by date descending
        pastClasses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setClasses(pastClasses);

        // 7. Fetch Exams
        if (studentId || user?.id) {
          const query = supabase
            .from('exam_submissions')
            .select('*, exams(*)');

          if (studentId && user?.id) {
            query.or(`student_id.eq.${studentId},student_id.eq.${user.id}`);
          } else if (studentId) {
            query.eq('student_id', studentId);
          } else {
            query.eq('student_id', user.id);
          }

          const { data: examData } = await query.order('created_at', { ascending: false });
          setExams(examData || []);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [studentName, contextStudentId, user]);

  // Calculations
  const totalClasses = classes.length;
  const completedClasses = classes.filter(
    cls => !cls.is_absent && (cls.class_grade !== null || cls.speaking_grade !== null || cls.listening_grade !== null || cls.grammar_grade !== null || cls.reading_grade !== null)
  );
  const classesCompletedCount = completedClasses.length;

  const teacherComments = classes.filter(
    cls => cls.notes && cls.notes.trim().length > 0
  );
  const feedbacksCount = teacherComments.length;

  // Grade averages
  const allGrades: number[] = [];
  const grammarGrades: number[] = [];
  const speakingGrades: number[] = [];
  const listeningGrades: number[] = [];
  const readingGrades: number[] = [];

  completedClasses.forEach(cls => {
    if (cls.grammar_grade !== null && cls.grammar_grade !== undefined) {
      grammarGrades.push(cls.grammar_grade);
      allGrades.push(cls.grammar_grade);
    }
    if (cls.speaking_grade !== null && cls.speaking_grade !== undefined) {
      speakingGrades.push(cls.speaking_grade);
      allGrades.push(cls.speaking_grade);
    }
    if (cls.listening_grade !== null && cls.listening_grade !== undefined) {
      listeningGrades.push(cls.listening_grade);
      allGrades.push(cls.listening_grade);
    }
    if (cls.reading_grade !== null && cls.reading_grade !== undefined) {
      readingGrades.push(cls.reading_grade);
      allGrades.push(cls.reading_grade);
    }
    if (cls.class_grade !== null && cls.class_grade !== undefined && cls.grammar_grade === null && cls.speaking_grade === null && cls.listening_grade === null && cls.reading_grade === null) {
      allGrades.push(cls.class_grade);
    }
  });

  const calcAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const overallAverage = calcAvg(allGrades);
  const grammarAvg = calcAvg(grammarGrades);
  const speakingAvg = calcAvg(speakingGrades);
  const listeningAvg = calcAvg(listeningGrades);
  const readingAvg = calcAvg(readingGrades);

  // Level & Course Progress
  const latestGradedClass = completedClasses[0] || classes[0];
  const currentLevelIndex = getLevelStage(latestGradedClass?.class_level, latestGradedClass?.class_chapter, classesCompletedCount);
  const currentLevelInfo = CEFR_LEVELS[currentLevelIndex] || CEFR_LEVELS[0];
  
  // Progress based on 160 total course classes
  const progressPercentage = Math.min(100, Math.round((classesCompletedCount / TOTAL_COURSE_CLASSES) * 100));

  // Grade Evolution Data (chronological order)
  const gradeEvolutionData = [...completedClasses]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(cls => {
      const gList: number[] = [];
      if (cls.class_grade !== null && cls.class_grade !== undefined) gList.push(cls.class_grade);
      if (cls.speaking_grade !== null && cls.speaking_grade !== undefined) gList.push(cls.speaking_grade);
      if (cls.listening_grade !== null && cls.listening_grade !== undefined) gList.push(cls.listening_grade);
      if (cls.grammar_grade !== null && cls.grammar_grade !== undefined) gList.push(cls.grammar_grade);
      if (cls.reading_grade !== null && cls.reading_grade !== undefined) gList.push(cls.reading_grade);

      const avg = gList.length > 0 ? Number((gList.reduce((a, b) => a + b, 0) / gList.length).toFixed(1)) : 0;
      return {
        date: cls.date,
        grade: avg,
        title: cls.title,
      };
    })
    .filter(item => item.grade > 0);

  if (loading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse rounded-2xl">
            <CardContent className="p-6">
              <div className="h-28 bg-muted rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-12">
      {/* Top Tabs Bar */}
      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="bg-slate-100/90 dark:bg-slate-800/60 p-1.5 rounded-2xl gap-1 h-auto flex flex-wrap border border-slate-200/50 dark:border-slate-700/50">
          <TabsTrigger
            value="progress"
            className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <BarChart3 className="w-4 h-4 mr-2 text-blue-600" />
            Progress
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Clock className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger
            value="feedbacks"
            className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Feedbacks ({feedbacksCount})
          </TabsTrigger>
          <TabsTrigger
            value="classes"
            className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Classes ({totalClasses})
          </TabsTrigger>
          <TabsTrigger
            value="exams"
            className="rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Exams ({exams.length})
          </TabsTrigger>
        </TabsList>

        {/* ===================== TAB 1: PROGRESS (CLEAN VIEW + COMMENTS) ===================== */}
        <TabsContent value="progress" className="space-y-6 mt-6">
          {/* Course Progress Stepper Card */}
          <Card className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-base sm:text-lg text-foreground">Course Progress</h3>
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {currentLevelInfo.label} • {progressPercentage}% of the course
                </span>
              </div>

              {/* Stepper with A1/A2, B1, B2, C1/C2 */}
              <div className="overflow-x-auto pb-2 -mb-2">
                <div className="flex items-center gap-2 min-w-[480px] justify-between">
                  {CEFR_LEVELS.map((lvl, idx) => {
                    const isCompleted = idx < currentLevelIndex;
                    const isCurrent = idx === currentLevelIndex;
                    const isUpcoming = idx > currentLevelIndex;

                    return (
                      <React.Fragment key={lvl.code}>
                        <div
                          className={cn(
                            "flex-1 flex flex-col items-center justify-center py-3.5 px-3 sm:px-5 rounded-xl text-center transition-all",
                            isCompleted && "bg-blue-50/80 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30",
                            isCurrent && "bg-blue-600 text-white shadow-md ring-2 ring-blue-200/50 dark:ring-blue-800/50",
                            isUpcoming && "bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 border border-slate-200/40 dark:border-slate-800"
                          )}
                        >
                          <span
                            className={cn(
                              "text-sm sm:text-base font-bold",
                              isCurrent ? "text-white" : isCompleted ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
                            )}
                          >
                            {lvl.label}
                          </span>
                          <span
                            className={cn(
                              "text-[11px] sm:text-xs mt-0.5",
                              isCurrent ? "text-white/90" : isCompleted ? "text-blue-500 dark:text-blue-400" : "text-slate-400"
                            )}
                          >
                            {isCompleted ? "Completed" : isCurrent ? "Current" : "Upcoming"}
                          </span>
                        </div>

                        {idx < CEFR_LEVELS.length - 1 && (
                          <div
                            className={cn(
                              "w-4 sm:w-8 h-0.5 rounded-full shrink-0",
                              idx < currentLevelIndex ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
                            )}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>Classes completed</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-3">
                  {classesCompletedCount}/{TOTAL_COURSE_CLASSES}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <span>Feedbacks</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-3">
                  {feedbacksCount}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>Overall average</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-3">
                  {overallAverage > 0 ? `${overallAverage.toFixed(1)}/10` : '-/10'}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium">
                  <Award className="w-4 h-4 text-blue-600" />
                  <span>Course progress</span>
                </div>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-3">
                  {progressPercentage}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Skill Averages Card */}
          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-base text-foreground">Skill Averages</h3>
              <div className="space-y-4 pt-1">
                {[
                  { skill: "Grammar", val: grammarAvg },
                  { skill: "Speaking", val: speakingAvg },
                  { skill: "Reading", val: readingAvg },
                ].map(({ skill, val }) => (
                  <div key={skill} className="flex items-center gap-4">
                    <span className="w-20 sm:w-24 text-sm font-medium text-slate-700 dark:text-slate-300 shrink-0">
                      {skill}
                    </span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-2.5 sm:h-3 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, (val / 10) * 100))}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-foreground w-8 text-right">
                      {val > 0 ? val.toFixed(1) : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Grade Evolution Card */}
          <Card className="rounded-2xl border bg-card shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-bold text-base text-foreground mb-4">Grade Evolution</h3>
              {gradeEvolutionData.length > 0 ? (
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={gradeEvolutionData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#9CA3AF", fontSize: 11 }}
                      />
                      <YAxis
                        domain={[0, 10]}
                        ticks={[0, 3, 6, 10]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#9CA3AF", fontSize: 11 }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid #E5E7EB",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
                        }}
                        formatter={(value: any) => [`${value} / 10`, "Grade"]}
                        labelFormatter={(lbl: string) => `Date: ${lbl}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="grade"
                        stroke="#2563eb"
                        strokeWidth={2.5}
                        dot={{ fill: "#2563eb", stroke: "#ffffff", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "#1d4ed8" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                  No graded classes to display evolution yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* ===================== TEACHER COMMENTS (BELOW THAT) ===================== */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Teacher Feedback & Comments
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Personalized observations and feedback from your instructors.
                </p>
              </div>
              <Badge variant="secondary" className="font-semibold">
                {teacherComments.length} {teacherComments.length === 1 ? 'Comment' : 'Comments'}
              </Badge>
            </div>

            {teacherComments.length === 0 ? (
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Quote className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="font-medium text-foreground">No teacher comments recorded yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    When your teachers leave feedback or tips during your classes, they will appear right here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {teacherComments.map((cls, idx) => (
                  <Card
                    key={cls.id || `${cls.date}-${idx}`}
                    className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <CardContent className="p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 text-blue-600 font-bold flex items-center justify-center text-sm shrink-0">
                            {cls.title ? cls.title.charAt(0).toUpperCase() : 'T'}
                          </div>
                          <div>
                            <p className="font-semibold text-sm sm:text-base text-foreground">
                              {cls.title || 'Teacher'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(cls.date), 'MMMM d, yyyy')} {cls.time ? `• ${cls.time}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {cls.class_type && (
                            <Badge variant="outline" className="text-xs">
                              {cls.class_type}
                            </Badge>
                          )}
                          {cls.class_chapter && (
                            <Badge variant="secondary" className="text-xs">
                              Chapter {cls.class_chapter}
                            </Badge>
                          )}
                          {cls.class_grade !== null && cls.class_grade !== undefined && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                              Grade: {cls.class_grade}/10
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* The Quote Bubble */}
                      <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 text-sm text-foreground relative">
                        <Quote className="w-4 h-4 text-blue-600 mb-1.5 opacity-80" />
                        <p className="italic leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                          "{cls.notes}"
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ===================== TAB 2: DETAILED HISTORY ===================== */}
        <TabsContent value="history" className="space-y-4 mt-6">
          {classes.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-8 text-center text-muted-foreground">
                No class history yet.
              </CardContent>
            </Card>
          ) : (
            classes.map((cls, index) => (
              <Card key={cls.id || index} className="rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold text-foreground">
                          {format(parseISO(cls.date), 'MMMM d, yyyy')}
                        </p>
                        <Badge variant="secondary">{cls.time}</Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">Teacher: {cls.title}</p>
                      {cls.class_chapter && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Chapter: {cls.class_chapter}
                        </p>
                      )}
                      {cls.class_type && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          {cls.class_type}
                        </Badge>
                      )}
                    </div>

                    {/* Grades breakdown */}
                    {cls.is_absent ? (
                      <div className="flex items-center justify-center p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30 min-w-[200px]">
                        <p className="font-semibold text-red-700 dark:text-red-400">Student was Absent</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
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
                          <p className="text-xs text-muted-foreground mb-1">Listening</p>
                          <p className="text-lg font-bold text-primary">
                            {cls.listening_grade ?? '-'}
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

                  {/* Notes if any */}
                  {cls.notes && (
                    <div className="mt-4 bg-muted/60 p-3 rounded-xl text-sm italic text-muted-foreground">
                      “{cls.notes}”
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ===================== TAB 3: FEEDBACKS ONLY ===================== */}
        <TabsContent value="feedbacks" className="space-y-4 mt-6">
          {teacherComments.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-8 text-center text-muted-foreground">
                No teacher comments recorded yet.
              </CardContent>
            </Card>
          ) : (
            teacherComments.map((cls, idx) => (
              <Card key={cls.id || idx} className="rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3 border-b pb-2">
                    <div>
                      <p className="font-semibold text-foreground">{cls.title || 'Teacher'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(cls.date), 'MMMM d, yyyy')} {cls.time ? `• ${cls.time}` : ''}
                      </p>
                    </div>
                    {cls.class_type && <Badge variant="outline">{cls.class_type}</Badge>}
                  </div>
                  <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 text-sm">
                    <Quote className="w-4 h-4 text-blue-600 mb-1" />
                    <p className="italic text-slate-800 dark:text-slate-200">"{cls.notes}"</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ===================== TAB 4: CLASSES LIST ===================== */}
        <TabsContent value="classes" className="space-y-4 mt-6">
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="divide-y">
                {classes.map((cls, idx) => (
                  <div key={cls.id || idx} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium text-sm text-foreground">{cls.title || 'Class'}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(cls.date), 'MMMM d, yyyy')} • {cls.time}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {cls.is_absent ? (
                        <Badge variant="destructive" className="text-xs">Absent</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Attended</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===================== TAB 5: EXAMS ===================== */}
        <TabsContent value="exams" className="space-y-4 mt-6">
          {exams.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-8 text-center text-muted-foreground">
                <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>No exam submissions found yet.</p>
              </CardContent>
            </Card>
          ) : (
            exams.map((exam) => (
              <Card key={exam.id} className="rounded-2xl hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">
                      {exam.exams?.title || `Exam - Chapter ${exam.exams?.chapter_number || 'N/A'}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Completed: {exam.completed_at ? format(parseISO(exam.completed_at), 'MMMM d, yyyy') : 'In progress'}
                    </p>
                  </div>
                  <div>
                    {exam.score !== null ? (
                      <Badge className="bg-emerald-600 text-white text-sm">
                        Score: {exam.score}%
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudentHistory;
