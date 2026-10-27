import React, { useEffect, useState, useMemo } from 'react';
import { supabase, Class, ExamSubmission, Question, GrammarGameSession } from '@/lib/supabase';
import { formatChapterLabel } from '@/data/grammarRushCurriculum';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  fetchStudentNextChapters,
  fetchUpcomingClassType,
  NextChapterInfo,
  ClassType,
} from '@/lib/courseUtils';
import { UnlockExamDialog } from '@/components/UnlockExamDialog';
import { NativeQuestLeaderboardCard } from '@/components/grammar-rush/NativeQuestLeaderboardCard';
import { playNativeSpeech } from '@/utils/speechEvaluator';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Loader2,
  Mic,
  Search,
  Star,
  TrendingUp,
  Users,
  Volume2,
  XCircle,
  Zap,
  Trophy,
  Flame,
} from 'lucide-react';

/* ---------------------------------------------
   Types & Constants
--------------------------------------------- */

type StudentRow = {
  id?: string;
  student_name: string;
  email?: string;
  course_type?: string;
  classes_completed?: number;
  nq_sessions?: number;
  nq_best_score?: number;
  nq_total_xp?: number;
  nq_avg_accuracy?: number;
  nq_chapters_count?: number;
  nq_max_combo?: number;
  speaking_attempts?: number;
  speaking_avg_score?: number;
};

interface SpeakingAttempt {
  id: string;
  student_id?: string;
  student_name: string;
  book_id: string;
  book_title: string;
  chapter_number: number;
  chapter_title: string;
  sentence_text: string;
  spoken_text: string;
  score: number;
  stars: number;
  created_at: string;
}

const TOTAL_COURSE_CLASSES = 160;

const CEFR_LEVELS = [
  { code: 'A1/A2', label: 'A1/A2' },
  { code: 'B1', label: 'B1' },
  { code: 'B2', label: 'B2' },
  { code: 'C1/C2', label: 'C1/C2' },
];

function getLevelStage(
  levelStr?: string | null,
  chapterStr?: string | null,
  completedCount: number = 0
): number {
  if (levelStr) {
    const l = levelStr.trim().toLowerCase();
    if (l.includes('c1') || l.includes('c2') || l.includes('advanced 2')) return 3;
    if (l.includes('b2') || l === 'advanced' || l === 'advanced 1') return 2;
    if (l.includes('b1')) return 1;
    if (l.includes('intermediate')) {
      const ch = parseInt(chapterStr || '1', 10);
      return !isNaN(ch) && ch > 10 ? 2 : 1;
    }
    if (
      l.includes('a1') ||
      l.includes('a2') ||
      l.includes('beginner') ||
      l.includes('mixed') ||
      l.includes('pre-a1') ||
      l.includes('pre a1')
    )
      return 0;
  }

  if (completedCount >= 120) return 3;
  if (completedCount >= 80) return 2;
  if (completedCount >= 40) return 1;
  return 0;
}

/* ---------------------------------------------
   Component
--------------------------------------------- */

