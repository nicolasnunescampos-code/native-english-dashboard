import React, { useState, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  supabase,
  GrammarBookLevel,
  GrammarGameQuestion,
  GrammarQuestionStatus,
  GrammarQuestionType,
} from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  GRAMMAR_BOOK_LEVELS,
  GRAMMAR_QUESTION_TYPES,
  GRAMMAR_RUSH_BOOKS,
  getGrammarBookMeta,
  getGrammarChapterMeta,
  formatChapterLabel,
  tokenizeSentenceWords,
  BEGINNER_CH1_SEED_QUESTIONS,
} from '@/data/grammarRushCurriculum';
import {
  useGrammarQuestions,
  useGrammarQuestionMutations,
} from '@/hooks/useGrammarRush';
import { GrammarQuestionCard } from '@/components/grammar-rush/GrammarQuestionCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Zap,
  Plus,
  Sparkles,
  CheckCircle2,
  Archive,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  Search,
  CheckCheck,
  Database,
  AlertCircle,
} from 'lucide-react';

// ============================================================
// ZOD VALIDATION SCHEMA FOR QUESTION FORM
// ============================================================
const questionFormSchema = z
  .object({
    book: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    chapter: z.string().min(1, 'Chapter is required'),
    type: z.enum(['true_false_fix', 'fill_gap', 'word_order']),
    sentence: z.string().min(3, 'Sentence must be at least 3 characters'),
    correct_sentence: z.string().min(3, 'Correct sentence is required'),
    has_error: z.boolean().default(true),
    error_word_index: z.number().int().nullable(),
    options_text: z.string(),
    correct_option: z.string(),
    explanation: z
      .string()
      .min(5, 'Provide a concise 1-line explanation')
      .max(240, 'Keep explanation to a single concise line (max 240 chars)'),
    status: z.enum(['draft', 'approved', 'archived']),
  })
  .superRefine((val, ctx) => {
    const parsedOptions = val.options_text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (val.type === 'fill_gap') {
      if (!val.sentence.includes('___')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sentence'],
          message: 'Fill-in-the-gap sentence must include "___" for the blank.',
        });
      }
      if (parsedOptions.length < 3 || parsedOptions.length > 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options_text'],
          message: 'Provide 3 or 4 comma-separated options.',
        });
      }
      if (!val.correct_option.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correct_option'],
          message: 'Correct option is required.',
        });
      }
    }

    if (val.type === 'true_false_fix' && val.has_error) {
      if (val.error_word_index === null || val.error_word_index < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['error_word_index'],
          message: 'Select the incorrect word in the sentence.',
        });
      }
      if (parsedOptions.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options_text'],
          message: 'Provide at least 3 replacement options separated by commas.',
        });
      }
      if (!val.correct_option.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correct_option'],
          message: 'Specify the correct replacement word.',
        });
      }
    }

    if (val.type === 'word_order') {
      if (parsedOptions.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options_text'],
          message: 'Provide at least 3 shuffled word tiles separated by commas.',
        });
      }
    }
  });

type QuestionFormValues = z.infer<typeof questionFormSchema>;

