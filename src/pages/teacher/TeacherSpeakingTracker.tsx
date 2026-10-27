import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Mic,
  Volume2,
  TrendingUp,
  Award,
  Users,
  Search,
  RefreshCw,
  Copy,
  AlertCircle,
  Clock,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  User,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { playNativeSpeech } from '@/utils/speechEvaluator';

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

interface StudentSummary {
  studentName: string;
  studentId?: string;
  totalAttempts: number;
  avgScore: number;
  highScoresCount: number;
  chaptersCount: number;
  chapterNames: string[];
  bookTitles: string[];
  lastAttemptAt: string;
  attempts: SpeakingAttempt[];
}

export default function TeacherSpeakingTracker() {
  const [attempts, setAttempts] = useState<SpeakingAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  // Selected student for detailed drill-down breakdown
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<string>('all');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [minScore, setMinScore] = useState<string>('all');

  const fetchAttempts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_speaking_attempts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          setTableMissing(true);
        } else {
          throw error;
        }
      } else {
        setTableMissing(false);
        setAttempts(data || []);
      }
    } catch (err: any) {
      console.error('Error fetching speaking attempts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttempts();
  }, []);

  // Compute student-grouped summaries
  const studentSummaries = useMemo<StudentSummary[]>(() => {
    const map = new Map<string, SpeakingAttempt[]>();

    attempts.forEach((item) => {
      const name = item.student_name?.trim() || 'Anonymous Student';
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name)!.push(item);
    });

    const summaries: StudentSummary[] = [];

    map.forEach((studentAttempts, name) => {
      const total = studentAttempts.length;
      const avg =
        total > 0
          ? Math.round(studentAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / total)
          : 0;
      const high = studentAttempts.filter((a) => a.score >= 80).length;

      // Newest attempts first
      const sortedAttempts = [...studentAttempts].sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });

      const chapterNames = Array.from(new Set(sortedAttempts.map((a) => a.chapter_title)));
      const bookTitles = Array.from(new Set(sortedAttempts.map((a) => a.book_title)));
      const lastAttemptAt = sortedAttempts[0]?.created_at || '';
      const studentId = sortedAttempts[0]?.student_id;

      summaries.push({
        studentName: name,
        studentId,
        totalAttempts: total,
        avgScore: avg,
        highScoresCount: high,
        chaptersCount: chapterNames.length,
        chapterNames,
        bookTitles,
        lastAttemptAt,
        attempts: sortedAttempts,
      });
    });

    // Sort by latest activity
    return summaries.sort((a, b) => {
      const timeA = a.lastAttemptAt ? new Date(a.lastAttemptAt).getTime() : 0;
      const timeB = b.lastAttemptAt ? new Date(b.lastAttemptAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [attempts]);

  // Selected student summary
  const currentStudentSummary = useMemo(() => {
    if (!selectedStudentName) return null;
    return studentSummaries.find((s) => s.studentName === selectedStudentName) || null;
  }, [studentSummaries, selectedStudentName]);

  // Filtered students on the main list
  const filteredStudents = useMemo(() => {
    return studentSummaries.filter((student) => {
      if (selectedBook !== 'all' && !student.bookTitles.includes(selectedBook)) return false;
      if (minScore === 'high' && student.avgScore < 80) return false;
      if (minScore === 'low' && student.avgScore >= 80) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = student.studentName.toLowerCase().includes(query);
        const matchesChapter = student.chapterNames.some((c) => c.toLowerCase().includes(query));
        if (!matchesName && !matchesChapter) return false;
      }

      return true;
    });
  }, [studentSummaries, selectedBook, minScore, searchQuery]);

  // Filtered attempts inside a student's breakdown
  const studentFilteredAttempts = useMemo(() => {
    if (!currentStudentSummary) return [];

    return currentStudentSummary.attempts.filter((item) => {
      if (selectedBook !== 'all' && item.book_title !== selectedBook) return false;
      if (selectedChapter !== 'all' && item.chapter_title !== selectedChapter) return false;
      if (minScore === 'high' && item.score < 80) return false;
      if (minScore === 'low' && item.score >= 80) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSentence = item.sentence_text.toLowerCase().includes(query);
        const matchesSpoken = item.spoken_text.toLowerCase().includes(query);
        const matchesChapter = item.chapter_title.toLowerCase().includes(query);
        if (!matchesSentence && !matchesSpoken && !matchesChapter) return false;
      }

      return true;
    });
  }, [currentStudentSummary, selectedBook, selectedChapter, minScore, searchQuery]);

  // Overall platform statistics
  const stats = useMemo(() => {
    const totalAttempts = attempts.length;
    const uniqueStudents = studentSummaries.length;
    const avgScore =
      totalAttempts > 0
        ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts)
        : 0;
    const highScoresCount = attempts.filter((a) => a.score >= 80).length;
    return { totalAttempts, uniqueStudents, avgScore, highScoresCount };
  }, [attempts, studentSummaries]);

  const copySqlMigration = () => {
    const sql = `CREATE TABLE IF NOT EXISTS public.student_speaking_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT,
    student_name TEXT NOT NULL,
    book_id TEXT NOT NULL,
    book_title TEXT NOT NULL,
    chapter_number INT NOT NULL,
    chapter_title TEXT NOT NULL,
    sentence_id TEXT,
    sentence_text TEXT NOT NULL,
    spoken_text TEXT NOT NULL,
    score INT NOT NULL,
    stars INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_speaking_student_id ON public.student_speaking_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_speaking_created_at ON public.student_speaking_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_speaking_chapter ON public.student_speaking_attempts(book_id, chapter_number);

ALTER TABLE public.student_speaking_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read for all" ON public.student_speaking_attempts FOR SELECT USING (true);
CREATE POLICY "Enable insert for all" ON public.student_speaking_attempts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all" ON public.student_speaking_attempts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all" ON public.student_speaking_attempts FOR DELETE USING (true);`;

    navigator.clipboard.writeText(sql);
    toast.success('SQL migration script copied to clipboard!');
  };

  const formatActivityDate = (dateStr: string) => {
    if (!dateStr) return 'Recently';
    try {
      return format(parseISO(dateStr), 'MMM d, HH:mm');
    } catch {
      return 'Recently';
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Table Missing Alert */}
      {tableMissing && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-sm">Speaking Lab Table Not Created Yet</p>
                <p className="text-xs opacity-90 mt-0.5">
                  To save and track what all students say in Supabase, run this 1-click SQL migration in your Supabase SQL Editor.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={copySqlMigration}
              className="border-amber-400 bg-white dark:bg-amber-900 hover:bg-amber-100 text-xs shrink-0 font-semibold"
            >
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              Copy SQL Migration
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Mic className="w-6 h-6 text-blue-600" />
            Student Speaking & Pronunciation Activity
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor student pronunciation practice and performance across all 40 grammar chapters.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchAttempts}
          className="rounded-xl h-9 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Global Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Attempts
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                <Mic className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-foreground mt-2">{stats.totalAttempts}</p>
            <p className="text-xs text-muted-foreground mt-1">Audio phrases recorded</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Average Score
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
              {stats.avgScore}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Pronunciation accuracy</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Students
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-foreground mt-2">{stats.uniqueStudents}</p>
            <p className="text-xs text-muted-foreground mt-1">Students practicing independently</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                High Mastery (80%+)
              </span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-extrabold text-amber-600 mt-2">{stats.highScoresCount}</p>
            <p className="text-xs text-muted-foreground mt-1">3-Star phrase completions</p>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================== */}
      {/* DRILL-DOWN VIEW: BREAKDOWN FOR SELECTED STUDENT               */}
      {/* ============================================================== */}
      {selectedStudentName && currentStudentSummary ? (
        <div className="space-y-5 animate-in fade-in-50 duration-200">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedStudentName(null);
                setSearchQuery('');
                setSelectedChapter('all');
                setSelectedBook('all');
                setMinScore('all');
              }}
              className="rounded-xl gap-2 font-semibold text-xs h-9 hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Students
            </Button>

            {/* Switch Student Dropdown if multiple students exist */}
            {studentSummaries.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Switch Student:</span>
                <Select
                  value={selectedStudentName}
                  onValueChange={(val) => {
                    setSelectedStudentName(val);
                    setSelectedChapter('all');
                    setSearchQuery('');
                  }}
                >
                  <SelectTrigger className="w-[180px] h-9 rounded-xl text-xs bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {studentSummaries.map((s) => (
                      <SelectItem key={s.studentName} value={s.studentName}>
                        {s.studentName} ({s.totalAttempts} phrases)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Student Profile Header Card */}
          <Card className="rounded-3xl border bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-purple-500/10 border-blue-500/20 shadow-xs overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-extrabold text-2xl shadow-md shrink-0">
                    {getInitials(currentStudentSummary.studentName)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-2xl font-bold text-foreground">
                        {currentStudentSummary.studentName}
                      </h3>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-semibold text-xs border-none">
                        Student Breakdown
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      Last practiced: {formatActivityDate(currentStudentSummary.lastAttemptAt)}
                    </p>
                  </div>
                </div>

                {/* Performance Snapshot */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
                  <div className="p-3 bg-card/90 backdrop-blur rounded-2xl border text-center shadow-xs">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Phrases</p>
                    <p className="text-xl font-extrabold text-foreground mt-0.5">
                      {currentStudentSummary.totalAttempts}
                    </p>
                  </div>

                  <div className="p-3 bg-card/90 backdrop-blur rounded-2xl border text-center shadow-xs">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Avg Accuracy</p>
                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {currentStudentSummary.avgScore}%
                    </p>
                  </div>

                  <div className="p-3 bg-card/90 backdrop-blur rounded-2xl border text-center shadow-xs">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">High Mastery (80%+)</p>
                    <p className="text-xl font-extrabold text-amber-600 mt-0.5">
                      {currentStudentSummary.highScoresCount}
                    </p>
                  </div>

                  <div className="p-3 bg-card/90 backdrop-blur rounded-2xl border text-center shadow-xs">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Chapters</p>
                    <p className="text-xl font-extrabold text-blue-600 mt-0.5">
                      {currentStudentSummary.chaptersCount}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Student Attempts Table with In-Page Filters */}
          <Card className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b bg-muted/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Chapter Filter */}
                <Select value={selectedChapter} onValueChange={setSelectedChapter}>
                  <SelectTrigger className="w-[200px] rounded-xl text-xs h-9 bg-card">
                    <SelectValue placeholder="All Chapters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chapters ({currentStudentSummary.totalAttempts})</SelectItem>
                    {currentStudentSummary.chapterNames.map((chName) => {
                      const count = currentStudentSummary.attempts.filter(
                        (a) => a.chapter_title === chName
                      ).length;
                      return (
                        <SelectItem key={chName} value={chName}>
                          {chName} ({count})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Score Filter */}
                <Select value={minScore} onValueChange={setMinScore}>
                  <SelectTrigger className="w-[140px] rounded-xl text-xs h-9 bg-card">
                    <SelectValue placeholder="All Scores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scores</SelectItem>
                    <SelectItem value="high">Mastered (80%+)</SelectItem>
                    <SelectItem value="low">Needs Work (&lt;80%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search target sentence or spoken text */}
              <Input
                placeholder="Search target phrase or words..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-[260px] rounded-xl text-xs h-9 bg-card"
              />
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="w-[200px]">Chapter</TableHead>
                    <TableHead>Target Sentence</TableHead>
                    <TableHead>What {currentStudentSummary.studentName} Said</TableHead>
                    <TableHead className="text-center w-[90px]">Score</TableHead>
                    <TableHead className="text-right w-[120px]">Date / Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentFilteredAttempts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                        <Mic className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="font-semibold text-foreground">No matching phrases found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try resetting the chapter or score filters.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentFilteredAttempts.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs">
                          <p className="font-semibold text-foreground">{item.chapter_title}</p>
                          <p className="text-[11px] text-muted-foreground">{item.book_title}</p>
                        </TableCell>

                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => playNativeSpeech(item.sentence_text)}
                              title="Listen to native model phrase"
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-950 transition-colors shrink-0 border border-blue-200 dark:border-blue-800"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-semibold text-foreground">
                              "{item.sentence_text}"
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground italic">
                          "{item.spoken_text}"
                        </TableCell>

                        <TableCell className="text-center whitespace-nowrap">
                          <Badge
                            className={`text-xs font-bold ${
                              item.score >= 80
                                ? 'bg-emerald-600 text-white'
                                : item.score >= 60
                                ? 'bg-amber-500 text-white'
                                : 'bg-rose-500 text-white'
                            }`}
                          >
                            {item.score}%
                          </Badge>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap">
                          {formatActivityDate(item.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      ) : (
        /* ============================================================== */
        /* MAIN VIEW: CLEAN STUDENT DIRECTORY (ONE ROW PER STUDENT)        */
        /* ============================================================== */
        <Card className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 sm:p-5 border-b bg-muted/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedBook} onValueChange={setSelectedBook}>
                <SelectTrigger className="w-[180px] rounded-xl text-xs h-9 bg-card">
                  <SelectValue placeholder="All Books" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grammar Books</SelectItem>
                  <SelectItem value="Beginner Grammar">Beginner Grammar</SelectItem>
                  <SelectItem value="Intermediate Grammar">Intermediate Grammar</SelectItem>
                  <SelectItem value="Advanced - Native English (Vol. 3)">Advanced (Vol. 3)</SelectItem>
                  <SelectItem value="Advanced Alumni Grammar (Vol. 2)">Advanced Alumni (Vol. 2)</SelectItem>
                </SelectContent>
              </Select>

              <Select value={minScore} onValueChange={setMinScore}>
                <SelectTrigger className="w-[140px] rounded-xl text-xs h-9 bg-card">
                  <SelectValue placeholder="All Scores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  <SelectItem value="high">High (80%+ avg)</SelectItem>
                  <SelectItem value="low">Needs Work (&lt;80% avg)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="Search student or chapter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[240px] rounded-xl text-xs h-9 bg-card"
            />
          </div>

          {/* Students Directory Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="w-[240px]">Student</TableHead>
                  <TableHead className="text-center w-[130px]">Phrases Spoken</TableHead>
                  <TableHead className="text-center w-[130px]">Avg Accuracy</TableHead>
                  <TableHead>Chapters Practiced</TableHead>
                  <TableHead className="w-[140px]">Latest Activity</TableHead>
                  <TableHead className="text-right w-[150px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground text-sm">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Loading students speaking activity...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-14 text-muted-foreground text-sm">
                      <Mic className="w-9 h-9 mx-auto mb-2 opacity-20" />
                      <p className="font-semibold text-foreground">No students recorded yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        When students practice their pronunciation in the Speaking Lab, each student will appear here with full drill-down analytics.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow
                      key={student.studentName}
                      onClick={() => {
                        setSelectedStudentName(student.studentName);
                        setSearchQuery('');
                        setSelectedChapter('all');
                      }}
                      className="cursor-pointer hover:bg-muted/40 transition-colors group"
                    >
                      {/* Student Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                            {getInitials(student.studentName)}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground group-hover:text-blue-600 transition-colors">
                              {student.studentName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {student.chaptersCount} {student.chaptersCount === 1 ? 'chapter' : 'chapters'} touched
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Total Phrases Spoken */}
                      <TableCell className="text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-bold">
                          <Mic className="w-3.5 h-3.5 text-blue-600" />
                          {student.totalAttempts} {student.totalAttempts === 1 ? 'phrase' : 'phrases'}
                        </div>
                      </TableCell>

                      {/* Average Accuracy */}
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge
                          className={`text-xs font-extrabold ${
                            student.avgScore >= 80
                              ? 'bg-emerald-600 text-white'
                              : student.avgScore >= 60
                              ? 'bg-amber-500 text-white'
                              : 'bg-rose-500 text-white'
                          }`}
                        >
                          {student.avgScore}%
                        </Badge>
                      </TableCell>

                      {/* Chapters Practiced */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {student.chapterNames.slice(0, 3).map((ch) => (
                            <Badge
                              key={ch}
                              variant="secondary"
                              className="text-[10px] font-medium bg-muted text-foreground py-0"
                            >
                              {ch}
                            </Badge>
                          ))}
                          {student.chapterNames.length > 3 && (
                            <span className="text-[10px] font-semibold text-muted-foreground">
                              +{student.chapterNames.length - 3} more
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Latest Activity */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {formatActivityDate(student.lastAttemptAt)}
                        </div>
                      </TableCell>

                      {/* Action Button */}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-xl text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 group-hover:translate-x-0.5 transition-all"
                        >
                          View Breakdown
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