export default function TeacherStudents() {
  const { teacherName, role } = useAuth();
  const [searchParams] = useSearchParams();
  const studentParam = searchParams.get('student');
  const basePath = role === 'admin' ? '/admin/student-history' : '/teacher/students';

  // Directory State
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [directorySearch, setDirectorySearch] = useState('');

  // Student Detail State
  const [studentInfo, setStudentInfo] = useState<{
    id?: string;
    student_name: string;
    email?: string;
    course_type?: string;
  } | null>(null);
  const [history, setHistory] = useState<Class[]>([]);
  const [nextChapters, setNextChapters] = useState<Partial<Record<ClassType, NextChapterInfo>>>({});
  const [upcomingClassType, setUpcomingClassType] = useState<ClassType | null>(null);
  const [examSubmissions, setExamSubmissions] = useState<ExamSubmission[]>([]);
  const [speakingAttempts, setSpeakingAttempts] = useState<SpeakingAttempt[]>([]);
  const [grammarSessions, setGrammarSessions] = useState<GrammarGameSession[]>([]);
  const [grammarQuestionsLookup, setGrammarQuestionsLookup] = useState<Record<string, { sentence: string; correct_sentence: string; explanation: string }>>({});
  const [loading, setLoading] = useState(true);

  // Exam Inspection Modal State
  const [inspectingSubmission, setInspectingSubmission] = useState<ExamSubmission | null>(null);
  const [inspectingQuestions, setInspectingQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  /* ---------------------------------------------
     MAIN EFFECT
  --------------------------------------------- */

  useEffect(() => {
    setLoading(true);

    if (studentParam) {
      fetchStudentFullProfile(studentParam);
    } else {
      fetchAllStudents();
    }
  }, [studentParam, teacherName, role]);

  /* ---------------------------------------------
     FETCH: ALL STUDENTS (For Teachers & Admins, including Native Quest progress)
  --------------------------------------------- */

  async function fetchAllStudents() {
    try {
      const [studentsRes, classesRes, nqSessionsRes, speakingRes] = await Promise.all([
        supabase
          .from('students')
          .select('id, student_name, email, course_type')
          .eq('status', 'active'),
        supabase
          .from('classes')
          .select('student_name, class_grade, speaking_grade, grammar_grade, reading_grade, listening_grade, is_absent')
          .or(
            'speaking_grade.not.is.null,class_grade.not.is.null,grammar_grade.not.is.null,reading_grade.not.is.null,listening_grade.not.is.null'
          ),
        supabase
          .from('grammar_game_sessions')
          .select('student_id, student_name, book, chapter, score, accuracy, best_combo'),
        supabase
          .from('student_speaking_attempts')
          .select('student_id, student_name, score'),
      ]);

      if (studentsRes.error) {
        console.error('Error fetching students:', studentsRes.error);
        setStudents([]);
        setLoading(false);
        return;
      }

      const allClasses = classesRes.data || [];
      const allNqSessions = (nqSessionsRes.data || []) as GrammarGameSession[];
      const allSpeaking = (speakingRes.data || []) as Array<{
        student_id?: string;
        student_name: string;
        score: number;
      }>;

      const studentsList: StudentRow[] = (studentsRes.data || [])
        .filter((s: any) => s.student_name)
        .map((s: any) => {
          const sNameLower = String(s.student_name).trim().toLowerCase();

          // Completed classes count
          const stuClasses = allClasses.filter(
            (c: any) =>
              !c.is_absent &&
              String(c.student_name || '')
                .trim()
                .toLowerCase() === sNameLower
          );

          // Native Quest sessions for this student
          const stuNq = allNqSessions.filter(
            (sess) =>
              (s.id && sess.student_id === s.id) ||
              String(sess.student_name || '')
                .trim()
                .toLowerCase() === sNameLower
          );

          const nqSessionsCount = stuNq.length;
          const nqBestScore =
            nqSessionsCount > 0
              ? Math.max(...stuNq.map((sess) => Number(sess.score || 0)))
              : 0;
          const nqTotalXp = stuNq.reduce((sum, sess) => sum + Number(sess.score || 0), 0);
          const nqAvgAccuracy =
            nqSessionsCount > 0
              ? Math.round(
                  stuNq.reduce((sum, sess) => sum + Number(sess.accuracy || 0), 0) /
                    nqSessionsCount
                )
              : 0;
          const nqChaptersCount = new Set(
            stuNq.map((sess) => `${sess.book}_${sess.chapter}`)
          ).size;
          const nqMaxCombo =
            nqSessionsCount > 0
              ? Math.max(...stuNq.map((sess) => Number(sess.best_combo || 0)))
              : 0;

          // Speaking attempts for this student
          const stuSpeak = allSpeaking.filter(
            (att) =>
              (s.id && att.student_id === s.id) ||
              String(att.student_name || '')
                .trim()
                .toLowerCase() === sNameLower
          );
          const speakingAvgScore =
            stuSpeak.length > 0
              ? Math.round(
                  stuSpeak.reduce((sum, att) => sum + Number(att.score || 0), 0) /
                    stuSpeak.length
                )
              : 0;

          return {
            id: s.id,
            student_name: s.student_name,
            email: s.email,
            course_type: s.course_type,
            classes_completed: stuClasses.length,
            nq_sessions: nqSessionsCount,
            nq_best_score: nqBestScore,
            nq_total_xp: nqTotalXp,
            nq_avg_accuracy: nqAvgAccuracy,
            nq_chapters_count: nqChaptersCount,
            nq_max_combo: nqMaxCombo,
            nq_last_accessed: stuNq.length > 0 ? (stuNq[0].created_at || null) : null,
            speaking_attempts: stuSpeak.length,
            speaking_avg_score: speakingAvgScore,
          };
        })
        .sort((a, b) => a.student_name.localeCompare(b.student_name));

      setStudents(studentsList);
    } catch (err) {
      console.error('Error fetching student directory:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------
     FETCH: FULL STUDENT PROFILE (History, Progress, Exams, Native Quest)
  --------------------------------------------- */

  async function fetchStudentFullProfile(studentName: string) {
    try {
      // 1. Fetch Student Record
      const { data: stuData } = await supabase
        .from('students')
        .select('id, student_name, email, course_type')
        .ilike('student_name', studentName.trim())
        .maybeSingle();

      const studentId = stuData?.id;
      setStudentInfo(
        stuData || {
          student_name: studentName,
        }
      );

      // 2. Fetch Graded Classes, Next Chapters, Upcoming Type, Exams, Speaking, and Native Quest in parallel
      const classesPromise = supabase
        .from('classes')
        .select('*')
        .ilike('student_name', studentName.trim())
        .or(
          'speaking_grade.not.is.null,class_grade.not.is.null,grammar_grade.not.is.null,reading_grade.not.is.null,listening_grade.not.is.null,is_absent.eq.true'
        )
        .order('date', { ascending: false });

      const chaptersPromise = fetchStudentNextChapters(studentName);
      const upcomingTypePromise = fetchUpcomingClassType(studentName);

      const speakingPromise = supabase
        .from('student_speaking_attempts')
        .select('*')
        .ilike('student_name', `%${studentName.trim()}%`)
        .order('created_at', { ascending: false })
        .limit(200);

      const examsPromise = studentId
        ? supabase
            .from('exam_submissions')
            .select('*, exams(*)')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as any[], error: null });

      const grammarPromise = studentId
        ? supabase
            .from('grammar_game_sessions')
            .select('*')
            .or(`student_id.eq.${studentId},student_name.ilike.%${studentName.trim()}%`)
            .order('created_at', { ascending: false })
            .limit(200)
        : supabase
            .from('grammar_game_sessions')
            .select('*')
            .ilike('student_name', `%${studentName.trim()}%`)
            .order('created_at', { ascending: false })
            .limit(200);

      const [classesRes, chaptersRes, upcomingTypeRes, speakingRes, examsRes, grammarRes] =
        await Promise.all([
          classesPromise,
          chaptersPromise,
          upcomingTypePromise,
          speakingPromise,
          examsPromise,
          grammarPromise,
        ]);

      setHistory(classesRes.data || []);
      setNextChapters(chaptersRes || {});
      setUpcomingClassType(upcomingTypeRes || null);
      setSpeakingAttempts((speakingRes.data as SpeakingAttempt[]) || []);
      setExamSubmissions((examsRes.data as ExamSubmission[]) || []);

      const loadedGrammarSessions = ((grammarRes.data || []) as GrammarGameSession[]);
      setGrammarSessions(loadedGrammarSessions);

      // Look up question details for any mistake question_ids if not embedded
      const mistakeIds = Array.from(
        new Set(
          loadedGrammarSessions.flatMap((s) =>
            Array.isArray(s.mistakes)
              ? s.mistakes.map((m: any) => m?.question_id).filter(Boolean)
              : []
          )
        )
      );
      if (mistakeIds.length > 0) {
        const { data: qData } = await supabase
          .from('grammar_game_questions')
          .select('id, sentence, correct_sentence, explanation')
          .in('id', mistakeIds);
        if (qData) {
          const map: Record<string, { sentence: string; correct_sentence: string; explanation: string }> = {};
          qData.forEach((q: any) => {
            map[q.id] = {
              sentence: q.sentence,
              correct_sentence: q.correct_sentence,
              explanation: q.explanation,
            };
          });
          setGrammarQuestionsLookup(map);
        }
      }
    } catch (err) {
      console.error('Error loading student details:', err);
    } finally {
      setLoading(false);
    }
  }

  /* ---------------------------------------------
     INSPECT EXAM ANSWERS
  --------------------------------------------- */

  async function handleInspectExam(sub: ExamSubmission) {
    setInspectingSubmission(sub);
    setLoadingQuestions(true);
    try {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', sub.exam_id)
        .order('created_at', { ascending: true });
      setInspectingQuestions(data || []);
    } catch (e) {
      console.error('Error fetching exam questions:', e);
      setInspectingQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }

  /* ---------------------------------------------
     COMPUTED METRICS FOR SELECTED STUDENT
  --------------------------------------------- */

  const completedClasses = useMemo(() => {
    return history.filter(
      (cls) =>
        !cls.is_absent &&
        (cls.class_grade !== null ||
          cls.speaking_grade !== null ||
          cls.listening_grade !== null ||
          cls.grammar_grade !== null ||
          cls.reading_grade !== null)
    );
  }, [history]);

  const classesCompletedCount = completedClasses.length;
  const progressPercentage = Math.min(
    100,
    Math.round((classesCompletedCount / TOTAL_COURSE_CLASSES) * 100)
  );

  const latestGradedClass = completedClasses[0] || history[0];
  const currentLevelIndex = getLevelStage(
    latestGradedClass?.class_level,
    latestGradedClass?.class_chapter,
    classesCompletedCount
  );
  const currentLevelInfo = CEFR_LEVELS[currentLevelIndex] || CEFR_LEVELS[0];

  const skillMetrics = useMemo(() => {
    const speaking: number[] = [];
    const listening: number[] = [];
    const grammar: number[] = [];
    const reading: number[] = [];
    const overall: number[] = [];

    completedClasses.forEach((cls) => {
      if (cls.speaking_grade != null) {
        speaking.push(cls.speaking_grade);
        overall.push(cls.speaking_grade);
      }
      if (cls.listening_grade != null) {
        listening.push(cls.listening_grade);
        overall.push(cls.listening_grade);
      }
      if (cls.grammar_grade != null) {
        grammar.push(cls.grammar_grade);
        overall.push(cls.grammar_grade);
      }
      if (cls.reading_grade != null) {
        reading.push(cls.reading_grade);
        overall.push(cls.reading_grade);
      }
      if (
        cls.class_grade != null &&
        cls.speaking_grade == null &&
        cls.listening_grade == null &&
        cls.grammar_grade == null &&
        cls.reading_grade == null
      ) {
        overall.push(cls.class_grade);
      }
    });

    const avg = (arr: number[]) =>
      arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return {
      speakingAvg: avg(speaking),
      listeningAvg: avg(listening),
      grammarAvg: avg(grammar),
      readingAvg: avg(reading),
      overallAvg: avg(overall),
    };
  }, [completedClasses]);

  // Combine online exam submissions + class exams
  const examClasses = useMemo(() => {
    return completedClasses.filter((cls) => cls.class_type === 'Exam');
  }, [completedClasses]);

  const completedOnlineExams = useMemo(() => {
    return examSubmissions.filter((s) => s.completed_at !== null);
  }, [examSubmissions]);

  const speakingStats = useMemo(() => {
    const total = speakingAttempts.length;
    const avgScore =
      total > 0
        ? Math.round(
            speakingAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / total
          )
        : 0;
    const highScores = speakingAttempts.filter((a) => a.score >= 80).length;
    const chapters = Array.from(
      new Set(speakingAttempts.map((a) => `${a.book_title} • ${a.chapter_title}`))
    );
    return { total, avgScore, highScores, chapters };
  }, [speakingAttempts]);

  const grammarStats = useMemo(() => {
    const totalSessions = grammarSessions.length;
    const avgAccuracy =
      totalSessions > 0
        ? Math.round(
            grammarSessions.reduce((sum, s) => sum + Number(s.accuracy || 0), 0) /
              totalSessions
          )
        : 0;
    const maxCombo =
      totalSessions > 0
        ? Math.max(...grammarSessions.map((s) => Number(s.best_combo || 0)))
        : 0;
    const bestScore =
      totalSessions > 0
        ? Math.max(...grammarSessions.map((s) => Number(s.score || 0)))
        : 0;
    const totalScore = grammarSessions.reduce((sum, s) => sum + Number(s.score || 0), 0);

    // Group by book + chapter for Best Scores & Accuracy BarChart
    const chapterMap = new Map<
      string,
      {
        book: string;
        chapter: string;
        label: string;
        shortLabel: string;
        bestScore: number;
        accuracies: number[];
        sessionsCount: number;
      }
    >();

    grammarSessions.forEach((s) => {
      const key = `${s.book}_${s.chapter}`;
      const existing = chapterMap.get(key);
      const label = `${s.book} • ${formatChapterLabel(s.book as any, String(s.chapter))}`;
      const shortLabel = `${s.book.slice(0, 3)} Ch.${s.chapter}`;

      if (!existing) {
        chapterMap.set(key, {
          book: s.book,
          chapter: String(s.chapter),
          label,
          shortLabel,
          bestScore: Number(s.score || 0),
          accuracies: [Number(s.accuracy || 0)],
          sessionsCount: 1,
        });
      } else {
        existing.bestScore = Math.max(existing.bestScore, Number(s.score || 0));
        existing.accuracies.push(Number(s.accuracy || 0));
        existing.sessionsCount += 1;
      }
    });

    const chapterBreakdown = Array.from(chapterMap.values()).map((c) => ({
      ...c,
      avgAccuracy: Math.round(
        c.accuracies.reduce((a, b) => a + b, 0) / c.accuracies.length
      ),
    }));

    const chaptersPracticedCount = chapterBreakdown.length;
    const beginnerChapters = chapterBreakdown.filter((c) => c.book === 'Beginner').length;
    const intermediateChapters = chapterBreakdown.filter((c) => c.book === 'Intermediate').length;
    const advancedChapters = chapterBreakdown.filter((c) => c.book === 'Advanced').length;

    // Most missed questions/topics aggregation
    const missedMap = new Map<
      string,
      {
        questionId: string;
        topicLabel: string;
        sentence: string;
        correctAnswer: string;
        explanation: string;
        studentAnswers: string[];
        missCount: number;
      }
    >();

    grammarSessions.forEach((s) => {
      const topicLabel = `${s.book} • ${formatChapterLabel(s.book as any, String(s.chapter))}`;
      const sessionMistakes = Array.isArray(s.mistakes) ? s.mistakes : [];

      sessionMistakes.forEach((m: any) => {
        const qId = String(m.question_id || m.sentence || Math.random());
        const lookup = grammarQuestionsLookup[qId];
        const sentence =
          m.sentence || lookup?.sentence || m.correct_sentence || `Question in ${topicLabel}`;
        const correctAns =
          m.correct_sentence || lookup?.correct_sentence || m.correct_answer || '—';
        const explanation = m.explanation || lookup?.explanation || '';
        const stuAns = String(m.student_answer || '(wrong answer)');

        const existing = missedMap.get(qId);
        if (!existing) {
          missedMap.set(qId, {
            questionId: qId,
            topicLabel,
            sentence,
            correctAnswer: correctAns,
            explanation,
            studentAnswers: [stuAns],
            missCount: 1,
          });
        } else {
          existing.missCount += 1;
          if (!existing.studentAnswers.includes(stuAns)) {
            existing.studentAnswers.push(stuAns);
          }
        }
      });
    });

    const mostMissed = Array.from(missedMap.values()).sort(
      (a, b) => b.missCount - a.missCount
    );

    return {
      totalSessions,
      avgAccuracy,
      maxCombo,
      bestScore,
      totalScore,
      chaptersPracticedCount,
      beginnerChapters,
      intermediateChapters,
      advancedChapters,
      chapterBreakdown,
      mostMissed,
    };
  }, [grammarSessions, grammarQuestionsLookup]);

  /* ---------------------------------------------
     HELPERS
  --------------------------------------------- */

  function getTeacherName(title?: string) {
    if (!title) return 'Unknown';
    const parts = title.split(' - ');
    return parts[parts.length - 1];
  }

  function gradeColor(grade?: number | null) {
    if (!grade) return 'text-muted-foreground';
    if (grade >= 9) return 'text-emerald-600 dark:text-emerald-400';
    if (grade >= 7) return 'text-sky-600 dark:text-sky-400';
    return 'text-amber-500';
  }

  const filteredDirectory = useMemo(() => {
    if (!directorySearch.trim()) return students;
    const q = directorySearch.toLowerCase();
    return students.filter((s) => s.student_name.toLowerCase().includes(q));
  }, [students, directorySearch]);

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ---------- MODE A: ALL STUDENTS DIRECTORY ---------- */

  if (!studentParam) {
    return (
      <div className="space-y-6 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                  Students Directory &amp; Native Quest Progress
                </h1>
                <Badge variant="secondary" className="text-xs">
                  {filteredDirectory.length} Active
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Inspect each student&apos;s 360° card: course progress, exams, class history, and Native Quest game mastery
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Search student..."
              value={directorySearch}
              onChange={(e) => setDirectorySearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* High-Visibility Weekly Ranking Card for Teachers & Admins */}
        <NativeQuestLeaderboardCard
          showSocialMediaButton={true}
          compact={true}
          title="Native Quest Live Ranking"
          subtitle="Weekly student leaderboard — use 'Social Media Rank Card' to screenshot and share weekly champions!"
        />

        {filteredDirectory.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              No students found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDirectory.map((s) => {
              const initials = s.student_name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join('');

              const coursePct = Math.min(
                100,
                Math.round(((s.classes_completed || 0) / TOTAL_COURSE_CLASSES) * 100)
              );
              const nqChapterPct = Math.min(
                100,
                Math.round(((s.nq_chapters_count || 0) / 30) * 100)
              );

              return (
                <Link
                  key={s.student_name}
                  to={`${basePath}?student=${encodeURIComponent(s.student_name)}`}
                >
                  <Card className="group hover:-translate-y-0.5 hover:border-amber-500/40 transition-all cursor-pointer h-full">
                    <CardContent className="p-4 flex flex-col justify-between gap-3.5 h-full">
                      {/* Header: Student Identity */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-2xl bg-sky-500/15 dark:bg-sky-400/15 border border-sky-400/30 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-300 font-bold text-xs">
                            {initials}
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-bold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                              {s.student_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {s.course_type || 'Native English'} • {s.classes_completed || 0}/
                              {TOTAL_COURSE_CLASSES} classes ({coursePct}%)
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>

                      {/* Native Quest Progress Snapshot inside the Student Card */}
                      <div className="rounded-xl bg-amber-500/[0.07] dark:bg-amber-500/10 border border-amber-500/25 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-300 flex items-center gap-1">
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                            Native Quest Progress
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] py-0 bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/30"
                          >
                            {s.nq_chapters_count || 0}/30 Chapters
                          </Badge>
                        </div>

                        {/* Progress Bar for Native Quest Chapters */}
                        <div className="w-full bg-slate-200/70 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all"
                            style={{ width: `${nqChapterPct}%` }}
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 pt-0.5 text-center">
                          <div className="rounded-lg bg-background/60 p-1.5 border border-border/50">
                            <p className="text-[10px] text-muted-foreground">Best Score</p>
                            <p className="text-xs font-extrabold text-amber-600 dark:text-amber-300">
                              {(s.nq_best_score || 0).toLocaleString()}
                            </p>
                          </div>
                          <div className="rounded-lg bg-background/60 p-1.5 border border-border/50">
                            <p className="text-[10px] text-muted-foreground">Quests</p>
                            <p className="text-xs font-extrabold text-foreground">
                              {s.nq_sessions || 0}
                            </p>
                          </div>
                          <div className="rounded-lg bg-background/60 p-1.5 border border-border/50">
                            <p className="text-[10px] text-muted-foreground">Accuracy</p>
                            <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                              {s.nq_sessions ? `${s.nq_avg_accuracy}%` : '—'}
                            </p>
                          </div>
                          <div className="rounded-lg bg-background/60 p-1.5 border border-border/50">
                            <p className="text-[10px] text-muted-foreground">Speaking</p>
                            <p className="text-xs font-extrabold text-purple-600 dark:text-purple-300">
                              {s.speaking_attempts ? `${s.speaking_avg_score}%` : '—'}
                            </p>
                          </div>
                        </div>

                        {s.nq_last_accessed && (
                          <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px] text-muted-foreground font-semibold">
                            <Clock className="w-3 h-3 text-sky-500 shrink-0" />
                            <span>Last played: {format(parseISO(s.nq_last_accessed), 'MMM d, HH:mm')}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ---------- MODE B: STUDENT 360° PROFILE VIEW ---------- */

  const studentInitials = studentParam
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const nqOverallChapterPct = Math.min(
    100,
    Math.round((grammarStats.chaptersPracticedCount / 30) * 100)
  );

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to={basePath}
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all students
        </Link>

        <div className="flex items-center gap-2.5 flex-wrap">
          <UnlockExamDialog
            studentName={studentParam}
            variant="outline"
            size="sm"
          />
        </div>
      </div>

      {/* Student Profile Hero Card */}
      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-sky-400/25 via-sky-500/20 to-blue-500/25 border border-sky-300/60 dark:border-sky-400/35 flex items-center justify-center text-sky-600 dark:text-sky-300 font-extrabold text-xl shrink-0 shadow-sm">
              {studentInitials}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {studentParam}
                </h1>
                <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-400/35">
                  Level {currentLevelInfo.label}
                </Badge>
                {studentInfo?.course_type && (
                  <Badge variant="outline">{studentInfo.course_type}</Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {classesCompletedCount} of {TOTAL_COURSE_CLASSES} classes completed ({progressPercentage}% of full course)
              </p>
            </div>
          </div>

          {/* Upcoming Class Type & Next Chapters */}
          <div className="flex flex-wrap items-center gap-2">
            {upcomingClassType && (
              <div className="liquid-glass-pill rounded-2xl px-3.5 py-2 text-xs">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                  Recommended Next Class
                </span>
                <span className="font-bold text-primary text-sm">
                  {upcomingClassType}
                </span>
              </div>
            )}
            {Object.entries(nextChapters).map(([type, info]) =>
              info ? (
                <div
                  key={type}
                  className="liquid-glass-pill rounded-2xl px-3.5 py-2 text-xs"
                >
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">
                    Next {type}
                  </span>
                  <span className="font-bold text-foreground text-sm">
                    Ch. {info.chapter} ({info.level})
                  </span>
                </div>
              ) : null
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5 Key KPI Cards (including Native Quest Progress) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <Award className="w-4 h-4 text-sky-500" />
              <span>Course Progress</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-2">
              {progressPercentage}%
            </p>
            <div className="w-full bg-slate-200/70 dark:bg-white/10 h-2 rounded-full overflow-hidden mt-2.5">
              <div
                className="bg-gradient-to-r from-sky-400 to-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {classesCompletedCount}/{TOTAL_COURSE_CLASSES} classes completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <Star className="w-4 h-4 text-amber-500" />
              <span>Overall Grade Avg</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-2">
              {skillMetrics.overallAvg > 0
                ? `${skillMetrics.overallAvg.toFixed(1)}/10`
                : '—'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">
              Across {classesCompletedCount} graded classes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <GraduationCap className="w-4 h-4 text-emerald-500" />
              <span>Past Exams</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-2">
              {completedOnlineExams.length + examClasses.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">
              {completedOnlineExams.length} online • {examClasses.length} class exams
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/35 bg-amber-500/[0.04]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300 text-xs font-extrabold uppercase tracking-wider">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Native Quest</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-300 mt-2">
              {grammarStats.bestScore.toLocaleString()}{' '}
              <span className="text-xs font-normal text-muted-foreground">pts</span>
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">
              {grammarStats.totalSessions} quests • {grammarStats.avgAccuracy}% acc •{' '}
              {grammarStats.chaptersPracticedCount}/30 ch.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              <Mic className="w-4 h-4 text-purple-500" />
              <span>Pronunciation</span>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-2">
              {speakingStats.total > 0 ? `${speakingStats.avgScore}%` : '0%'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">
              {speakingStats.total} spoken sentence{speakingStats.total !== 1 ? 's' : ''} evaluated
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Prominent Native Quest Progress Card (Always Visible on Student Card) */}
      <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/[0.06] via-orange-500/[0.04] to-indigo-500/[0.06]">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Native Quest Game Progress &amp; Mastery
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Combined grammar &amp; speaking game performance across all 30 curriculum chapters
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 font-bold">
                Total XP: {grammarStats.totalScore.toLocaleString()} pts
              </Badge>
              <Badge className="bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30 font-bold">
                <Flame className="w-3.5 h-3.5 mr-1" />
                Max Combo: {grammarStats.maxCombo}x
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall 30-Chapter Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>
                Overall Curriculum Chapters Practiced ({grammarStats.chaptersPracticedCount} of 30)
              </span>
              <span className="text-amber-600 dark:text-amber-300 font-bold">
                {nqOverallChapterPct}%
              </span>
            </div>
            <div className="w-full bg-slate-200/70 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${nqOverallChapterPct}%` }}
              />
            </div>
          </div>

          {/* 3 Books Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                level: 'Beginner',
                done: grammarStats.beginnerChapters,
                total: 10,
                color: 'from-emerald-400 to-teal-500',
              },
              {
                level: 'Intermediate',
                done: grammarStats.intermediateChapters,
                total: 10,
                color: 'from-sky-400 to-indigo-500',
              },
              {
                level: 'Advanced',
                done: grammarStats.advancedChapters,
                total: 10,
                color: 'from-amber-400 to-orange-500',
              },
            ].map((bk) => {
              const pct = Math.min(100, Math.round((bk.done / bk.total) * 100));
              return (
                <div
                  key={bk.level}
                  className="rounded-xl bg-background/70 border border-border/60 p-3 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{bk.level} Book</span>
                    <span className="font-semibold text-muted-foreground">
                      {bk.done}/{bk.total} Chapters ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/70 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`bg-gradient-to-r ${bk.color} h-full rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Course Stage Stepper & Skill Averages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CEFR Course Stage Stepper */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>CEFR Course Stage</span>
              <span className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                {currentLevelInfo.label} • {progressPercentage}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {CEFR_LEVELS.map((lvl, idx) => {
                const isCompleted = idx < currentLevelIndex;
                const isCurrent = idx === currentLevelIndex;

                return (
                  <div
                    key={lvl.code}
                    className={cn(
                      'flex flex-col items-center justify-center py-3 px-2 rounded-2xl text-center transition-all border',
                      isCompleted &&
                        'bg-sky-500/10 border-sky-400/30 text-sky-700 dark:text-sky-300',
                      isCurrent &&
                        'liquid-nav-active text-sky-700 dark:text-sky-200 font-bold',
                      !isCompleted &&
                        !isCurrent &&
                        'bg-white/35 dark:bg-white/[0.03] border-white/40 dark:border-white/10 text-muted-foreground'
                    )}
                  >
                    <span className="text-xs sm:text-sm font-extrabold">
                      {lvl.label}
                    </span>
                    <span className="text-[10px] mt-0.5 opacity-80">
                      {isCompleted
                        ? 'Completed'
                        : isCurrent
                          ? 'Current'
                          : 'Upcoming'}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Skill Averages Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Skill Averages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Speaking', val: skillMetrics.speakingAvg },
              { label: 'Listening', val: skillMetrics.listeningAvg },
              { label: 'Grammar', val: skillMetrics.grammarAvg },
              { label: 'Reading', val: skillMetrics.readingAvg },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-20 text-xs font-semibold text-muted-foreground shrink-0">
                  {label}
                </span>
                <div className="flex-1 bg-slate-200/70 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-sky-400 to-blue-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, (val / 10) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-bold text-foreground w-10 text-right">
                  {val > 0 ? val.toFixed(1) : '—'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Segmented Tabs: Class History | Past Exams | Speaking Lab */}
      <Tabs defaultValue="history" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1.5">
          <TabsTrigger value="history" className="gap-2">
            <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <span>Class History ({history.length})</span>
          </TabsTrigger>
          <TabsTrigger value="exams" className="gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              Past Exams ({examSubmissions.length + examClasses.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="speaking" className="gap-2">
            <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Speaking Lab ({speakingAttempts.length})</span>
          </TabsTrigger>
          <TabsTrigger value="grammar_rush" className="gap-2">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Native Quest ({grammarSessions.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CLASS HISTORY */}
        <TabsContent value="history" className="space-y-4 mt-5">
          {history.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No graded classes found for this student.
              </CardContent>
            </Card>
          ) : (
            history.map((cls) => (
              <Card key={cls.id}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {new Date(cls.date).toLocaleDateString()}
                        {cls.time ? ` • ${cls.time}` : ''}
                      </p>
                      <p className="font-bold text-base text-foreground">
                        {cls.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Teacher: {getTeacherName(cls.title)}
                      </p>
                    </div>

                    {cls.class_chapter && cls.class_chapter !== 'N/A' && (
                      <Badge
                        variant="outline"
                        className="w-fit text-sky-700 dark:text-sky-300 border-sky-400/35 bg-sky-500/10"
                      >
                        {cls.class_type} — Chapter {cls.class_chapter} (
                        {cls.class_level})
                      </Badge>
                    )}
                  </div>

                  {/* GRADES */}
                  {cls.is_absent ? (
                    <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-center text-sm font-semibold text-rose-600 dark:text-rose-400">
                      Student was Absent
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center liquid-glass-pill rounded-2xl p-3.5">
                      <div>
                        <p
                          className={`text-lg font-extrabold ${gradeColor(
                            cls.speaking_grade
                          )}`}
                        >
                          {cls.speaking_grade ?? '—'}
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Speaking
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-lg font-extrabold ${gradeColor(
                            cls.listening_grade
                          )}`}
                        >
                          {cls.listening_grade ?? '—'}
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Listening
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-lg font-extrabold ${gradeColor(
                            cls.grammar_grade
                          )}`}
                        >
                          {cls.grammar_grade ?? '—'}
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Grammar
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-lg font-extrabold ${gradeColor(
                            cls.reading_grade
                          )}`}
                        >
                          {cls.reading_grade ?? '—'}
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Reading
                        </p>
                      </div>
                      <div>
                        <p
                          className={`text-lg font-extrabold ${gradeColor(
                            cls.class_grade
                          )}`}
                        >
                          {cls.class_grade ?? '—'}
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          Class
                        </p>
                      </div>
                    </div>
                  )}

                  {/* NOTES */}
                  <div className="bg-white/45 dark:bg-white/[0.04] border border-white/60 dark:border-white/10 p-3.5 rounded-2xl text-sm italic text-foreground/85">
                    “{cls.notes || 'No notes provided.'}”
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* TAB 2: PAST EXAMS */}
        <TabsContent value="exams" className="space-y-4 mt-5">
          {examSubmissions.length === 0 && examClasses.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground space-y-2">
                <GraduationCap className="w-10 h-10 mx-auto opacity-30" />
                <p className="font-semibold text-foreground">
                  No exams recorded for {studentParam} yet
                </p>
                <p className="text-xs">
                  Unlocked or completed online exams and graded class exams will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {examSubmissions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Online Portal Exams
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {examSubmissions.map((sub) => {
                      const isCompleted = !!sub.completed_at;
                      return (
                        <Card key={sub.id}>
                          <CardContent className="p-5 flex flex-col justify-between gap-4 h-full">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-bold text-base text-foreground">
                                  {sub.exams?.title || 'Online Exam'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Level: {sub.exams?.level || 'N/A'} • Chapter{' '}
                                  {sub.exams?.chapter_number ?? 'N/A'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {isCompleted && sub.completed_at
                                    ? `Completed ${format(
                                        parseISO(sub.completed_at),
                                        'MMM d, yyyy'
                                      )}`
                                    : 'Unlocked (Pending completion)'}
                                </p>
                              </div>

                              {isCompleted ? (
                                <Badge
                                  className={cn(
                                    'text-sm px-3 py-1 font-extrabold',
                                    (sub.score || 0) >= 70
                                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                  )}
                                >
                                  {sub.score ?? 0}%
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </div>

                            {isCompleted && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={() => handleInspectExam(sub)}
                              >
                                Inspect Student Answers
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {examClasses.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
                    Graded Live Exam Classes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {examClasses.map((cls) => (
                      <Card key={cls.id}>
                        <CardContent className="p-5 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-base text-foreground">
                                Exam — {cls.class_level || 'Level'}{' '}
                                {cls.class_chapter && cls.class_chapter !== 'N/A'
                                  ? `(Chapter ${cls.class_chapter})`
                                  : ''}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(cls.date).toLocaleDateString()} • Teacher:{' '}
                                {getTeacherName(cls.title)}
                              </p>
                            </div>
                            <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-400/30 font-bold">
                              Grade: {cls.class_grade ?? '—'}/10
                            </Badge>
                          </div>
                          {cls.notes && (
                            <p className="text-xs italic text-muted-foreground pt-1">
                              “{cls.notes}”
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: SPEAKING LAB */}
        <TabsContent value="speaking" className="space-y-4 mt-5">
          {speakingAttempts.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground space-y-2">
                <Mic className="w-10 h-10 mx-auto opacity-30" />
                <p className="font-semibold text-foreground">
                  No Speaking Lab activity recorded yet
                </p>
                <p className="text-xs">
                  When {studentParam} practices pronunciation in the Speaking Lab, their attempts and scores will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Speaking Lab Summary Pills */}
              <Card>
                <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Chapters Practiced ({speakingStats.chapters.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {speakingStats.chapters.map((ch) => (
                        <Badge key={ch} variant="secondary" className="text-xs">
                          <BookOpen className="w-3 h-3 mr-1 text-primary" />
                          {ch}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">High Scores (80%+)</p>
                      <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        {speakingStats.highScores} / {speakingStats.total}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Attempt Cards */}
              <div className="space-y-3">
                {speakingAttempts.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[11px]">
                            {item.book_title} • {item.chapter_title}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {item.created_at
                              ? format(parseISO(item.created_at), 'MMM d, yyyy • h:mm a')
                              : ''}
                          </span>
                        </div>

                        <p className="text-sm font-bold text-foreground">
                          Target: “{item.sentence_text}”
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Spoken:{' '}
                          <span className="italic text-foreground/85">
                            “{item.spoken_text || '—'}”
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => playNativeSpeech(item.sentence_text)}
                          title="Listen to target sentence"
                        >
                          <Volume2 className="w-3.5 h-3.5 mr-1 text-primary" />
                          Target
                        </Button>

                        <div
                          className={cn(
                            'px-3.5 py-1.5 rounded-2xl text-center min-w-[72px] border font-extrabold text-sm',
                            item.score >= 80
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : item.score >= 60
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          )}
                        >
                          {item.score}%
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 4: NATIVE QUEST ANALYTICS */}
        <TabsContent value="grammar_rush" className="space-y-5 mt-5">
          {grammarSessions.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground space-y-2">
                <Zap className="w-10 h-10 mx-auto opacity-30 text-amber-500" />
                <p className="font-semibold text-foreground">
                  No Native Quest sessions recorded yet
                </p>
                <p className="text-xs">
                  When {studentParam} plays Native Quest, their chapter scores, accuracy charts, and most missed grammar points will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Top Summary KPI Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Sessions Played
                      </p>
                      <p className="text-3xl font-extrabold text-foreground mt-1">
                        {grammarStats.totalSessions}
                      </p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-500">
                      <Zap className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Average Accuracy
                      </p>
                      <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                        {grammarStats.avgAccuracy}%
                      </p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-500">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Highest Combo
                      </p>
                      <p className="text-3xl font-extrabold text-amber-500 mt-1">
                        {grammarStats.maxCombo} 🔥
                      </p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-500">
                      <Flame className="w-5 h-5" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recharts Accuracy by Chapter + Best Scores per Chapter */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Accuracy by Chapter Bar Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold">
                      Accuracy by Chapter (%)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[260px] w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={grammarStats.chapterBreakdown}
                          margin={{ top: 10, right: 12, left: -16, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis
                            dataKey="shortLabel"
                            tick={{ fontSize: 11 }}
                            interval={0}
                          />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <RechartsTooltip
                            formatter={(val: any) => [`${val}%`, 'Avg Accuracy']}
                            labelFormatter={(_, payload) =>
                              payload?.[0]?.payload?.label || ''
                            }
                          />
                          <Bar
                            dataKey="avgAccuracy"
                            fill="#0ea5e9"
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Best Scores per Chapter */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span>Best Scores per Chapter</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2.5 max-h-[260px] overflow-y-auto">
                    {grammarStats.chapterBreakdown.map((ch) => (
                      <div
                        key={`${ch.book}_${ch.chapter}`}
                        className="liquid-glass-pill rounded-2xl p-3.5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-foreground">
                            {ch.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {ch.sessionsCount} session{ch.sessionsCount === 1 ? '' : 's'} • Avg accuracy: {ch.avgAccuracy}%
                          </p>
                        </div>
                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/35 font-extrabold text-xs px-3 py-1 shrink-0">
                          {ch.bestScore.toLocaleString()} pts
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Most Missed Questions / Topics */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span>Most Missed Questions & Grammar Points</span>
                    <Badge variant="outline" className="text-xs">
                      {grammarStats.mostMissed.length} unique item
                      {grammarStats.mostMissed.length === 1 ? '' : 's'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {grammarStats.mostMissed.length === 0 ? (
                    <div className="liquid-glass-pill rounded-2xl p-6 text-center text-muted-foreground text-sm">
                      No mistakes recorded across any Native Quest sessions!
                    </div>
                  ) : (
                    grammarStats.mostMissed.slice(0, 15).map((item) => (
                      <div
                        key={item.questionId}
                        className="liquid-glass-pill rounded-2xl p-4 space-y-2 border border-rose-500/20"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[11px]">
                            {item.topicLabel}
                          </Badge>
                          <Badge className="bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30 font-extrabold text-[11px]">
                            Missed {item.missCount}x
                          </Badge>
                        </div>

                        <p className="font-bold text-sm text-foreground">
                          Prompt: “{item.sentence}”
                        </p>

                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold">
                            Student answered: {item.studentAnswers.join(' | ')}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold">
                            Correct: {item.correctAnswer}
                          </span>
                        </div>

                        {item.explanation && (
                          <p className="text-xs text-muted-foreground italic">
                            💡 {item.explanation}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal to Inspect Online Exam Answers */}
      <Dialog
        open={!!inspectingSubmission}
        onOpenChange={(open) => !open && setInspectingSubmission(null)}
      >
        <DialogContent className="max-w-2xl max-h-[82vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6">
              <span>
                {inspectingSubmission?.exams?.title || 'Exam Submission'} —{' '}
                {studentParam}
              </span>
              {inspectingSubmission?.score != null && (
                <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-400/30">
                  Score: {inspectingSubmission.score}%
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {loadingQuestions ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : inspectingQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No question details found for this exam.
            </p>
          ) : (
            <div className="space-y-3 py-2">
              {inspectingQuestions.map((q, idx) => {
                const studentAns =
                  (inspectingSubmission as any)?.answers_json?.[q.id] || '';
                const isCorrect =
                  studentAns.trim().toLowerCase() ===
                  (q.correct_answer || '').trim().toLowerCase();

                return (
                  <div
                    key={q.id}
                    className="liquid-glass-pill rounded-2xl p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">
                        {idx + 1}. {q.question_text}
                      </p>
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-xl font-semibold',
                          isCorrect
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        )}
                      >
                        Student: {studentAns || '(blank)'}
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-sky-500/15 text-sky-700 dark:text-sky-300 font-semibold">
                        Correct: {q.correct_answer}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
