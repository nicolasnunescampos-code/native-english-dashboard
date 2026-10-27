import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  supabase,
  GrammarBookLevel,
  GrammarGameMistake,
  GrammarGameQuestion,
} from '@/lib/supabase';
import { toast } from 'sonner';
import {
  GRAMMAR_RUSH_BOOKS,
  getGrammarBookMeta,
  getGrammarChapterMeta,
  ALL_CHAPTERS_BUILT_IN_QUESTIONS,
} from '@/data/grammarRushCurriculum';
import {
  useApprovedChapterCounts,
  useApprovedChapterQuestions,
  useGrammarLeaderboard,
  useOfflineGrammarSync,
  useSaveGrammarSession,
  useStudentGrammarSessions,
  useStudentStudiedGrammarChapters,
} from '@/hooks/useGrammarRush';
import {
  GrammarQuestionCard,
  QuestionAttemptResult,
} from '@/components/grammar-rush/GrammarQuestionCard';
import { NativeQuestLeaderboardCard } from '@/components/grammar-rush/NativeQuestLeaderboardCard';
import { playChime } from '@/utils/speechEvaluator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Trophy,
  Flame,
  Heart,
  Timer,
  Play,
  RotateCcw,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  WifiOff,
  Loader2,
  Home,
  X,
  Volume2,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Duolingo Redesign Components
import { DuolingoTopBar } from '@/components/grammar-rush/DuolingoTopBar';
import { DuolingoMap } from '@/components/grammar-rush/DuolingoMap';
import { DuolingoBottomNav, DuolingoTab } from '@/components/grammar-rush/DuolingoBottomNav';
import { DuolingoGuidebookModal } from '@/components/grammar-rush/DuolingoGuidebookModal';
import { DuolingoQuestsView } from '@/components/grammar-rush/DuolingoQuestsView';
import { DuolingoPracticeView } from '@/components/grammar-rush/DuolingoPracticeView';
import { DuolingoLeaderboardView } from '@/components/grammar-rush/DuolingoLeaderboardView';
import { ChapterNodeData } from '@/components/grammar-rush/DuolingoPathNode';
import { DuolingoChapterModal } from '@/components/grammar-rush/DuolingoChapterModal';
import { ChapterMedalModal } from '@/components/grammar-rush/ChapterMedalModal';
import { FullCertificateModal } from '@/components/grammar-rush/FullCertificateModal';
import { FoxMascot } from '@/components/grammar-rush/DuolingoMascots';
import { CompactNativeQuestRankCard } from '@/components/grammar-rush/CompactNativeQuestRankCard';

const ROUND_DURATION_SECONDS = 75;
const INITIAL_LIVES = 3;
const MIN_APPROVED_QUESTIONS = 10;

function getComboMultiplier(comboCount: number): number {
  if (comboCount >= 10) return 4;
  if (comboCount >= 6) return 3;
  if (comboCount >= 3) return 2;
  return 1;
}

