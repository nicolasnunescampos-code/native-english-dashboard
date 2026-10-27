import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  supabase,
  GrammarBookLevel,
  GrammarGameQuestion,
  GrammarGameSession,
  GrammarQuestionStatus,
  GrammarQuestionType,
  GrammarRushLeaderboardEntry,
} from '@/lib/supabase';
import { startOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { ALL_CHAPTERS_BUILT_IN_QUESTIONS } from '@/data/grammarRushCurriculum';

const OFFLINE_QUEUE_KEY = 'grammar_rush_offline_queue_v1';

export type NewGrammarSessionPayload = Omit<GrammarGameSession, 'id' | 'created_at'>;

export function getOfflineQueuedSessions(): NewGrammarSessionPayload[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineSession(payload: NewGrammarSessionPayload) {
  try {
    const current = getOfflineQueuedSessions();
    current.push(payload);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to enqueue offline grammar session:', e);
  }
}

export async function flushOfflineGrammarSessions(): Promise<number> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;
  const queue = getOfflineQueuedSessions();
  if (queue.length === 0) return 0;

  const remaining: NewGrammarSessionPayload[] = [];
  let flushedCount = 0;

  for (const item of queue) {
    const { error } = await supabase.from('grammar_game_sessions').insert(item);
    if (error) {
      remaining.push(item);
    } else {
      flushedCount++;
    }
  }

  try {
    if (remaining.length === 0) {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    } else {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
    }
  } catch {
    // ignore storage errors
  }

  return flushedCount;
}

export function useOfflineGrammarSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const syncNow = async () => {
      const count = await flushOfflineGrammarSessions();
      if (count > 0) {
        toast.success(`Synced ${count} offline Native Quest session${count > 1 ? 's' : ''}!`);
        queryClient.invalidateQueries({ queryKey: ['grammar_rush'] });
      }
    };

    syncNow();
    window.addEventListener('online', syncNow);
    return () => window.removeEventListener('online', syncNow);
  }, [queryClient]);
}

function normalizeOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item));
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeQuestionRow(row: any): GrammarGameQuestion {
  return {
    ...row,
    chapter: String(row.chapter),
    error_word_index:
      row.error_word_index === null || row.error_word_index === undefined
        ? null
        : Number(row.error_word_index),
    options: normalizeOptions(row.options),
    correct_option: row.correct_option ?? '',
  };
}

// ============================================================
// QUESTION BANK QUERIES & MUTATIONS (ADMIN / TEACHER)
// ============================================================
export interface QuestionBankFilters {
  book?: GrammarBookLevel | 'all';
  chapter?: string | 'all';
  type?: GrammarQuestionType | 'all';
  status?: GrammarQuestionStatus | 'all';
}

export function useGrammarQuestions(filters: QuestionBankFilters) {
  return useQuery({
    queryKey: ['grammar_rush', 'questions', filters],
    queryFn: async () => {
      let query = supabase
        .from('grammar_game_questions')
        .select('*')
        .order('book', { ascending: true })
        .order('chapter', { ascending: true })
        .order('created_at', { ascending: false });

      if (filters.book && filters.book !== 'all') {
        query = query.eq('book', filters.book);
      }
      if (filters.chapter && filters.chapter !== 'all') {
        query = query.eq('chapter', String(filters.chapter));
      }
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(normalizeQuestionRow);
    },
  });
}

// Approved questions for a specific chapter (Student Round & Lobby)
export function useApprovedChapterQuestions(
  book: GrammarBookLevel,
  chapter: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: ['grammar_rush', 'approved_questions', book, chapter],
    enabled: enabled && !!chapter,
    queryFn: async () => {
      const builtInForChapter = ALL_CHAPTERS_BUILT_IN_QUESTIONS.filter(
        (q) => q.book === book && String(q.chapter) === String(chapter)
      );

      try {
        const { data, error } = await supabase
          .from('grammar_game_questions')
          .select('*')
          .eq('book', book)
          .eq('chapter', String(chapter))
          .eq('status', 'approved');

        if (error) throw error;
        const dbRows = (data || []).map(normalizeQuestionRow);
        const speakingBuiltIns = builtInForChapter.filter((b) => b.type === 'speaking');
        if (dbRows.length >= 10) {
          const hasSpeakingInDb = dbRows.some((r) => r.type === 'speaking');
          return hasSpeakingInDb ? dbRows : [...dbRows, ...speakingBuiltIns];
        }
        // Merge DB rows with built-in chapter questions (avoiding duplicate sentences)
        const existingSentences = new Set(
          dbRows.map((r) => `${r.type}::${r.sentence.toLowerCase()}`)
        );
        const extras = builtInForChapter.filter(
          (b) => !existingSentences.has(`${b.type}::${b.sentence.toLowerCase()}`)
        );
        return [...dbRows, ...extras];
      } catch {
        return builtInForChapter;
      }
    },
  });
}