export default function GrammarRushQuestionBank() {
  const { user, role } = useAuth();

  // Filter States
  const [filterBook, setFilterBook] = useState<GrammarBookLevel | 'all'>('all');
  const [filterChapter, setFilterChapter] = useState<string>('all');
  const [filterType, setFilterType] = useState<GrammarQuestionType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<GrammarQuestionStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<GrammarGameQuestion | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<GrammarGameQuestion | null>(null);

  // AI Batch Generator Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiBook, setAiBook] = useState<GrammarBookLevel>('Beginner');
  const [aiChapter, setAiChapter] = useState<string>('2');
  const [aiType, setAiType] = useState<GrammarQuestionType | 'mix'>('mix');
  const [aiCount, setAiCount] = useState<string>('12');
  const [aiInitialStatus, setAiInitialStatus] = useState<'draft' | 'approved'>('draft');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // React Query Data & Mutations
  const {
    data: questions = [],
    isLoading,
    error,
  } = useGrammarQuestions({
    book: filterBook,
    chapter: filterChapter,
    type: filterType,
    status: filterStatus,
  });

  const {
    createQuestion,
    updateQuestion,
    deleteQuestion,
    bulkInsertQuestions,
    bulkUpdateStatus,
  } = useGrammarQuestionMutations();

  // React Hook Form with Zod
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      book: 'Beginner',
      chapter: '1',
      type: 'true_false_fix',
      sentence: '',
      correct_sentence: '',
      has_error: true,
      error_word_index: 0,
      options_text: '',
      correct_option: '',
      explanation: '',
      status: 'draft',
    },
  });

  const watchedType = form.watch('type');
  const watchedBook = form.watch('book');
  const watchedSentence = form.watch('sentence');
  const watchedCorrectSentence = form.watch('correct_sentence');
  const watchedHasError = form.watch('has_error');
  const watchedErrorIdx = form.watch('error_word_index');
  const watchedOptionsText = form.watch('options_text');
  const watchedCorrectOption = form.watch('correct_option');
  const watchedExplanation = form.watch('explanation');

  const formSentenceWords = useMemo(
    () => tokenizeSentenceWords(watchedSentence || ''),
    [watchedSentence]
  );

  // Live preview question object inside the Create/Edit modal
  const liveFormPreviewQuestion = useMemo<GrammarGameQuestion>(() => {
    const opts = (watchedOptionsText || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      id: editingQuestion?.id || 'live-preview',
      book: watchedBook || 'Beginner',
      chapter: form.getValues('chapter') || '1',
      type: watchedType || 'true_false_fix',
      sentence: watchedSentence || 'Example sentence appears here.',
      correct_sentence: watchedCorrectSentence || watchedSentence || 'Example sentence appears here.',
      error_word_index:
        watchedType === 'true_false_fix' && watchedHasError ? watchedErrorIdx : null,
      options: opts,
      correct_option:
        watchedType === 'word_order'
          ? watchedCorrectSentence
          : watchedCorrectOption || opts[0] || '',
      explanation: watchedExplanation || 'One-line explanation appears here.',
      status: form.getValues('status') || 'draft',
    };
  }, [
    editingQuestion,
    watchedBook,
    watchedType,
    watchedSentence,
    watchedCorrectSentence,
    watchedHasError,
    watchedErrorIdx,
    watchedOptionsText,
    watchedCorrectOption,
    watchedExplanation,
    form,
  ]);

  // Filtered list by text search
  const filteredQuestions = useMemo(() => {
    if (!searchQuery.trim()) return questions;
    const q = searchQuery.toLowerCase();
    return questions.filter(
      (item) =>
        item.sentence.toLowerCase().includes(q) ||
        item.correct_sentence.toLowerCase().includes(q) ||
        item.explanation.toLowerCase().includes(q)
    );
  }, [questions, searchQuery]);

  // Summary counts
  const countsSummary = useMemo(() => {
    const approved = filteredQuestions.filter((q) => q.status === 'approved').length;
    const drafts = filteredQuestions.filter((q) => q.status === 'draft').length;
    const archived = filteredQuestions.filter((q) => q.status === 'archived').length;
    return { total: filteredQuestions.length, approved, drafts, archived };
  }, [filteredQuestions]);

  // Open Create / Edit Modal
  const handleOpenCreate = () => {
    setEditingQuestion(null);
    form.reset({
      book: filterBook !== 'all' ? filterBook : 'Beginner',
      chapter: filterChapter !== 'all' ? filterChapter : '1',
      type: filterType !== 'all' ? filterType : 'true_false_fix',
      sentence: '',
      correct_sentence: '',
      has_error: true,
      error_word_index: 0,
      options_text: '',
      correct_option: '',
      explanation: '',
      status: 'draft',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (q: GrammarGameQuestion) => {
    setEditingQuestion(q);
    form.reset({
      book: q.book,
      chapter: String(q.chapter),
      type: q.type,
      sentence: q.sentence,
      correct_sentence: q.correct_sentence,
      has_error: q.error_word_index !== null && q.error_word_index >= 0,
      error_word_index: q.error_word_index ?? 0,
      options_text: (q.options || []).join(', '),
      correct_option: q.correct_option || '',
      explanation: q.explanation || '',
      status: q.status,
    });
    setIsFormOpen(true);
  };

  // Auto-shuffle word tiles helper for word_order
  const handleShuffleFromCorrectSentence = () => {
    const correctSent = form.getValues('correct_sentence').trim();
    if (!correctSent) {
      toast.error('Enter the Correct Sentence first to generate shuffled word tiles.');
      return;
    }
    const words = tokenizeSentenceWords(correctSent);
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    form.setValue('options_text', shuffled.join(', '), { shouldValidate: true });
    form.setValue('sentence', shuffled.join(' / '), { shouldValidate: true });
    form.setValue('correct_option', correctSent, { shouldValidate: true });
  };

  const onSubmitForm = async (values: QuestionFormValues) => {
    try {
      const optionsArray = values.options_text
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: Omit<GrammarGameQuestion, 'id' | 'created_at' | 'updated_at'> = {
        book: values.book,
        chapter: String(values.chapter),
        type: values.type,
        sentence: values.sentence.trim(),
        correct_sentence: values.correct_sentence.trim(),
        error_word_index:
          values.type === 'true_false_fix' && values.has_error
            ? values.error_word_index
            : null,
        options:
          values.type === 'true_false_fix' && !values.has_error ? [] : optionsArray,
        correct_option:
          values.type === 'word_order'
            ? values.correct_sentence.trim()
            : values.type === 'true_false_fix' && !values.has_error
              ? ''
              : values.correct_option.trim(),
        explanation: values.explanation.trim(),
        status: values.status,
        created_by: user?.id || null,
      };

      if (editingQuestion) {
        await updateQuestion.mutateAsync({ id: editingQuestion.id, ...payload });
        toast.success('Question updated!');
      } else {
        await createQuestion.mutateAsync(payload);
        toast.success('Question created!');
      }
      setIsFormOpen(false);
    } catch (err: any) {
      toast.error('Failed to save question: ' + (err.message || 'Unknown error'));
    }
  };

  // Quick status toggle (Approve / Archive / Draft)
  const handleQuickStatus = async (q: GrammarGameQuestion, status: GrammarQuestionStatus) => {
    try {
      await updateQuestion.mutateAsync({ id: q.id, status });
      toast.success(
        status === 'approved'
          ? 'Question approved for students!'
          : status === 'archived'
            ? 'Question archived.'
            : 'Moved to draft.'
      );
    } catch (err: any) {
      toast.error('Status update failed: ' + err.message);
    }
  };

  // Bulk approve all currently visible drafts
  const handleBulkApproveDrafts = async () => {
    const draftIds = filteredQuestions
      .filter((q) => q.status === 'draft')
      .map((q) => q.id);
    if (draftIds.length === 0) return;

    try {
      await bulkUpdateStatus.mutateAsync({ ids: draftIds, status: 'approved' });
      toast.success(`Approved ${draftIds.length} draft questions!`);
    } catch (err: any) {
      toast.error('Bulk approve failed: ' + err.message);
    }
  };

  // 1-Click Seed Beginner Ch. 1 (18 verified questions)
  const handleSeedStarterQuestions = async () => {
    try {
      const items = BEGINNER_CH1_SEED_QUESTIONS.map((q) => ({
        ...q,
        created_by: user?.id || null,
      }));
      await bulkInsertQuestions.mutateAsync(items);
      toast.success('Seeded 18 approved questions for Beginner — Chapter 1 (Verb To Be)!');
    } catch (err: any) {
      toast.error('Failed to seed starter questions: ' + err.message);
    }
  };

  // Generate Batch with AI Edge Function (supports both new grammar_rush mode and deployed generate-quiz)
  const handleGenerateWithAI = async () => {
    setIsGeneratingAi(true);
    try {
      const chMeta = getGrammarChapterMeta(aiBook, aiChapter);
      const batchSize = Math.min(20, Math.max(10, parseInt(aiCount, 10) || 12));
      const chapterTitle = chMeta?.title || `Chapter ${aiChapter}`;
      const grammarFocus = chMeta?.grammarFocus || '';
      const effectiveQuestionType: GrammarQuestionType =
        aiType === 'mix' ? 'fill_gap' : aiType;

      const { data, error: fnError } = await supabase.functions.invoke('generate-quiz', {
        body: {
          mode: 'grammar_rush',
          book: aiBook,
          chapter: aiChapter,
          chapterTitle,
          grammarFocus,
          questionType: effectiveQuestionType,
          count: batchSize,
          // Also include topic & difficulty so the already-deployed generate-quiz function works immediately
          topic: `${chapterTitle} (${grammarFocus}). Make every question a complete English sentence with '___' for the blank and 4 single-word or short-phrase options.`,
          difficulty: aiBook,
        },
      });

      if (fnError) throw fnError;
      if (!data || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error(data?.error || 'AI returned no questions.');
      }

      const typesPool: GrammarQuestionType[] = ['fill_gap', 'true_false_fix', 'word_order'];

      const generatedItems: Omit<GrammarGameQuestion, 'id' | 'created_at' | 'updated_at'>[] =
        data.questions.map((q: any, idx: number) => {
          const targetType: GrammarQuestionType =
            aiType === 'mix' ? typesPool[idx % typesPool.length] : aiType;

          // Case 1: Native grammar_rush format from updated Edge Function
          if (q.sentence && q.correct_sentence && aiType !== 'mix') {
            return {
              book: aiBook,
              chapter: String(aiChapter),
              type: (q.type as GrammarQuestionType) || targetType,
              sentence: String(q.sentence || '').trim(),
              correct_sentence: String(q.correct_sentence || '').trim(),
              error_word_index:
                q.error_word_index !== null && q.error_word_index !== undefined
                  ? Number(q.error_word_index)
                  : null,
              options: Array.isArray(q.options) ? q.options.map(String) : [],
              correct_option: String(q.correct_option || '').trim(),
              explanation:
                String(q.explanation || '').trim() ||
                `Review ${chapterTitle}: ${grammarFocus}`,
              status: aiInitialStatus,
              created_by: user?.id || null,
            };
          }

          // Case 2: Convert from either worksheet format (question_text / correct_answer) or adapt to targetType
          const rawPrompt = String(q.sentence || q.question_text || '').replace(/_{2,}/g, '___').trim();
          const rawAnswer = String(q.correct_option || q.correct_answer || '').trim();
          const rawOptions: string[] = Array.isArray(q.options)
            ? q.options.map((o: any) => String(o).trim()).filter(Boolean)
            : [];

          const fullCorrectSentence = String(
            q.correct_sentence ||
              (rawPrompt.includes('___')
                ? rawPrompt.replace('___', rawAnswer)
                : rawPrompt)
          ).trim();

          const defaultExplanation =
            String(q.explanation || '').trim() ||
            `Correct answer "${rawAnswer}" follows ${chapterTitle} (${grammarFocus}).`;

          if (targetType === 'word_order') {
            const words = tokenizeSentenceWords(fullCorrectSentence);
            const shuffled = [...words].sort(() => Math.random() - 0.5);
            return {
              book: aiBook,
              chapter: String(aiChapter),
              type: 'word_order',
              sentence: shuffled.join(' / '),
              correct_sentence: fullCorrectSentence,
              error_word_index: null,
              options: shuffled,
              correct_option: fullCorrectSentence,
              explanation: defaultExplanation,
              status: aiInitialStatus,
              created_by: user?.id || null,
            };
          }

          if (targetType === 'true_false_fix') {
            const distractors = rawOptions.filter(
              (o) => o.toLowerCase() !== rawAnswer.toLowerCase()
            );
            const makeCorrectSentence = idx % 3 === 0 || distractors.length === 0 || !rawPrompt.includes('___');

            if (makeCorrectSentence) {
              return {
                book: aiBook,
                chapter: String(aiChapter),
                type: 'true_false_fix',
                sentence: fullCorrectSentence,
                correct_sentence: fullCorrectSentence,
                error_word_index: null,
                options: [],
                correct_option: '',
                explanation: `This sentence is already grammatically correct (${chapterTitle}).`,
                status: aiInitialStatus,
                created_by: user?.id || null,
              };
            }

            const wrongWord = distractors[0];
            const wrongSentence = rawPrompt.replace('___', wrongWord);
            const wrongTokens = tokenizeSentenceWords(wrongSentence);
            const cleanWrong = wrongWord.replace(/[.,!?;:]/g, '').toLowerCase();
            let errIdx = wrongTokens.findIndex(
              (w) => w.replace(/[.,!?;:]/g, '').toLowerCase() === cleanWrong
            );
            if (errIdx < 0) errIdx = 0;

            const fixOptions = Array.from(new Set([rawAnswer, ...distractors])).slice(0, 4);

            return {
              book: aiBook,
              chapter: String(aiChapter),
              type: 'true_false_fix',
              sentence: wrongSentence,
              correct_sentence: fullCorrectSentence,
              error_word_index: errIdx,
              options: fixOptions,
              correct_option: rawAnswer,
              explanation: defaultExplanation,
              status: aiInitialStatus,
              created_by: user?.id || null,
            };
          }

          // Default: fill_gap
          const gapSentence = rawPrompt.includes('___')
            ? rawPrompt
            : fullCorrectSentence.replace(new RegExp(`\\b${rawAnswer}\\b`, 'i'), '___');
          const gapOptions =
            rawOptions.length >= 3
              ? rawOptions.slice(0, 4)
              : Array.from(new Set([rawAnswer, ...rawOptions, 'is', 'are', 'do'])).slice(0, 4);

          return {
            book: aiBook,
            chapter: String(aiChapter),
            type: 'fill_gap',
            sentence: gapSentence.includes('___') ? gapSentence : `${fullCorrectSentence} (___)`,
            correct_sentence: fullCorrectSentence,
            error_word_index: null,
            options: gapOptions,
            correct_option: rawAnswer || gapOptions[0] || '',
            explanation: defaultExplanation,
            status: aiInitialStatus,
            created_by: user?.id || null,
          };
        });

      await bulkInsertQuestions.mutateAsync(generatedItems);

      // Set filters so admin immediately sees the newly created questions
      setFilterBook(aiBook);
      setFilterChapter(aiChapter);
      setFilterStatus(aiInitialStatus);
      setIsAiModalOpen(false);
      toast.success(
        aiInitialStatus === 'approved'
          ? `Generated & approved ${generatedItems.length} questions! ${aiBook} Ch. ${aiChapter} is now unlocked for students.`
          : `Generated ${generatedItems.length} draft questions! Review and click "Approve All Drafts" to unlock for students.`
      );
    } catch (err: any) {
      toast.error('AI Generation failed: ' + (err.message || 'Check Edge Function logs'));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const selectedFilterBookMeta =
    filterBook !== 'all' ? getGrammarBookMeta(filterBook) : null;
  const aiBookMeta = getGrammarBookMeta(aiBook);
  const formBookMeta = getGrammarBookMeta(watchedBook || 'Beginner');

  const isTableMissing =
    error &&
    ((error as any).code === '42P01' ||
      (error as any).code === 'PGRST205' ||
      String((error as any).message || '').includes('grammar_game_questions'));

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Missing Migration Banner */}
      {isTableMissing && (
        <Card className="border-amber-400/60 bg-amber-500/10">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-foreground">
                  Native Quest Database Tables Not Created Yet
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Run <code className="px-1.5 py-0.5 rounded bg-muted">supabase/create_grammar_rush_tables.sql</code> and{' '}
                  <code className="px-1.5 py-0.5 rounded bg-muted">supabase/seed_grammar_rush_beginner_ch1.sql</code> in your Supabase SQL Editor.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/25 via-indigo-500/20 to-purple-500/25 border border-sky-400/40 flex items-center justify-center text-sky-600 dark:text-sky-300 shadow-sm shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                Native Quest — Question Bank
              </h1>
              <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/30 text-xs">
                {countsSummary.approved} Approved • {countsSummary.drafts} Drafts
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Create, preview, and approve grammar mini-game questions. Chapters need at least 10 approved questions to unlock for students.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {questions.length === 0 && !isLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedStarterQuestions}
              disabled={bulkInsertQuestions.isPending}
              className="rounded-2xl font-bold text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
            >
              {bulkInsertQuestions.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              Seed Beginner Ch. 1 (18 Qs)
            </Button>
          )}

          {countsSummary.drafts > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkApproveDrafts}
              disabled={bulkUpdateStatus.isPending}
              className="rounded-2xl font-bold text-xs gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
            >
              <CheckCheck className="w-4 h-4" />
              Approve All Drafts ({countsSummary.drafts})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAiModalOpen(true)}
            className="rounded-2xl font-bold text-xs gap-1.5 border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Generate with AI
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="rounded-2xl font-bold text-xs gap-1.5 liquid-btn-primary text-white"
          >
            <Plus className="w-4 h-4" />
            New Question
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1">
            {/* Book Filter */}
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

            {/* Chapter Filter */}
            <Select value={filterChapter} onValueChange={setFilterChapter}>
              <SelectTrigger className="rounded-xl text-xs h-10">
                <SelectValue placeholder="All Chapters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chapters</SelectItem>
                {(selectedFilterBookMeta
                  ? selectedFilterBookMeta.chapters
                  : GRAMMAR_RUSH_BOOKS[0].chapters
                ).map((ch) => (
                  <SelectItem key={ch.chapter} value={ch.chapter}>
                    {selectedFilterBookMeta
                      ? `Ch. ${ch.chapter}: ${ch.title}`
                      : `Chapter ${ch.chapter}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              value={filterType}
              onValueChange={(v) => setFilterType(v as GrammarQuestionType | 'all')}
            >
              <SelectTrigger className="rounded-xl text-xs h-10">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Question Types</SelectItem>
                {GRAMMAR_QUESTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.shortLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as GrammarQuestionStatus | 'all')}
            >
              <SelectTrigger className="rounded-xl text-xs h-10">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="draft">Draft (Needs Review)</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative w-full lg:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              placeholder="Search sentence or rule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/25">
                <TableHead className="w-[150px]">Book / Chapter</TableHead>
                <TableHead className="w-[130px]">Type</TableHead>
                <TableHead>Question Prompt & Correct Sentence</TableHead>
                <TableHead className="w-[110px] text-center">Status</TableHead>
                <TableHead className="w-[210px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-14">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Loading question bank...</p>
                  </TableCell>
                </TableRow>
              ) : filteredQuestions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-14 space-y-3">
                    <Zap className="w-9 h-9 text-muted-foreground/30 mx-auto" />
                    <div>
                      <p className="font-bold text-sm text-foreground">
                        No questions match your current filters
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Create a new question, generate a draft batch with AI, or seed the starter chapter.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuestions.map((q) => {
                  const typeLabel =
                    GRAMMAR_QUESTION_TYPES.find((t) => t.value === q.type)?.shortLabel || q.type;

                  return (
                    <TableRow key={q.id} className="hover:bg-muted/20">
                      <TableCell className="align-top">
                        <Badge variant="outline" className="text-[11px] font-bold">
                          {q.book}
                        </Badge>
                        <p className="text-xs font-semibold text-foreground mt-1">
                          {formatChapterLabel(q.book, q.chapter)}
                        </p>
                      </TableCell>

                      <TableCell className="align-top">
                        <Badge variant="secondary" className="text-[11px] font-semibold">
                          {typeLabel}
                        </Badge>
                      </TableCell>

                      <TableCell className="align-top space-y-1">
                        <p className="font-bold text-sm text-foreground">{q.sentence}</p>
                        {q.correct_sentence !== q.sentence && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            ✓ {q.correct_sentence}
                          </p>
                        )}
                        {q.options && q.options.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {q.options.map((opt, idx) => (
                              <span
                                key={idx}
                                className={`text-[11px] px-2 py-0.5 rounded-md border ${
                                  opt === q.correct_option
                                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold'
                                    : 'bg-muted/50 border-border text-muted-foreground'
                                }`}
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] text-muted-foreground italic pt-0.5">
                          💡 {q.explanation}
                        </p>
                      </TableCell>

                      <TableCell className="align-top text-center">
                        <Badge
                          className={
                            q.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : q.status === 'draft'
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                : 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30'
                          }
                        >
                          {q.status.toUpperCase()}
                        </Badge>
                      </TableCell>

                      <TableCell className="align-top text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl"
                            title="Student Preview"
                            onClick={() => setPreviewQuestion(q)}
                          >
                            <Eye className="w-4 h-4 text-sky-600" />
                          </Button>

                          {q.status !== 'approved' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-xl text-emerald-600 hover:bg-emerald-500/15"
                              title="Approve Question"
                              onClick={() => handleQuickStatus(q, 'approved')}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}

                          {q.status !== 'archived' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-xl text-amber-600 hover:bg-amber-500/15"
                              title="Archive Question"
                              onClick={() => handleQuickStatus(q, 'archived')}
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          )}

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-xl"
                            title="Edit Question"
                            onClick={() => handleOpenEdit(q)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>

                          {role === 'admin' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-xl text-destructive hover:bg-destructive/10"
                              title="Delete Question"
                              onClick={() => {
                                if (window.confirm('Delete this question permanently?')) {
                                  deleteQuestion.mutate(q.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ============================================================ */}
      {/* MODAL 1: STUDENT PREVIEW DIALOG                              */}
      {/* ============================================================ */}
      <Dialog
        open={!!previewQuestion}
        onOpenChange={(open) => !open && setPreviewQuestion(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-sky-500" />
              <span>Student Interactive Preview</span>
            </DialogTitle>
            <DialogDescription>
              Try answering this question below just like a student on a mobile phone.
            </DialogDescription>
          </DialogHeader>

          {previewQuestion && (
            <div className="py-2">
              <GrammarQuestionCard
                question={previewQuestion}
                isPreview={true}
                onAnswer={() => {}}
              />
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            {previewQuestion && previewQuestion.status === 'draft' ? (
              <Button
                onClick={() => {
                  handleQuickStatus(previewQuestion, 'approved');
                  setPreviewQuestion(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Approve Question
              </Button>
            ) : (
              <div />
            )}
            <Button variant="outline" onClick={() => setPreviewQuestion(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL 2: CREATE / EDIT QUESTION WITH LIVE STUDENT PREVIEW    */}
      {/* ============================================================ */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Edit Native Quest Question' : 'Create Native Quest Question'}
            </DialogTitle>
            <DialogDescription>
              All fields are validated with Zod. Test how your question looks in the live student preview on the right.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmitForm)}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-2"
          >
            {/* Left Column: Form Inputs */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Book Level</Label>
                  <Select
                    value={form.watch('book')}
                    onValueChange={(v) =>
                      form.setValue('book', v as GrammarBookLevel, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger className="rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRAMMAR_BOOK_LEVELS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Chapter</Label>
                  <Select
                    value={form.watch('chapter')}
                    onValueChange={(v) => form.setValue('chapter', v, { shouldValidate: true })}
                  >
                    <SelectTrigger className="rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formBookMeta.chapters.map((ch) => (
                        <SelectItem key={ch.chapter} value={ch.chapter}>
                          Ch. {ch.chapter}: {ch.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Status</Label>
                  <Select
                    value={form.watch('status')}
                    onValueChange={(v) =>
                      form.setValue('status', v as GrammarQuestionStatus, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger className="rounded-xl text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Question Type */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Question Mechanic</Label>
                <Select
                  value={watchedType}
                  onValueChange={(v) =>
                    form.setValue('type', v as GrammarQuestionType, { shouldValidate: true })
                  }
                >
                  <SelectTrigger className="rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRAMMAR_QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sentence Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  {watchedType === 'fill_gap'
                    ? 'Sentence with Blank (use ___ for the blank)'
                    : watchedType === 'word_order'
                      ? 'Display Prompt (or auto-fill from Correct Sentence)'
                      : 'Displayed Sentence (with 1 error or already correct)'}
                </Label>
                <Input
                  {...form.register('sentence')}
                  placeholder={
                    watchedType === 'fill_gap'
                      ? 'She ___ my English teacher.'
                      : 'She are my favorite teacher.'
                  }
                  className="rounded-xl text-sm"
                />
                {form.formState.errors.sentence && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.sentence.message}
                  </p>
                )}
              </div>

              {/* Correct Sentence Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Full Correct Sentence</Label>
                  {watchedType === 'word_order' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleShuffleFromCorrectSentence}
                      className="h-6 text-[11px] px-2 rounded-lg"
                    >
                      Auto-Shuffle Tiles
                    </Button>
                  )}
                </div>
                <Input
                  {...form.register('correct_sentence')}
                  placeholder="She is my favorite teacher."
                  className="rounded-xl text-sm"
                />
                {form.formState.errors.correct_sentence && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.correct_sentence.message}
                  </p>
                )}
              </div>

              {/* True/False Fix Specific Controls */}
              {watchedType === 'true_false_fix' && (
                <div className="p-3.5 rounded-2xl bg-muted/40 border space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">
                      Does this sentence contain an error?
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={watchedHasError ? 'default' : 'outline'}
                        onClick={() => form.setValue('has_error', true)}
                        className="h-7 text-xs rounded-xl"
                      >
                        Yes (1 Error)
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={!watchedHasError ? 'default' : 'outline'}
                        onClick={() => {
                          form.setValue('has_error', false);
                          form.setValue('error_word_index', null);
                          form.setValue('correct_sentence', form.getValues('sentence'));
                        }}
                        className="h-7 text-xs rounded-xl"
                      >
                        No (Correct Sentence)
                      </Button>
                    </div>
                  </div>

                  {watchedHasError && formSentenceWords.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-muted-foreground">
                        Click the erroneous word below to set <code className="font-mono">error_word_index</code>:
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {formSentenceWords.map((word, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              form.setValue('error_word_index', idx, { shouldValidate: true })
                            }
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                              watchedErrorIdx === idx
                                ? 'bg-rose-500 text-white border-rose-600'
                                : 'bg-card hover:bg-muted'
                            }`}
                          >
                            {idx}: {word}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Options & Correct Option */}
              {(watchedType !== 'true_false_fix' || watchedHasError) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">
                      {watchedType === 'word_order'
                        ? 'Shuffled Word Tiles (comma-separated)'
                        : 'Options (3–4 comma-separated)'}
                    </Label>
                    <Input
                      {...form.register('options_text')}
                      placeholder={
                        watchedType === 'word_order'
                          ? 'teacher., my, She, is'
                          : 'is, am, are, be'
                      }
                      className="rounded-xl text-xs"
                    />
                    {form.formState.errors.options_text && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.options_text.message}
                      </p>
                    )}
                  </div>

                  {watchedType !== 'word_order' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Correct Option</Label>
                      <Input
                        {...form.register('correct_option')}
                        placeholder="is"
                        className="rounded-xl text-xs"
                      />
                      {form.formState.errors.correct_option && (
                        <p className="text-xs text-destructive">
                          {form.formState.errors.correct_option.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* One-line Explanation */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  One-Line Explanation (Simple English)
                </Label>
                <Textarea
                  {...form.register('explanation')}
                  rows={2}
                  placeholder='Use "is" with the third-person singular subject "she".'
                  className="rounded-xl text-xs"
                />
                {form.formState.errors.explanation && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.explanation.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createQuestion.isPending || updateQuestion.isPending}
                  className="liquid-btn-primary text-white font-bold"
                >
                  {editingQuestion ? 'Save Changes' : 'Create Question'}
                </Button>
              </div>
            </div>

            {/* Right Column: Live Student Preview */}
            <div className="lg:col-span-5 flex flex-col justify-center bg-muted/20 rounded-3xl p-4 border">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center mb-3">
                Live Mobile Student Preview
              </p>
              <GrammarQuestionCard
                question={liveFormPreviewQuestion}
                isPreview={true}
                onAnswer={() => {}}
              />
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* MODAL 3: GENERATE BATCH WITH AI                              */}
      {/* ============================================================ */}
      <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <span>Generate Questions with AI</span>
            </DialogTitle>
            <DialogDescription>
              Produces a batch of 10–20 questions tailored to the book, chapter, and mechanic. All generated questions are saved as <strong>Draft</strong> for human approval.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Book Level</Label>
              <Select
                value={aiBook}
                onValueChange={(v) => {
                  setAiBook(v as GrammarBookLevel);
                  setAiChapter('1');
                }}
              >
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRAMMAR_BOOK_LEVELS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Grammar Chapter</Label>
              <Select value={aiChapter} onValueChange={setAiChapter}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {aiBookMeta.chapters.map((ch) => (
                    <SelectItem key={ch.chapter} value={ch.chapter}>
                      Ch. {ch.chapter}: {ch.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Focus: {getGrammarChapterMeta(aiBook, aiChapter)?.grammarFocus}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Question Type</Label>
              <Select
                value={aiType}
                onValueChange={(v) => setAiType(v as GrammarQuestionType | 'mix')}
              >
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mix">Mix of All 3 Types (Recommended)</SelectItem>
                  {GRAMMAR_QUESTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Batch Size (10–20 questions)</Label>
              <Select value={aiCount} onValueChange={setAiCount}>
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 Questions (Unlocks Chapter)</SelectItem>
                  <SelectItem value="12">12 Questions</SelectItem>
                  <SelectItem value="15">15 Questions</SelectItem>
                  <SelectItem value="20">20 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Initial Status</Label>
              <Select
                value={aiInitialStatus}
                onValueChange={(v) => setAiInitialStatus(v as 'draft' | 'approved')}
              >
                <SelectTrigger className="rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Save as Draft (Review before unlocking)</SelectItem>
                  <SelectItem value="approved">Approve Immediately (Unlock chapter now)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAiModalOpen(false)}
              disabled={isGeneratingAi}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateWithAI}
              disabled={isGeneratingAi}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {aiInitialStatus === 'approved'
                    ? 'Generate & Unlock Chapter'
                    : 'Generate Draft Batch'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