function calculateSpeedBonus(elapsedMs: number): number {
  if (elapsedMs >= 3000) return 0;
  const ratio = Math.max(0, (3000 - elapsedMs) / 3000);
  return Math.round(10 + ratio * 40); // +10 to +50 bonus within 3s
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function StudentGrammarRush() {
  const { user, studentId, studentName } = useAuth();
  const effectiveStudentId = studentId || user?.id || null;

  // Sync any offline queued sessions when online
  useOfflineGrammarSync();

  // Screen State: 'lobby' | 'playing' | 'results'
  const [screen, setScreen] = useState<'lobby' | 'playing' | 'results'>('lobby');
  const [activeTab, setActiveTab] = useState<DuolingoTab>('learn');
  const [selectedBook, setSelectedBook] = useState<GrammarBookLevel>('Beginner');
  const [selectedChapter, setSelectedChapter] = useState<string>('1');
  const [skillMode, setSkillMode] = useState<'mix' | 'grammar' | 'speaking'>('mix');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals state
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [modalTargetChapter, setModalTargetChapter] = useState<string>('1');

  const [guidebookOpen, setGuidebookOpen] = useState(false);
  const [guidebookChapter, setGuidebookChapter] = useState<string>('1');

  const [medalModalOpen, setMedalModalOpen] = useState(false);
  const [medalTargetChapter, setMedalTargetChapter] = useState<string>('1');

  const [fullCertificateOpen, setFullCertificateOpen] = useState(false);

  // Queries for Lobby
  const { data: chapterCounts = {}, isLoading: countsLoading } = useApprovedChapterCounts();
  const { data: studiedChapters = [] } = useStudentStudiedGrammarChapters(studentName);
  const { data: studentSessions = [] } = useStudentGrammarSessions(effectiveStudentId);

  // Fetch approved questions for the selected chapter
  const {
    data: chapterQuestions = [],
    isLoading: questionsLoading,
  } = useApprovedChapterQuestions(selectedBook, selectedChapter, true);

  const saveSessionMutation = useSaveGrammarSession();

  // ============================================================
  // PERSONAL BESTS MAP (by book_chapter)
  // ============================================================
  const personalBests = useMemo(() => {
    const map: Record<string, number> = {};
    studentSessions.forEach((s) => {
      const key = `${s.book}_${s.chapter}`;
      if (map[key] === undefined || s.score > map[key]) {
        map[key] = s.score;
      }
    });
    return map;
  }, [studentSessions]);

  const currentChapterPersonalBest =
    personalBests[`${selectedBook}_${selectedChapter}`] || 0;

  // Total points / Gems
  const totalGems = useMemo(() => {
    const sumBest = Object.values(personalBests).reduce((acc, val) => acc + val, 0);
    return Math.max(350, sumBest + studentSessions.length * 20);
  }, [personalBests, studentSessions]);

  // Streak days count
  const streakCount = useMemo(() => {
    if (studentSessions.length === 0) return 1;
    const uniqueDays = new Set(
      studentSessions.map((s) => (s.created_at ? s.created_at.slice(0, 10) : ''))
    );
    return Math.max(1, uniqueDays.size);
  }, [studentSessions]);

  // Best combo ever
  const bestComboEver = useMemo(() => {
    if (studentSessions.length === 0) return 3;
    return Math.max(3, ...studentSessions.map((s) => s.best_combo || 0));
  }, [studentSessions]);

  // ============================================================
  // DUOLINGO CHAPTERS DATA (Mapped for serpentine winding map)
  // ============================================================
  const chaptersData: ChapterNodeData[] = useMemo(() => {
    const bookMeta = getGrammarBookMeta(selectedBook);

    return bookMeta.chapters.map((ch, idx) => {
      const key = `${selectedBook}_${ch.chapter}`;
      const qCount = chapterCounts[key] || 0;
      const isStudied = studiedChapters.includes(key);
      const chBest = personalBests[key] || 0;

      const chSessions = studentSessions.filter(
        (s) => s.book === selectedBook && String(s.chapter) === String(ch.chapter)
      );
      const maxAcc =
        chSessions.length > 0 ? Math.max(...chSessions.map((s) => s.accuracy)) : 0;

      // Completion percentage calculation (0% to 100%)
      let completionPercent = 0;
      if (chBest >= 500 && maxAcc >= 80) {
        completionPercent = 100;
      } else if (chBest > 0) {
        const scoreRatio = Math.min(1, chBest / 500);
        const accRatio = Math.min(1, maxAcc / 100);
        completionPercent = Math.min(
          99,
          Math.round(Math.max(scoreRatio * 100, (scoreRatio * 0.7 + accRatio * 0.3) * 100))
        );
      } else if (isStudied) {
        completionPercent = 35; // Studied in class, ready to practice!
      }

      // Unlock progression:
      const prevKey = `${selectedBook}_${String(Number(ch.chapter) - 1)}`;
      const prevPlayed = (personalBests[prevKey] || 0) > 0;
      const isUnlocked =
        idx === 0 || prevPlayed || isStudied || qCount >= MIN_APPROVED_QUESTIONS;

      return {
        chapter: ch.chapter,
        chapterNumber: ch.chapterNumber,
        title: ch.title,
        grammarFocus: ch.grammarFocus,
        isUnlocked,
        isActive: String(ch.chapter) === String(selectedChapter),
        isStudied,
        completionPercent,
        personalBest: chBest,
        accuracy: maxAcc,
        questionsCount: qCount,
      };
    });
  }, [
    selectedBook,
    chapterCounts,
    studiedChapters,
    personalBests,
    studentSessions,
    selectedChapter,
  ]);

  const activeChapterModalData = useMemo(() => {
    return chaptersData.find((c) => c.chapter === modalTargetChapter) || chaptersData[0] || null;
  }, [chaptersData, modalTargetChapter]);

  const medalModalChapterData = useMemo(() => {
    return chaptersData.find((c) => c.chapter === medalTargetChapter) || chaptersData[0] || null;
  }, [chaptersData, medalTargetChapter]);

  const currentBookMeta = getGrammarBookMeta(selectedBook);
  const completedChaptersCount = chaptersData.filter((c) => c.completionPercent >= 100).length;

  // ============================================================
  // GAME ROUND STATE
  // ============================================================
  const [roundQuestions, setRoundQuestions] = useState<GrammarGameQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [mistakes, setMistakes] = useState<GrammarGameMistake[]>([]);
  const [lastPointsPopup, setLastPointsPopup] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [savedOfflineFlag, setSavedOfflineFlag] = useState(false);
  const [isSpeakingBusy, setIsSpeakingBusy] = useState(false);

  // Duolingo slide-up feedback drawer state
  const [feedbackDrawer, setFeedbackDrawer] = useState<{
    status: 'correct' | 'wrong';
    message: string;
    subtext?: string;
  } | null>(null);

  const roundStartTimestampRef = useRef<number>(Date.now());
  const roundEndedRef = useRef<boolean>(false);

  const finishRound = useCallback(
    async (
      finalScore: number,
      finalCorrect: number,
      finalTotal: number,
      finalBestCombo: number,
      finalMistakes: GrammarGameMistake[]
    ) => {
      if (roundEndedRef.current) return;
      roundEndedRef.current = true;

      const elapsedSeconds = Math.min(
        ROUND_DURATION_SECONDS,
        Math.max(1, Math.round((Date.now() - roundStartTimestampRef.current) / 1000))
      );

      const accuracyPct =
        finalTotal > 0 ? Number(((finalCorrect / finalTotal) * 100).toFixed(1)) : 0;

      const prevBest = personalBests[`${selectedBook}_${selectedChapter}`] || 0;
      const beatBest = finalScore > prevBest && finalScore > 0;
      setIsNewPersonalBest(beatBest);

      if (soundEnabled && (beatBest || finalScore >= 500)) {
        playChime('celebrate');
      }

      setScreen('results');

      if (effectiveStudentId) {
        try {
          const res = await saveSessionMutation.mutateAsync({
            student_id: effectiveStudentId,
            book: selectedBook,
            chapter: selectedChapter,
            score: finalScore,
            accuracy: accuracyPct,
            correct_count: finalCorrect,
            total_count: finalTotal,
            best_combo: finalBestCombo,
            duration_seconds: elapsedSeconds,
            mistakes: finalMistakes,
          });
          setSavedOfflineFlag(Boolean(res?.queuedOffline));
        } catch (err) {
          console.error('Error saving Native Quest session:', err);
        }
      }
    },
    [
      effectiveStudentId,
      personalBests,
      saveSessionMutation,
      selectedBook,
      selectedChapter,
      soundEnabled,
    ]
  );

  // Start a new round for a chapter
  const handleStartRound = (chapterOverride?: string) => {
    const targetChapter = chapterOverride || selectedChapter;
    if (chapterOverride && chapterOverride !== selectedChapter) {
      setSelectedChapter(chapterOverride);
    }

    const basePoolForChapter =
      targetChapter === selectedChapter && chapterQuestions.length >= MIN_APPROVED_QUESTIONS
        ? chapterQuestions
        : ALL_CHAPTERS_BUILT_IN_QUESTIONS.filter(
            (q) => q.book === selectedBook && String(q.chapter) === String(targetChapter)
          );

    const filteredPool =
      skillMode === 'grammar'
        ? basePoolForChapter.filter((q) => q.type !== 'speaking')
        : skillMode === 'speaking'
          ? basePoolForChapter.filter((q) => q.type === 'speaking')
          : basePoolForChapter;

    const poolToUse = filteredPool.length > 0 ? filteredPool : basePoolForChapter;
    if (poolToUse.length === 0) return;

    const shuffled = shuffleArray(poolToUse);
    setRoundQuestions(shuffled);
    setCurrentIndex(0);
    setTimeLeft(ROUND_DURATION_SECONDS);
    setLives(INITIAL_LIVES);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setCorrectCount(0);
    setTotalAnswered(0);
    setMistakes([]);
    setLastPointsPopup(null);
    setIsTransitioning(false);
    setIsNewPersonalBest(false);
    setSavedOfflineFlag(false);
    setIsSpeakingBusy(false);
    setFeedbackDrawer(null);
    roundStartTimestampRef.current = Date.now();
    roundEndedRef.current = false;
    setScreen('playing');
  };

  // 75-second countdown timer (pauses during speaking questions)
  const activeQuestionType = roundQuestions[currentIndex]?.type;
  useEffect(() => {
    if (screen !== 'playing') return;
    if (activeQuestionType === 'speaking' || isSpeakingBusy) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, activeQuestionType, isSpeakingBusy]);

  // Trigger end of round if timer reaches 0
  useEffect(() => {
    if (screen === 'playing' && timeLeft === 0 && !roundEndedRef.current) {
      finishRound(score, correctCount, totalAnswered, bestCombo, mistakes);
    }
  }, [screen, timeLeft, score, correctCount, totalAnswered, bestCombo, mistakes, finishRound]);

  // "Can't speak right now" handler
  const handleSkipSpeaking = () => {
    if (roundEndedRef.current) return;
    toast.info('Microphone skipped for this round — continuing with grammar exercises!');

    const remainingGrammar = roundQuestions.filter(
      (q, idx) => idx < currentIndex || q.type !== 'speaking'
    );

    if (currentIndex >= remainingGrammar.length) {
      finishRound(score, correctCount, totalAnswered, bestCombo, mistakes);
    } else {
      setRoundQuestions(remainingGrammar);
    }
  };

  // Handle Student Answer on Active Question
  const handleQuestionAnswer = (result: QuestionAttemptResult) => {
    if (isTransitioning || roundEndedRef.current) return;
    setIsTransitioning(true);

    const currentQ = roundQuestions[currentIndex];

    if (currentQ?.type === 'speaking') {
      const bookIdMap: Record<GrammarBookLevel, string> = {
        Beginner: 'beginner-grammar',
        Intermediate: 'intermediate-grammar',
        Advanced: 'advanced-vol3',
      };
      supabase
        .from('student_speaking_attempts')
        .insert({
          student_id: effectiveStudentId,
          student_name: studentName || 'Student',
          book_id: bookIdMap[selectedBook],
          book_title: `${selectedBook} Grammar`,
          chapter_number: Number(selectedChapter),
          chapter_title: `Chapter ${selectedChapter}`,
          sentence_id: currentQ.id,
          sentence_text: currentQ.correct_sentence || currentQ.sentence,
          spoken_text: result.studentAnswer,
          score: result.speakingScore ?? (result.isCorrect ? 90 : 45),
          stars: result.speakingStars ?? (result.isCorrect ? 3 : 1),
        })
        .then(() => {});
    }

    const nextTotal = totalAnswered + 1;
    let nextScore = score;
    let nextCorrect = correctCount;
    let nextCombo = combo;
    let nextBestCombo = bestCombo;
    let nextLives = lives;
    let nextMistakes = mistakes;

    if (result.isCorrect) {
      if (soundEnabled) playChime('success');
      nextCorrect += 1;
      nextCombo += 1;
      if (nextCombo > nextBestCombo) {
        nextBestCombo = nextCombo;
      }

      const multiplier = getComboMultiplier(nextCombo);
      const speedBonus = calculateSpeedBonus(result.elapsedMs);
      const pointsEarned = 100 * multiplier + speedBonus;
      nextScore += pointsEarned;

      setLastPointsPopup(
        `+${pointsEarned}${multiplier > 1 ? ` (x${multiplier})` : ''}${
          speedBonus > 0 ? ` ⚡+${speedBonus}` : ''
        }`
      );

      // Slide-up correct drawer in brand colors
      setFeedbackDrawer({
        status: 'correct',
        message: '✓ EXCELLENT!',
        subtext: `+${pointsEarned} XP • Streak x${multiplier}`,
      });
    } else {
      if (soundEnabled) playChime('try-again');
      nextCombo = 0;
      nextLives = Math.max(0, lives - 1);
      setLastPointsPopup(null);

      const mistakeEntry: GrammarGameMistake = {
        question_id: currentQ.id,
        question_type: currentQ.type,
        sentence: currentQ.sentence,
        student_answer: result.studentAnswer,
        correct_answer: result.correctAnswer,
        correct_sentence: currentQ.correct_sentence,
        explanation: currentQ.explanation,
      };
      nextMistakes = [...mistakes, mistakeEntry];

      // Slide-up mistake drawer
      setFeedbackDrawer({
        status: 'wrong',
        message: '✕ CORRECT SOLUTION:',
        subtext: currentQ.correct_sentence || result.correctAnswer,
      });
    }

    setScore(nextScore);
    setCorrectCount(nextCorrect);
    setTotalAnswered(nextTotal);
    setCombo(nextCombo);
    setBestCombo(nextBestCombo);
    setLives(nextLives);
    setMistakes(nextMistakes);

    const delayMs = result.isCorrect ? 650 : 1250;

    setTimeout(() => {
      if (roundEndedRef.current) return;
      setFeedbackDrawer(null);

      if (nextLives <= 0 || currentIndex + 1 >= roundQuestions.length) {
        finishRound(nextScore, nextCorrect, nextTotal, nextBestCombo, nextMistakes);
      } else {
        setCurrentIndex((prev) => prev + 1);
        setLastPointsPopup(null);
        setIsTransitioning(false);
      }
    }, delayMs);
  };

  const handleOpenChapterModal = (chapter: string) => {
    setSelectedChapter(chapter);
    setModalTargetChapter(chapter);
    setChapterModalOpen(true);
  };

  const handleOpenGuidebook = (chapter?: string) => {
    setGuidebookChapter(chapter || selectedChapter);
    setGuidebookOpen(true);
  };

  const handleOpenMedal = (chapter?: string) => {
    setMedalTargetChapter(chapter || selectedChapter);
    setMedalModalOpen(true);
  };

  // ============================================================
  // SCREEN 2: ACTIVE GAMEPLAY ROUND (Brand Native English Colors)
  // ============================================================
  if (screen === 'playing') {
    const activeQuestion = roundQuestions[currentIndex];
    const currentMultiplier = getComboMultiplier(combo);
    const progressPercent = Math.min(
      100,
      Math.round(((currentIndex + 1) / (roundQuestions.length || 1)) * 100)
    );

    return (
      <div className="max-w-md mx-auto space-y-4 pb-28 pt-2 select-none">
        {/* Top Game Bar in Brand Styling */}
        <div className="flex items-center justify-between gap-3 px-2">
          {/* Circular 'X' Exit Button */}
          <button
            type="button"
            onClick={() => {
              roundEndedRef.current = true;
              setScreen('lobby');
            }}
            className="w-9 h-9 rounded-full bg-[#E6EEFA] dark:bg-[#161F3B] hover:bg-[#BAC9E2] flex items-center justify-center text-[#2B2F8F] dark:text-[#4FC3E8] transition-all shrink-0 focus:outline-none cursor-pointer"
            title="Quit Quest"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Smooth Azul claro Progress Bar (#4FC3E8) */}
          <div className="flex-1 h-3.5 rounded-full bg-[#E6EEFA] dark:bg-[#161F3B] overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#4FC3E8] to-[#2B2F8F] rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Combo Multiplier Flame */}
          {combo > 0 && (
            <div className="flex items-center gap-1 text-xs font-black text-amber-500 animate-pulse shrink-0">
              <Flame className="w-4 h-4 fill-amber-500" />
              <span>x{currentMultiplier}</span>
            </div>
          )}

          {/* Hearts (Lives) */}
          <div className="flex items-center gap-1 shrink-0">
            {[1, 2, 3].map((heartIdx) => (
              <Heart
                key={heartIdx}
                className={cn(
                  'w-5 h-5 transition-all duration-300',
                  heartIdx <= lives
                    ? 'text-rose-500 fill-rose-500 scale-100'
                    : 'text-slate-300 dark:text-[#1F2B52] scale-75'
                )}
              />
            ))}
          </div>
        </div>

        {/* Timer & Score Pill */}
        <div className="flex items-center justify-between px-3 text-xs font-extrabold text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-[#4FC3E8]" />
            <span>{timeLeft}s remaining</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Score:</span>
            <span className="font-black text-foreground text-sm">
              {score.toLocaleString()} pts
            </span>
            {lastPointsPopup && (
              <Badge className="bg-[#2B2F8F] text-white font-black text-[10px] animate-bounce px-1.5 py-0 border border-[#4FC3E8]/40">
                {lastPointsPopup}
              </Badge>
            )}
          </div>
        </div>

        {/* Active Question Card */}
        {activeQuestion && (
          <div className="px-1">
            <GrammarQuestionCard
              question={activeQuestion}
              onAnswer={handleQuestionAnswer}
              onSkipSpeaking={handleSkipSpeaking}
              onSpeakingBusyChange={setIsSpeakingBusy}
              disabled={isTransitioning}
            />
          </div>
        )}

        {/* Slide-Up Feedback Drawer in Brand Colors */}
        {feedbackDrawer && (
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 p-4 transition-transform duration-200 ${
              feedbackDrawer.status === 'correct'
                ? 'bg-[#E6EEFA] dark:bg-[#141C38] text-[#2B2F8F] dark:text-[#4FC3E8] border-t-2 border-[#4FC3E8]'
                : 'bg-[#ffdfe0] dark:bg-[#3b1517] text-[#ea2b2b] dark:text-[#ff4b4b] border-t-2 border-[#ea2b2b]'
            }`}
          >
            <div className="max-w-md mx-auto flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="font-black text-base sm:text-lg flex items-center gap-2">
                  {feedbackDrawer.status === 'correct' ? (
                    <CheckCircle2 className="w-5 h-5 fill-current" />
                  ) : (
                    <XCircle className="w-5 h-5 fill-current" />
                  )}
                  <span>{feedbackDrawer.message}</span>
                </p>
                {feedbackDrawer.subtext && (
                  <p className="text-xs font-bold opacity-90 line-clamp-1">
                    {feedbackDrawer.subtext}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // SCREEN 3: RESULTS SCREEN (Brand Azul-marinho & Azul claro)
  // ============================================================
  if (screen === 'results') {
    const finalAccuracy =
      totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const earnedStars =
      score >= 500 && finalAccuracy >= 80 ? 3 : score >= 250 ? 2 : 1;

    return (
      <div className="max-w-md mx-auto space-y-6 pb-28 pt-4 px-2 select-none animate-in fade-in zoom-in-95 duration-300">
        {/* Mascot Cheering */}
        <div className="text-center space-y-3">
          <FoxMascot mood="cheering" className="w-28 h-28 mx-auto drop-shadow-lg animate-duo-wiggle" />

          {isNewPersonalBest && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs px-3 py-1 shadow-sm animate-bounce">
              🏆 NEW PERSONAL BEST!
            </Badge>
          )}

          <h2 className="text-3xl font-black text-foreground">
            Chapter Cleared!
          </h2>
          <p className="text-xs font-semibold text-muted-foreground">
            {selectedBook} • Chapter {selectedChapter}
          </p>
        </div>

        {/* 3 Result KPI Tiles in Brand Support Color */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-[#E6EEFA] dark:bg-[#161F3B] border border-[#BAC9E2]/60 dark:border-transparent text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#2B2F8F] dark:text-[#4FC3E8]">
              Total XP
            </p>
            <p className="text-2xl font-black text-[#2B2F8F] dark:text-[#4FC3E8]">
              {score.toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-muted-foreground">Points</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#E6EEFA] dark:bg-[#161F3B] border border-[#BAC9E2]/60 dark:border-transparent text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#2B2F8F] dark:text-[#4FC3E8]">
              Accuracy
            </p>
            <p className="text-2xl font-black text-emerald-500">
              {finalAccuracy}%
            </p>
            <p className="text-[10px] font-bold text-muted-foreground">
              {correctCount}/{totalAnswered}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#E6EEFA] dark:bg-[#161F3B] border border-[#BAC9E2]/60 dark:border-transparent text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Best Combo
            </p>
            <p className="text-2xl font-black text-amber-500">
              {bestCombo} 🔥
            </p>
            <p className="text-[10px] font-bold text-muted-foreground">Streak</p>
          </div>
        </div>

        {/* Action Buttons in Brand Colors (NO green button!) */}
        <div className="space-y-2.5 pt-1">
          {/* View Chapter Medal Button */}
          <button
            type="button"
            onClick={() => handleOpenMedal(selectedChapter)}
            className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_0_#b45309] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            <Award className="w-4 h-4" />
            <span>Claim Chapter Completion Medal 🏅</span>
          </button>

          <button
            type="button"
            onClick={() => setScreen('lobby')}
            className="w-full h-12 rounded-2xl native-btn-primary font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_5px_0_#1C2068] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            <span>CONTINUE TO MAP</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => handleStartRound()}
            className="w-full h-11 rounded-2xl native-btn-accent font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_0_#289FCE] active:translate-y-1 active:shadow-none cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again to Improve Score</span>
          </button>
        </div>

        {/* Mistake Review Collapsible */}
        {mistakes.length > 0 && (
          <div className="p-4 rounded-3xl bg-muted/30 dark:bg-[#161F3B] border border-slate-200 dark:border-[#202E5A] space-y-2.5">
            <h4 className="font-black text-xs uppercase tracking-wider text-muted-foreground">
              Review Mistakes ({mistakes.length})
            </h4>
            <div className="space-y-2">
              {mistakes.map((m, idx) => (
                <div
                  key={`${m.question_id}-${idx}`}
                  className="p-3 rounded-2xl bg-white dark:bg-[#0E1428] border border-rose-500/30 space-y-1 text-xs"
                >
                  <p className="text-rose-500 font-bold">
                    Your answer: <span className="line-through">{m.student_answer}</span>
                  </p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                    ✓ Correct: {m.correct_sentence || m.correct_answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // SCREEN 1: LOBBY SCREEN (Duolingo Style Map & Balanced Desktop Layout)
  // ============================================================
  return (
    <div className="min-h-screen bg-transparent transition-colors">
      {/* 1. Duolingo Sticky Top Bar */}
      <DuolingoTopBar
        selectedBook={selectedBook}
        onSelectBook={(b) => {
          setSelectedBook(b);
          setSelectedChapter('1');
        }}
        streakCount={streakCount}
        gemsCount={totalGems}
        heartsCount={INITIAL_LIVES}
        maxHearts={INITIAL_LIVES}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
      />

      {/* 2. Main Layout Content (Balanced 2-Column on Desktop, Single-column on Mobile) */}
      <main className="px-3 pt-3 max-w-6xl mx-auto">
        {activeTab === 'learn' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT / CENTER COLUMN: The Serpentine Winding Map */}
            <div className="lg:col-span-8 flex justify-center">
              <DuolingoMap
                book={selectedBook}
                chaptersData={chaptersData}
                selectedChapter={selectedChapter}
                onSelectChapter={handleOpenChapterModal}
                onOpenGuidebook={handleOpenGuidebook}
                onOpenFullCertificate={() => setFullCertificateOpen(true)}
              />
            </div>

            {/* RIGHT COLUMN (DESKTOP ONLY): Persistent Native English Quest Hub */}
            <div className="hidden lg:flex lg:col-span-4 flex-col gap-5 sticky top-20 pb-20">
              {/* Live Ranking Board (Stays visible right next to the student as they scroll down the map) */}
              <CompactNativeQuestRankCard showPlayButton={false} />

              {/* Level Certificate Card */}
              <div className="rounded-3xl p-5 bg-gradient-to-br from-[#2B2F8F] via-[#353AA6] to-[#2B2F8F] text-white shadow-lg space-y-3 border border-[#4FC3E8]/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#4FC3E8]/20 text-[#4FC3E8] border border-[#4FC3E8]/40">
                    Certification
                  </span>
                  <Trophy className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">
                    {selectedBook} Quest Certificate
                  </h3>
                  <p className="text-xs text-white/80 font-medium">
                    Master all 10 chapters to earn your verified diploma.
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-bold text-white/90">
                    <span>Progress:</span>
                    <span>{completedChaptersCount}/10 Chapters</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/25 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#4FC3E8] to-amber-300 rounded-full transition-all duration-500"
                      style={{ width: `${(completedChaptersCount / 10) * 100}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFullCertificateOpen(true)}
                  className="w-full h-10 rounded-2xl native-btn-accent font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_0_#289FCE] mt-2 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>{completedChaptersCount >= 10 ? 'View Full Certificate 🎓' : 'Certificate Details'}</span>
                </button>
              </div>

              {/* Active Chapter Snapshot Card */}
              <div className="rounded-3xl p-5 bg-white dark:bg-[#0E1428] border-2 border-[#2B2F8F]/20 dark:border-[#1E294B] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Selected Unit
                  </span>
                  <Badge variant="outline" className="text-[10px] font-black border-[#4FC3E8] text-[#2B2F8F] dark:text-[#4FC3E8]">
                    Ch. {selectedChapter}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-black text-base text-foreground">
                    {chaptersData.find((c) => c.chapter === selectedChapter)?.title || `Chapter ${selectedChapter}`}
                  </h4>
                  <p className="text-xs text-muted-foreground font-medium line-clamp-2">
                    {chaptersData.find((c) => c.chapter === selectedChapter)?.grammarFocus}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenChapterModal(selectedChapter)}
                  className="w-full h-11 rounded-2xl native-btn-primary font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_0_#1C2068] cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Practice Session</span>
                </button>
              </div>

              {/* Mascot Tip Card */}
              <div className="rounded-3xl p-4 bg-[#E6EEFA]/60 dark:bg-[#141C38] border border-[#BAC9E2]/60 dark:border-[#202E5A] flex items-center gap-3">
                <FoxMascot mood="coaching" className="w-16 h-16 shrink-0 drop-shadow-sm" />
                <div className="space-y-0.5">
                  <p className="text-xs font-black text-[#2B2F8F] dark:text-[#4FC3E8]">
                    Daily Quest Tip
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Speaking aloud triggers neural memory pathways 2x faster than silent reading. Try speaking mode!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <DuolingoLeaderboardView
            book={selectedBook}
            onStartRound={() => handleStartRound(selectedChapter)}
          />
        )}

        {activeTab === 'practice' && (
          <DuolingoPracticeView
            book={selectedBook}
            chapters={chaptersData}
            onStartRound={handleStartRound}
            skillMode={skillMode}
            onSkillModeChange={setSkillMode}
            recentMistakesCount={mistakes.length}
          />
        )}

        {activeTab === 'quests' && (
          <DuolingoQuestsView
            totalScore={totalGems}
            gamesPlayedCount={studentSessions.length}
            bestComboEver={bestComboEver}
          />
        )}

        {activeTab === 'guidebook' && (
          <div className="max-w-xl mx-auto pb-28 pt-2">
            <DuolingoGuidebookModal
              isOpen={true}
              onClose={() => setActiveTab('learn')}
              book={selectedBook}
              chapterNumber={selectedChapter}
            />
          </div>
        )}
      </main>

      {/* 3. Duolingo Sticky Bottom Navigation Bar (Responsive on Mobile) */}
      <div className="lg:hidden">
        <DuolingoBottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            if (tab === 'guidebook') {
              handleOpenGuidebook(selectedChapter);
            } else {
              setActiveTab(tab);
            }
          }}
        />
      </div>

      {/* 4. Interactive Chapter Launch Modal (NO popover overlap!) */}
      <DuolingoChapterModal
        isOpen={chapterModalOpen}
        onClose={() => setChapterModalOpen(false)}
        chapterData={activeChapterModalData}
        book={selectedBook}
        skillMode={skillMode}
        onSkillModeChange={setSkillMode}
        onStartRound={handleStartRound}
        onOpenGuidebook={handleOpenGuidebook}
        onOpenMedal={handleOpenMedal}
      />

      {/* 5. Chapter Mini-Certificate / Medal Modal */}
      {medalModalChapterData && (
        <ChapterMedalModal
          isOpen={medalModalOpen}
          onClose={() => setMedalModalOpen(false)}
          studentName={studentName || 'Student'}
          book={selectedBook}
          chapterNumber={medalModalChapterData.chapter}
          chapterTitle={medalModalChapterData.title}
          grammarFocus={medalModalChapterData.grammarFocus}
          score={medalModalChapterData.personalBest}
          accuracy={medalModalChapterData.accuracy}
          stars={
            medalModalChapterData.completionPercent >= 100
              ? 3
              : medalModalChapterData.completionPercent >= 60
                ? 2
                : 1
          }
        />
      )}

      {/* 6. Full Course / Level Certificate Modal */}
      <FullCertificateModal
        isOpen={fullCertificateOpen}
        onClose={() => setFullCertificateOpen(false)}
        studentName={studentName || 'Student'}
        book={selectedBook}
        cefr={currentBookMeta.cefr}
        totalScore={totalGems}
        completedChaptersCount={completedChaptersCount}
      />

      {/* 7. Unit Guidebook Modal */}
      <DuolingoGuidebookModal
        isOpen={guidebookOpen}
        onClose={() => setGuidebookOpen(false)}
        book={selectedBook}
        chapterNumber={guidebookChapter}
      />
    </div>
  );
}