// Approved question counts grouped by book & chapter
export function useApprovedChapterCounts() {
  return useQuery({
    queryKey: ['grammar_rush', 'approved_counts'],
    queryFn: async () => {
      const counts: Record<string, number> = {};

      // Initialize with built-in chapter question counts so every chapter is ready to play
      ALL_CHAPTERS_BUILT_IN_QUESTIONS.forEach((q) => {
        const key = `${q.book}_${q.chapter}`;
        counts[key] = (counts[key] || 0) + 1;
      });

      try {
        const { data, error } = await supabase
          .from('grammar_game_questions')
          .select('id, book, chapter')
          .eq('status', 'approved');

        if (!error && data) {
          const dbCounts: Record<string, number> = {};
          data.forEach((q: any) => {
            const key = `${q.book}_${q.chapter}`;
            dbCounts[key] = (dbCounts[key] || 0) + 1;
          });
          Object.entries(dbCounts).forEach(([k, v]) => {
            counts[k] = Math.max(counts[k] || 0, v);
          });
        }
      } catch {
        // Use built-in counts on error
      }

      return counts;
    },
  });
}

// Studied grammar chapters from the student's graded classes
export function useStudentStudiedGrammarChapters(studentName?: string | null) {
  return useQuery({
    queryKey: ['grammar_rush', 'studied_chapters', studentName],
    enabled: !!studentName,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('class_level, class_chapter, class_type, class_grade')
        .ilike('student_name', `%${studentName!.trim()}%`)
        .eq('class_type', 'Grammar')
        .not('class_grade', 'is', null);

      if (error) throw error;

      const studied = new Set<string>();
      (data || []).forEach((cls: any) => {
        if (!cls.class_chapter || cls.class_chapter === 'N/A') return;
        const rawLevel = (cls.class_level || 'Beginner').trim();
        const normalizedBook: GrammarBookLevel = rawLevel.includes('Intermediate')
          ? 'Intermediate'
          : rawLevel.includes('Advanced')
            ? 'Advanced'
            : 'Beginner';
        studied.add(`${normalizedBook}_${String(cls.class_chapter).trim()}`);
      });

      return Array.from(studied);
    },
  });
}

// Student's own sessions (for personal bests & dashboard card)
export function useStudentGrammarSessions(studentId?: string | null) {
  return useQuery({
    queryKey: ['grammar_rush', 'student_sessions', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('grammar_game_sessions')
        .select('*')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as GrammarGameSession[];
    },
  });
}

