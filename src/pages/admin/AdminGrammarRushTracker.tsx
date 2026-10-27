import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  supabase,
  GrammarBookLevel,
  GrammarGameSession,
  GrammarGameMistake,
} from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  GRAMMAR_BOOK_LEVELS,
  GRAMMAR_RUSH_BOOKS,
  formatChapterLabel,
  getGrammarBookMeta,
} from '@/data/grammarRushCurriculum';
import { NativeQuestLeaderboardCard } from '@/components/grammar-rush/NativeQuestLeaderboardCard';
import { format, parseISO, startOfWeek } from 'date-fns';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Zap,
  TrendingUp,
  Users,
  Trophy,
  RefreshCw,
  AlertCircle,
  Loader2,
  ExternalLink,
  BookOpen,
  Crown,
  Medal,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { NativeVoiceSettingsModal } from '@/components/grammar-rush/NativeVoiceSettingsModal';

interface EnrichedSession extends GrammarGameSession {
  student_name: string;
}

function normalizeMistakesArray(raw: any): GrammarGameMistake[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function AdminGrammarRushTracker() {
  const { role } = useAuth();
  const [sessions, setSessions] = useState<EnrichedSession[]>([]);
  const [studentsList, setStudentsList] = useState<{ id: string; student_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);

  // Filters
  const [filterBook, setFilterBook] = useState<GrammarBookLevel | 'all'>('all');
  const [filterChapter, setFilterChapter] = useState<string>('all');
  const [filterStudentId, setFilterStudentId] = useState<string>('all');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'week' | 'all'>('week');

  // Selected session for viewing exact student answers/mistakes
  const [selectedSessionForAnswers, setSelectedSessionForAnswers] =
    useState<EnrichedSession | null>(null);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);

  const fetchPlatformAnalytics = async () => {
    setLoading(true);
    try {
      const [sessionsRes, studentsRes] = await Promise.all([
        supabase
          .from('grammar_game_sessions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('students')
          .select('id, student_name')
          .order('student_name', { ascending: true }),
      ]);

      if (sessionsRes.error) {
        if (
          sessionsRes.error.code === '42P01' ||
          sessionsRes.error.code === 'PGRST205'
        ) {
          setTableMissing(true);
          setLoading(false);
          return;
        }
        throw sessionsRes.error;
      }

      setTableMissing(false);
      const stuRows = (studentsRes.data || []) as { id: string; student_name: string }[];
      setStudentsList(stuRows);

      const stuMap = new Map<string, string>();
      stuRows.forEach((s) => {
        if (s.id) stuMap.set(s.id, s.student_name);
      });

      const enriched: EnrichedSession[] = ((sessionsRes.data || []) as any[]).map(
        (s) => ({
          ...s,
          mistakes: normalizeMistakesArray(s.mistakes),
          student_name: stuMap.get(s.student_id) || 'Student',
        })
      );

      setSessions(enriched);
    } catch (err) {
      console.error('Error loading Native Quest tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformAnalytics();
  }, []);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (filterBook !== 'all' && s.book !== filterBook) return false;
      if (filterChapter !== 'all' && String(s.chapter) !== String(filterChapter))
        return false;
      if (filterStudentId !== 'all' && s.student_id !== filterStudentId) return false;
      return true;
    });
  }, [sessions, filterBook, filterChapter, filterStudentId]);

  // Platform KPIs
  const kpis = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const uniqueStudents = new Set(filteredSessions.map((s) => s.student_id)).size;
    const avgAccuracy =
      totalSessions > 0
        ? Math.round(
            filteredSessions.reduce((acc, s) => acc + Number(s.accuracy || 0), 0) /
              totalSessions
          )
        : 0;
    const topScore =
      totalSessions > 0
        ? Math.max(...filteredSessions.map((s) => Number(s.score || 0)))
        : 0;

    return { totalSessions, uniqueStudents, avgAccuracy, topScore };
  }, [filteredSessions]);

  // Student Leaderboard Rankings (1st, 2nd, 3rd...)
  const leaderboardRows = useMemo(() => {
    const weekStartIso = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
    const relevantSessions = filteredSessions.filter((s) => {
      if (leaderboardPeriod === 'week') {
        return s.created_at && s.created_at >= weekStartIso;
      }
      return true;
    });

    const map = new Map<
      string,
      {
        student_id: string;
        student_name: string;
        best_score: number;
        total_points: number;
        best_accuracy: number;
        accuracies: number[];
        best_combo: number;
        games_played: number;
        last_accessed: string;
      }
    >();

    relevantSessions.forEach((s) => {
      const score = Number(s.score || 0);
      const acc = Number(s.accuracy || 0);
      const combo = Number(s.best_combo || 0);
      const createdAt = s.created_at || '';
      const existing = map.get(s.student_id);

      if (!existing) {
        map.set(s.student_id, {
          student_id: s.student_id,
          student_name: s.student_name,
          best_score: score,
          total_points: score,
          best_accuracy: acc,
          accuracies: [acc],
          best_combo: combo,
          games_played: 1,
          last_accessed: createdAt,
        });
      } else {
        existing.games_played += 1;
        existing.total_points += score;
        existing.accuracies.push(acc);
        if (score > existing.best_score) {
          existing.best_score = score;
          existing.best_accuracy = acc;
        }
        if (combo > existing.best_combo) {
          existing.best_combo = combo;
        }
        if (createdAt && (!existing.last_accessed || createdAt > existing.last_accessed)) {
          existing.last_accessed = createdAt;
        }
      }
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        avg_accuracy: Math.round(
          item.accuracies.reduce((a, b) => a + b, 0) / item.accuracies.length
        ),
      }))
      .sort((a, b) => b.best_score - a.best_score || b.avg_accuracy - a.avg_accuracy)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
  }, [filteredSessions, leaderboardPeriod]);

  // Recent Student Answers & Mistakes Feed
  const studentAnswersFeed = useMemo(() => {
    const items: {
      id: string;
      student_name: string;
      book: GrammarBookLevel;
      chapter: string;
      created_at: string;
      sentence: string;
      student_answer: string;
      correct_sentence: string;
      explanation: string;
    }[] = [];

    filteredSessions.forEach((s) => {
      const mistakes = normalizeMistakesArray(s.mistakes);
      mistakes.forEach((m, idx) => {
        items.push({
          id: `${s.id}-${idx}`,
          student_name: s.student_name,
          book: s.book,
          chapter: String(s.chapter),
          created_at: s.created_at,
          sentence: m.sentence || m.correct_sentence || '',
          student_answer: m.student_answer || '(No answer)',
          correct_sentence: m.correct_sentence || m.correct_answer || '',
          explanation: m.explanation || '',
        });
      });
    });

    return items.slice(0, 40);
  }, [filteredSessions]);

  // Chart 1: Sessions per Week
  const weeklyChartData = useMemo(() => {
    const weekMap = new Map<string, { weekKey: string; label: string; sessions: number }>();

    filteredSessions.forEach((s) => {
      if (!s.created_at) return;
      try {
        const dt = parseISO(s.created_at);
        const wkStart = startOfWeek(dt, { weekStartsOn: 1 });
        const weekKey = format(wkStart, 'yyyy-MM-dd');
        const label = `Wk of ${format(wkStart, 'MMM d')}`;
        const existing = weekMap.get(weekKey);
        if (!existing) {
          weekMap.set(weekKey, { weekKey, label, sessions: 1 });
        } else {
          existing.sessions += 1;
        }
      } catch {
        // ignore invalid dates
      }
    });

    return Array.from(weekMap.values())
      .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
      .slice(-8);
  }, [filteredSessions]);

  // Chart 2: Average Accuracy per Chapter (reveals hardest topics)
  const chapterAccuracyData = useMemo(() => {
    const chMap = new Map<
      string,
      {
        key: string;
        shortLabel: string;
        fullLabel: string;
        accuracies: number[];
        sessions: number;
      }
    >();

    filteredSessions.forEach((s) => {
      const key = `${s.book}_${s.chapter}`;
      const shortLabel = `${s.book.slice(0, 3)} Ch.${s.chapter}`;
      const fullLabel = `${s.book} • ${formatChapterLabel(s.book, String(s.chapter))}`;

      const existing = chMap.get(key);
      if (!existing) {
        chMap.set(key, {
          key,
          shortLabel,
          fullLabel,
          accuracies: [Number(s.accuracy || 0)],
          sessions: 1,
        });
      } else {
        existing.accuracies.push(Number(s.accuracy || 0));
        existing.sessions += 1;
      }
    });

    return Array.from(chMap.values())
      .map((item) => ({
        ...item,
        avgAccuracy: Math.round(
          item.accuracies.reduce((a, b) => a + b, 0) / item.accuracies.length
        ),
      }))
      .sort((a, b) => a.avgAccuracy - b.avgAccuracy); // Lowest accuracy (hardest) first
  }, [filteredSessions]);

  const hardestChapter = chapterAccuracyData[0] || null;
  const selectedBookMeta =
    filterBook !== 'all' ? getGrammarBookMeta(filterBook) : GRAMMAR_RUSH_BOOKS[0];

  const profileBaseUrl =
    role === 'admin' ? '/admin/student-history' : '/teacher/students';

  return (
    <div className="space-y-6 pb-14 animate-fade-in">
      {tableMissing && (
        <Card className="border-amber-400/60 bg-amber-500/10">
          <CardContent className="p-5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-bold text-sm">Native Quest Tables Not Created Yet</p>
              <p className="text-xs text-muted-foreground">
                Run <code className="px-1.5 py-0.5 rounded bg-muted">supabase/create_grammar_rush_tables.sql</code> in the Supabase SQL Editor to enable tracking.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/25 via-sky-500/20 to-indigo-500/25 border border-amber-400/40 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
            <Zap className="w-6 h-6 fill-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Native Quest — Leaderboard & Student Answers
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              See who is 1st, 2nd, and 3rd on the leaderboard, track accuracy per chapter, and inspect what students are answering.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {role === 'admin' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setVoiceSettingsOpen(true)}
                className="rounded-xl text-xs font-bold gap-1.5 border-[#4FC3E8]/40 hover:border-[#4FC3E8] text-[#2B2F8F] dark:text-[#4FC3E8] bg-sky-500/5 hover:bg-sky-500/10 cursor-pointer shadow-xs"
                title="Configure OpenAI Studio Human Voice for students"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#4FC3E8] fill-[#4FC3E8]" />
                <span>🎙️ AI Studio Voice</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="rounded-xl text-xs font-bold"
              >
                <Link to="/admin/grammar-rush-questions">
                  <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                  Manage Question Bank
                </Link>
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPlatformAnalytics}
            className="rounded-xl text-xs font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* High-Visibility Social-Media-Ready Weekly Ranking Podium */}
      <NativeQuestLeaderboardCard
        showSocialMediaButton={true}
        title="Native Quest Weekly Ranking & Podium"
        subtitle="Click 'Social Media Rank Card' to open the distraction-free weekly poster for Instagram / WhatsApp screenshots!"
      />

      {/* Filters Bar (Book, Chapter, Student) */}
      <Card>
        <CardContent className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            value={filterBook}
            onValueChange={(v) => {
              setFilterBook(v as GrammarBookLevel | 'all');
              setFilterChapter('all');
            }}
          >
            <SelectTrigger className="rounded-xl text-xs h-10">
              <SelectValue placeholder="All Books" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Books</SelectItem>
              {GRAMMAR_BOOK_LEVELS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterChapter} onValueChange={setFilterChapter}>
            <SelectTrigger className="rounded-xl text-xs h-10">
              <SelectValue placeholder="All Chapters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Chapters</SelectItem>
              {selectedBookMeta.chapters.map((ch) => (
                <SelectItem key={ch.chapter} value={ch.chapter}>
                  {filterBook !== 'all'
                    ? `Ch. ${ch.chapter}: ${ch.title}`
                    : `Chapter ${ch.chapter}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStudentId} onValueChange={setFilterStudentId}>
            <SelectTrigger className="rounded-xl text-xs h-10">
              <SelectValue placeholder="All Students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {studentsList.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.student_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Total Sessions</span>
              <Zap className="w-4 h-4 text-sky-500" />
            </div>
            <p className="text-3xl font-extrabold text-foreground mt-2">
              {kpis.totalSessions}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Rounds completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Avg Accuracy</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
              {kpis.avgAccuracy}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Across filtered rounds</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Active Players</span>
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-3xl font-extrabold text-foreground mt-2">
              {kpis.uniqueStudents}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Unique students</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>Hardest Topic</span>
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-lg font-extrabold text-foreground mt-2 truncate">
              {hardestChapter ? hardestChapter.shortLabel : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {hardestChapter
                ? `${hardestChapter.avgAccuracy}% avg accuracy`
                : 'No data yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ============================================================ */}
      {/* STUDENT LEADERBOARD TABLE (1ST, 2ND, 3RD, POINTS & ACCURACY) */}
      {/* ============================================================ */}
      <Card className="overflow-hidden border-amber-400/35">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-amber-500" />
            <CardTitle className="text-base sm:text-lg font-extrabold">
              Student Leaderboard Rankings (1st, 2nd, 3rd...)
            </CardTitle>
          </div>

          <div className="inline-flex rounded-xl liquid-glass-pill p-1 text-xs font-bold self-start sm:self-center">
            <button
              type="button"
              onClick={() => setLeaderboardPeriod('week')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                leaderboardPeriod === 'week'
                  ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setLeaderboardPeriod('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                leaderboardPeriod === 'all'
                  ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All-Time
            </button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/25">
                <TableHead className="w-[80px] text-center">Place</TableHead>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Best Score</TableHead>
                <TableHead className="text-right">Total Points</TableHead>
                <TableHead className="text-center">Avg Accuracy</TableHead>
                <TableHead className="text-center">Best Combo</TableHead>
                <TableHead className="text-center">Rounds Played</TableHead>
                <TableHead className="text-right pr-4">Last Accessed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-10 text-muted-foreground text-sm"
                  >
                    No student scores recorded for this filter yet.
                  </TableCell>
                </TableRow>
              ) : (
                leaderboardRows.map((entry) => (
                  <TableRow key={entry.student_id} className="hover:bg-muted/20">
                    <TableCell className="text-center font-extrabold">
                      {entry.rank === 1 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400/25 text-amber-600 dark:text-amber-300 border border-amber-400/50">
                          <Crown className="w-4 h-4" />
                        </span>
                      ) : entry.rank === 2 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-300/35 text-slate-700 dark:text-slate-200 border border-slate-400/40">
                          <Medal className="w-4 h-4" />
                        </span>
                      ) : entry.rank === 3 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-400/25 text-orange-700 dark:text-orange-300 border border-orange-400/40">
                          <Medal className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-bold">
                          #{entry.rank}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Link
                        to={`${profileBaseUrl}?student=${encodeURIComponent(
                          entry.student_name
                        )}`}
                        className="font-bold text-sm text-foreground hover:text-primary inline-flex items-center gap-1.5"
                      >
                        <span>{entry.student_name}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    </TableCell>

                    <TableCell className="text-right font-black text-sm text-sky-600 dark:text-sky-400">
                      {entry.best_score.toLocaleString()} pts
                    </TableCell>

                    <TableCell className="text-right font-semibold text-xs text-muted-foreground">
                      {entry.total_points.toLocaleString()} pts
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge
                        className={
                          entry.avg_accuracy >= 80
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : entry.avg_accuracy >= 60
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30'
                        }
                      >
                        {entry.avg_accuracy}%
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center text-xs font-bold text-amber-600 dark:text-amber-400">
                      {entry.best_combo} 🔥
                    </TableCell>

                    <TableCell className="text-center text-xs font-semibold text-muted-foreground">
                      {entry.games_played}
                    </TableCell>

                    <TableCell className="text-right pr-4 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground font-semibold">
                        <Clock className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span>
                          {entry.last_accessed
                            ? format(parseISO(entry.last_accessed), 'MMM d, HH:mm')
                            : '—'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ============================================================ */}
      {/* WHAT STUDENTS ARE ANSWERING (MISTAKES & RESPONSES FEED)      */}
      {/* ============================================================ */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg font-extrabold flex items-center justify-between">
            <span>What Students Are Answering (Recent Mistakes & Answers)</span>
            <Badge variant="outline" className="text-xs">
              {studentAnswersFeed.length} recorded mistake{studentAnswersFeed.length === 1 ? '' : 's'}
            </Badge>
          </CardTitle>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/25">
                <TableHead className="w-[150px]">Student</TableHead>
                <TableHead className="w-[160px]">Chapter</TableHead>
                <TableHead>Student's Answer vs. Correct Sentence</TableHead>
                <TableHead className="w-[120px] text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentAnswersFeed.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-10 text-muted-foreground text-sm"
                  >
                    No wrong answers recorded for the current filter — students answered with 100% accuracy or haven't played yet!
                  </TableCell>
                </TableRow>
              ) : (
                studentAnswersFeed.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell className="align-top font-bold text-sm">
                      {item.student_name}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="outline" className="text-[10px] mr-1">
                        {item.book}
                      </Badge>
                      <p className="text-xs font-semibold text-foreground mt-1">
                        {formatChapterLabel(item.book, item.chapter)}
                      </p>
                    </TableCell>
                    <TableCell className="align-top space-y-1">
                      <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                        ✗ Student answered: <span className="line-through">{item.student_answer}</span>
                      </p>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        ✓ Correct sentence: “{item.correct_sentence}”
                      </p>
                      {item.explanation && (
                        <p className="text-[11px] text-muted-foreground">
                          💡 {item.explanation}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="align-top text-right text-xs text-muted-foreground whitespace-nowrap">
                      {item.created_at
                        ? format(parseISO(item.created_at), 'MMM d, HH:mm')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Charts Grid: Sessions per Week & Average Accuracy per Chapter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">
              Sessions Played per Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyChartData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-xs text-muted-foreground">
                No weekly session data yet.
              </div>
            ) : (
              <div className="h-[250px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyChartData}
                    margin={{ top: 10, right: 12, left: -16, bottom: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <RechartsTooltip />
                    <Bar
                      dataKey="sessions"
                      name="Sessions"
                      fill="#6366f1"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Average Accuracy by Chapter (%)</span>
              <span className="text-xs font-normal text-muted-foreground">
                Sorted hardest → easiest
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chapterAccuracyData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-xs text-muted-foreground">
                No chapter accuracy data yet.
              </div>
            ) : (
              <div className="h-[250px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chapterAccuracyData}
                    margin={{ top: 10, right: 12, left: -16, bottom: 16 }}
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
                        payload?.[0]?.payload?.fullLabel || ''
                      }
                    />
                    <Bar
                      dataKey="avgAccuracy"
                      name="Avg Accuracy"
                      fill="#10b981"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">
            Recent Native Quest Sessions ({filteredSessions.length})
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/25">
                <TableHead>Student</TableHead>
                <TableHead>Book & Chapter</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="text-center">Answered</TableHead>
                <TableHead className="text-center">Accuracy</TableHead>
                <TableHead className="text-center">Answers Detail</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Loading sessions...</p>
                  </TableCell>
                </TableRow>
              ) : filteredSessions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground text-sm"
                  >
                    No sessions found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSessions.slice(0, 100).map((s) => {
                  const mistakesCount = normalizeMistakesArray(s.mistakes).length;
                  return (
                    <TableRow key={s.id} className="hover:bg-muted/20">
                      <TableCell>
                        <Link
                          to={`${profileBaseUrl}?student=${encodeURIComponent(
                            s.student_name
                          )}`}
                          className="font-bold text-sm text-foreground hover:text-primary inline-flex items-center gap-1.5"
                        >
                          <span>{s.student_name}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] mr-1.5">
                          {s.book}
                        </Badge>
                        <span className="text-xs font-semibold text-foreground">
                          {formatChapterLabel(s.book, String(s.chapter))}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-extrabold text-sm">
                        {Number(s.score || 0).toLocaleString()} pts
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold">
                        {s.correct_count}/{s.total_count} correct
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            Number(s.accuracy) >= 80
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : Number(s.accuracy) >= 60
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30'
                          }
                        >
                          {Math.round(Number(s.accuracy || 0))}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSessionForAnswers(s)}
                          className="h-7 rounded-lg text-xs font-semibold gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {mistakesCount > 0
                            ? `View ${mistakesCount} Mistake${mistakesCount === 1 ? '' : 's'}`
                            : 'Flawless'}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {s.created_at
                          ? format(parseISO(s.created_at), 'MMM d, HH:mm')
                          : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Session Answers Detail Modal */}
      <Dialog
        open={!!selectedSessionForAnswers}
        onOpenChange={(open) => !open && setSelectedSessionForAnswers(null)}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSessionForAnswers?.student_name} — Round Answers
            </DialogTitle>
            <DialogDescription>
              {selectedSessionForAnswers
                ? `${selectedSessionForAnswers.book} • ${formatChapterLabel(
                    selectedSessionForAnswers.book,
                    String(selectedSessionForAnswers.chapter)
                  )} • Score: ${Number(
                    selectedSessionForAnswers.score || 0
                  ).toLocaleString()} pts (${
                    selectedSessionForAnswers.correct_count
                  }/${selectedSessionForAnswers.total_count} correct)`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {normalizeMistakesArray(selectedSessionForAnswers?.mistakes).length === 0 ? (
              <div className="liquid-glass-pill rounded-2xl p-6 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="font-bold text-sm">100% Correct — No Mistakes!</p>
                <p className="text-xs text-muted-foreground">
                  {selectedSessionForAnswers?.student_name} answered every question in this round accurately.
                </p>
              </div>
            ) : (
              normalizeMistakesArray(selectedSessionForAnswers?.mistakes).map(
                (m, idx) => (
                  <div
                    key={idx}
                    className="liquid-glass-pill rounded-2xl p-3.5 space-y-1.5 border border-rose-500/25"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Mistake #{idx + 1}
                      </span>
                      <XCircle className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      Student answered: <span className="line-through">{m.student_answer}</span>
                    </p>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      ✓ Correct sentence: “{m.correct_sentence || m.correct_answer}”
                    </p>
                    {m.explanation && (
                      <p className="text-[11px] text-muted-foreground">
                        💡 {m.explanation}
                      </p>
                    )}
                  </div>
                )
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin-only OpenAI Studio Voice Configuration Modal */}
      {role === 'admin' && (
        <NativeVoiceSettingsModal
          open={voiceSettingsOpen}
          onOpenChange={setVoiceSettingsOpen}
        />
      )}
    </div>
  );
}