// Leaderboard query using the privacy-safe RPC (supports individual book or 'ALL' books combined)
export function useGrammarLeaderboard(
  book: GrammarBookLevel | 'ALL' = 'ALL',
  chapter: string = 'all',
  timeframe: 'week' | 'all_time' = 'week'
) {
  return useQuery({
    queryKey: ['grammar_rush', 'leaderboard', book, chapter, timeframe],
    queryFn: async () => {
      const weekStartIso =
        timeframe === 'week'
          ? startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString()
          : null;

      const fetchBookRank = async (b: GrammarBookLevel) => {
        const { data, error } = await supabase.rpc('get_grammar_rush_leaderboard', {
          p_book: b,
          p_chapter: chapter === 'all' ? null : chapter,
          p_week_start: weekStartIso,
        });
        if (error) throw error;
        return ((data || []) as any[]).map((row) => ({
          rank: Number(row.rank),
          first_name: String(row.first_name || 'Student'),
          score: Number(row.score || 0),
          accuracy: Number(row.accuracy || 0),
          best_combo: Number(row.best_combo || 0),
          games_played: Number(row.games_played || 1),
          is_current_user: Boolean(row.is_current_user),
        })) as GrammarRushLeaderboardEntry[];
      };

      if (book !== 'ALL') {
        return fetchBookRank(book);
      }

      const [beg, int, adv] = await Promise.all([
        fetchBookRank('Beginner'),
        fetchBookRank('Intermediate'),
        fetchBookRank('Advanced'),
      ]);

      const combinedMap = new Map<
        string,
        {
          first_name: string;
          score: number;
          accuracySum: number;
          entriesCount: number;
          best_combo: number;
          games_played: number;
          is_current_user: boolean;
        }
      >();

      [...beg, ...int, ...adv].forEach((entry) => {
        const key = `${entry.first_name.toLowerCase()}__${entry.is_current_user ? 'me' : 'other'}`;
        const existing = combinedMap.get(key);
        if (!existing) {
          combinedMap.set(key, {
            first_name: entry.first_name,
            score: entry.score,
            accuracySum: entry.accuracy * entry.games_played,
            entriesCount: entry.games_played,
            best_combo: entry.best_combo,
            games_played: entry.games_played,
            is_current_user: entry.is_current_user,
          });
        } else {
          // Accumulate total best score across levels or keep highest score + sum XP
          existing.score = Math.max(existing.score, entry.score);
          existing.accuracySum += entry.accuracy * entry.games_played;
          existing.entriesCount += entry.games_played;
          existing.best_combo = Math.max(existing.best_combo, entry.best_combo);
          existing.games_played += entry.games_played;
          existing.is_current_user = existing.is_current_user || entry.is_current_user;
        }
      });

      const merged = Array.from(combinedMap.values()).map((item) => ({
        rank: 0,
        first_name: item.first_name,
        score: item.score,
        accuracy:
          item.entriesCount > 0
            ? Math.round((item.accuracySum / item.entriesCount) * 10) / 10
            : 0,
        best_combo: item.best_combo,
        games_played: item.games_played,
        is_current_user: item.is_current_user,
      }));

      merged.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return b.best_combo - a.best_combo;
      });

      return merged.map((item, idx) => ({
        ...item,
        rank: idx + 1,
      })) as GrammarRushLeaderboardEntry[];
    },
  });
}

// Mutations for Question Bank CRUD
export function useGrammarQuestionMutations() {
  const queryClient = useQueryClient();

  const invalidateQuestions = () => {
    queryClient.invalidateQueries({ queryKey: ['grammar_rush'] });
  };

  const createQuestion = useMutation({
    mutationFn: async (
      payload: Omit<GrammarGameQuestion, 'id' | 'created_at' | 'updated_at'>
    ) => {
      const { data, error } = await supabase
        .from('grammar_game_questions')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return normalizeQuestionRow(data);
    },
    onSuccess: invalidateQuestions,
  });

  const updateQuestion = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<GrammarGameQuestion> & { id: string }) => {
      const { data, error } = await supabase
        .from('grammar_game_questions')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return normalizeQuestionRow(data);
    },
    onSuccess: invalidateQuestions,
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('grammar_game_questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalidateQuestions,
  });

  const bulkInsertQuestions = useMutation({
    mutationFn: async (
      items: Omit<GrammarGameQuestion, 'id' | 'created_at' | 'updated_at'>[]
    ) => {
      const { data, error } = await supabase
        .from('grammar_game_questions')
        .insert(items)
        .select();
      if (error) throw error;
      return (data || []).map(normalizeQuestionRow);
    },
    onSuccess: invalidateQuestions,
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[];
      status: GrammarQuestionStatus;
    }) => {
      const { error } = await supabase
        .from('grammar_game_questions')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: invalidateQuestions,
  });

  return {
    createQuestion,
    updateQuestion,
    deleteQuestion,
    bulkInsertQuestions,
    bulkUpdateStatus,
  };
}

// Save Session Mutation (with graceful offline queuing)
export function useSaveGrammarSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: NewGrammarSessionPayload) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueOfflineSession(payload);
        return { queuedOffline: true, session: null };
      }

      const { data, error } = await supabase
        .from('grammar_game_sessions')
        .insert(payload)
        .select()
        .single();

      if (error) {
        // Network error or offline drop -> queue locally so student never loses progress
        if (
          error.message?.toLowerCase().includes('fetch') ||
          error.message?.toLowerCase().includes('network') ||
          !navigator.onLine
        ) {
          enqueueOfflineSession(payload);
          return { queuedOffline: true, session: null };
        }
        throw error;
      }

      return { queuedOffline: false, session: data as GrammarGameSession };
    },
    onSuccess: (result) => {
      if (result.queuedOffline) {
        toast.info('You appear to be offline. Your score was saved locally and will sync automatically when back online!');
      } else {
        queryClient.invalidateQueries({ queryKey: ['grammar_rush'] });
      }
    },
  });
}
