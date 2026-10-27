import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  SPEAKING_BOOKS,
  SpeakingBook,
  SpeakingChapter,
  SpeakingSentence,
} from '@/data/speakingCurriculum';
import {
  evaluatePronunciation,
  EvaluationResult,
  playNativeSpeech,
  playChime,
} from '@/utils/speechEvaluator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Mic,
  MicOff,
  Volume2,
  Turtle,
  RotateCcw,
  ArrowRight,
  Flame,
  Award,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  ChevronRight,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';

export default function StudentSpeakingLab() {
  const { studentName, studentId, user } = useAuth();

  // Navigation State
  const [selectedBookIndex, setSelectedBookIndex] = useState(0);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);

  // Audio & Speech States
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [hasStartedChapter, setHasStartedChapter] = useState(false);
  const [chapterCompleted, setChapterCompleted] = useState(false);

  // Gamification & Completion Tracking
  const [streakDays, setStreakDays] = useState(1);
  const [sessionPoints, setSessionPoints] = useState(0);

  // Completed chapters tracking (stored in localStorage and synced with Supabase)
  const [completedChapters, setCompletedChapters] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('native_completed_chapters');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Recognition ref
  const recognitionRef = useRef<any>(null);
  const cancelSpeechRef = useRef<(() => void) | null>(null);

  const currentBook = SPEAKING_BOOKS[selectedBookIndex];
  const currentChapter = currentBook.chapters[selectedChapterIndex];
  const currentSentence = currentChapter.sentences[currentSentenceIndex];

  // Load streak & completed stats from localStorage
  useEffect(() => {
    try {
      const savedStreak = localStorage.getItem('native_speaking_streak');
      const savedPoints = localStorage.getItem('native_speaking_points');
      if (savedStreak) setStreakDays(parseInt(savedStreak, 10));
      if (savedPoints) setSessionPoints(parseInt(savedPoints, 10));
    } catch (e) {
      // ignore localStorage errors
    }
  }, []);

  // Sync completed chapters from Supabase database
  useEffect(() => {
    const fetchCompletedFromDB = async () => {
      try {
        const studentFilter = studentId || user?.id;
        if (!studentFilter) return;

        const { data } = await supabase
          .from('student_speaking_attempts')
          .select('book_id, chapter_number')
          .eq('student_id', studentFilter);

        if (data && data.length > 0) {
          const dbKeys = Array.from(new Set(data.map((d: any) => `${d.book_id}_${d.chapter_number}`)));
          setCompletedChapters((prev) => {
            const merged = Array.from(new Set([...prev, ...dbKeys]));
            localStorage.setItem('native_completed_chapters', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (e) {
        // non-blocking
      }
    };
    fetchCompletedFromDB();
  }, [studentId, user]);

  // Initialize Speech Recognition support check
  useEffect(() => {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone permissions in your browser.');
        } else if (event.error !== 'no-speech') {
          toast.error(`Recognition error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (cancelSpeechRef.current) {
        cancelSpeechRef.current();
      }
    };
  }, []);

  // When student finishes recording and has a transcript, evaluate
  const handleStopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  };

  // Evaluate transcript once recording finishes and transcript is non-empty
  useEffect(() => {
    if (!isRecording && transcript.trim() && currentSentence) {
      const result = evaluatePronunciation(currentSentence.sentence, transcript);
      setEvaluation(result);

      if (result.score >= 80) {
        playChime('success');
        setSessionPoints((prev) => {
          const next = prev + 25;
          localStorage.setItem('native_speaking_points', next.toString());
          return next;
        });
      } else {
        playChime('try-again');
      }

      // Log attempt to Supabase asynchronously
      logAttemptToDatabase(result);
    }
  }, [isRecording]);

  const logAttemptToDatabase = async (result: EvaluationResult) => {
    try {
      const payload = {
        student_id: studentId || user?.id || null,
        student_name: studentName || 'Student',
        book_id: currentBook.id,
        book_title: currentBook.title,
        chapter_number: currentChapter.chapterNumber,
        chapter_title: currentChapter.title,
        sentence_id: currentSentence.id,
        sentence_text: currentSentence.sentence,
        spoken_text: result.spokenText,
        score: result.score,
        stars: result.stars,
      };

      await supabase.from('student_speaking_attempts').insert(payload);
    } catch (e) {
      console.warn('Logging speaking attempt to Supabase failed silently:', e);
    }
  };

  // Toggle Play Model Audio (Normal vs Noticeably Slow Motion)
  const handlePlayModelAudio = (speed: number) => {
    // If already playing the EXACT same speed, toggle off
    if (isPlayingAudio && audioSpeed === speed) {
      if (cancelSpeechRef.current) cancelSpeechRef.current();
      setIsPlayingAudio(false);
      return;
    }

    // Cancel any ongoing utterance and immediately start with new speed
    if (cancelSpeechRef.current) cancelSpeechRef.current();

    setAudioSpeed(speed);
    setIsPlayingAudio(true);

    cancelSpeechRef.current = playNativeSpeech(
      currentSentence.sentence,
      speed,
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false)
    );
  };

  // Toggle Recording
  const handleToggleRecord = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      if (!recognitionRef.current) {
        toast.error('Voice recognition is not supported in this browser. Please use Chrome, Safari, or Edge.');
        return;
      }
      setEvaluation(null);
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        // Recognition might already be starting
      }
    }
  };

  // Move to next sentence or complete chapter
  const handleNextSentence = () => {
    setEvaluation(null);
    setTranscript('');
    if (currentSentenceIndex < currentChapter.sentences.length - 1) {
      setCurrentSentenceIndex((prev) => prev + 1);
    } else {
      // Completed chapter!
      setChapterCompleted(true);
      playChime('celebrate');

      const chapterKey = `${currentBook.id}_${currentChapter.chapterNumber}`;
      setCompletedChapters((prev) => {
        if (!prev.includes(chapterKey)) {
          const updated = [...prev, chapterKey];
          localStorage.setItem('native_completed_chapters', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });

      // Update streak in localStorage
      const newStreak = streakDays + 1;
      setStreakDays(newStreak);
      localStorage.setItem('native_speaking_streak', newStreak.toString());
    }
  };

  const handleRetrySentence = () => {
    setEvaluation(null);
    setTranscript('');
    handleToggleRecord();
  };

  const handleStartChapter = (chIndex: number) => {
    setSelectedChapterIndex(chIndex);
    setCurrentSentenceIndex(0);
    setEvaluation(null);
    setTranscript('');
    setChapterCompleted(false);
    setHasStartedChapter(true);
  };

  // Progress Calculations
  const completedInCurrentBook = currentBook.chapters.filter((ch) =>
    completedChapters.includes(`${currentBook.id}_${ch.chapterNumber}`)
  ).length;

  const bookProgressPercentage = Math.round(
    (completedInCurrentBook / currentBook.chapters.length) * 100
  );

  const exerciseProgressPercentage =
    ((currentSentenceIndex + 1) / currentChapter.sentences.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Top Banner & Gamification Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-3xl p-5 sm:p-6 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border-none text-xs gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Interactive Pronunciation
            </Badge>
            <Badge className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border-none text-xs">
              40 Grammar Chapters
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-1.5 tracking-tight flex items-center gap-2">
            Speaking & Pronunciation Lab
          </h2>
          <p className="text-white/80 text-xs sm:text-sm mt-0.5">
            Train rhythm, contractions, and native accents with real-time feedback.
          </p>
        </div>

        {/* Streaks & XP counter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10">
            <Flame className="w-5 h-5 text-amber-400 fill-amber-400 animate-pulse" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-white/70">Streak</p>
              <p className="text-sm font-extrabold">{streakDays} Days</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10">
            <Trophy className="w-5 h-5 text-yellow-300" />
            <div>
              <p className="text-[10px] uppercase font-semibold text-white/70">Score</p>
              <p className="text-sm font-extrabold">{sessionPoints} XP</p>
            </div>
          </div>
        </div>
      </div>

      {/* Book Tabs Selector with Completion Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {SPEAKING_BOOKS.map((book, idx) => {
          const isSelected = selectedBookIndex === idx;
          const bookDone = book.chapters.filter((ch) =>
            completedChapters.includes(`${book.id}_${ch.chapterNumber}`)
          ).length;
          const bookPct = Math.round((bookDone / book.chapters.length) * 100);

          return (
            <button
              key={book.id}
              onClick={() => {
                setSelectedBookIndex(idx);
                setSelectedChapterIndex(0);
                setCurrentSentenceIndex(0);
                setEvaluation(null);
                setHasStartedChapter(false);
                setChapterCompleted(false);
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-card border-border hover:border-blue-300 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  {book.cefr}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    book.id === 'beginner-grammar'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : book.id === 'intermediate-grammar'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                      : book.id === 'advanced-vol3'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                  }`}
                >
                  {book.level}
                </span>
              </div>
              <p className="font-bold text-sm text-foreground line-clamp-1">{book.title}</p>
              
              {/* Mini Book Completion Status */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                <span>{bookDone} / 10 Done</span>
                {bookDone > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {bookPct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content: Chapter View OR Exercise Room */}
      {!hasStartedChapter ? (
        /* CHAPTERS LIST VIEW */
        <Card className="rounded-3xl border shadow-sm">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  {currentBook.title} — Chapters
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{currentBook.description}</p>
              </div>
            </div>

            {/* OVERALL BOOK PROGRESS BAR */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-card to-card border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-foreground">
                      {currentBook.title} Progress
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Complete all 10 chapters to master this level
                    </p>
                  </div>
                </div>

                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-bold text-xs px-2.5 py-1">
                  {completedInCurrentBook} of {currentBook.chapters.length} Chapters Done ({bookProgressPercentage}%)
                </Badge>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden p-0.5 border">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{
                    width: `${Math.max(bookProgressPercentage, completedInCurrentBook > 0 ? 5 : 0)}%`,
                  }}
                />
              </div>
            </div>

            {/* CHAPTERS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {currentBook.chapters.map((ch, idx) => {
                const isCompleted = completedChapters.includes(
                  `${currentBook.id}_${ch.chapterNumber}`
                );

                return (
                  <div
                    key={ch.chapterNumber}
                    onClick={() => handleStartChapter(idx)}
                    className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all group ${
                      isCompleted
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-800/80 shadow-xs hover:border-emerald-500 hover:bg-emerald-100/50'
                        : 'bg-card border-border hover:bg-muted/40 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm shrink-0 transition-transform group-hover:scale-105 ${
                          isCompleted
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : ch.chapterNumber}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4
                            className={`font-bold text-sm transition-colors ${
                              isCompleted
                                ? 'text-emerald-950 dark:text-emerald-200'
                                : 'text-foreground group-hover:text-blue-600'
                            }`}
                          >
                            Chapter {ch.chapterNumber}: {ch.title}
                          </h4>
                          {isCompleted && (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px] font-bold border border-emerald-300/50 py-0 px-1.5">
                              Completed ✓
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {ch.grammarFocus}
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 transition-all group-hover:translate-x-0.5 ${
                        isCompleted
                          ? 'text-emerald-600'
                          : 'text-muted-foreground group-hover:text-blue-600'
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : chapterCompleted ? (
        /* CHAPTER COMPLETION CELEBRATION CARD */
        <Card className="rounded-3xl border shadow-sm text-center overflow-hidden">
          <div className="bg-gradient-to-b from-emerald-50 via-card to-card dark:from-emerald-950/20 p-8 sm:p-12 space-y-5">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center text-3xl shadow-inner animate-bounce">
              🏆
            </div>

            <div className="space-y-1">
              <Badge className="bg-emerald-600 text-white text-xs font-semibold">
                Chapter Complete ✓
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Brilliant Speaking Practice!
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                You mastered all sentences for{' '}
                <strong>
                  Chapter {currentChapter.chapterNumber}: {currentChapter.title}
                </strong>
                .
              </p>
            </div>

            <div className="flex items-center justify-center gap-6 py-2">
              <div className="text-center">
                <p className="text-2xl font-black text-blue-600">+100</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase">XP Earned</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <p className="text-2xl font-black text-amber-500">🔥 {streakDays}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Day Streak</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setHasStartedChapter(false)}
                className="rounded-xl px-5 text-xs font-semibold"
              >
                Back to Chapters
              </Button>
              {selectedChapterIndex < currentBook.chapters.length - 1 && (
                <Button
                  onClick={() => handleStartChapter(selectedChapterIndex + 1)}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 text-xs font-semibold"
                >
                  Next Chapter ({selectedChapterIndex + 2}) <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : (
        /* ACTIVE EXERCISE CARD */
        <Card className="rounded-3xl border shadow-sm overflow-hidden">
          {/* Top Exercise Header & Prominent Progress Bar */}
          <div className="p-5 sm:p-6 border-b bg-muted/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHasStartedChapter(false)}
                  className="h-8 px-2.5 text-xs rounded-xl"
                >
                  ← All Chapters
                </Button>
                <Badge variant="outline" className="text-xs font-semibold">
                  Chapter {currentChapter.chapterNumber}: {currentChapter.title}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground">
                  Phrase {currentSentenceIndex + 1} of {currentChapter.sentences.length}
                </span>
                <Badge className="bg-blue-600 text-white text-[11px] font-bold">
                  {Math.round(exerciseProgressPercentage)}%
                </Badge>
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden p-0.5 border">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${exerciseProgressPercentage}%` }}
              />
            </div>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Grammar Focus Pill */}
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 text-xs font-semibold border-none">
                Grammar Focus: {currentChapter.grammarFocus}
              </Badge>
            </div>

            {/* Target Sentence Display */}
            <div className="py-4 text-center space-y-2">
              <p className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Listen & Speak the phrase below:
              </p>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight max-w-2xl mx-auto leading-snug">
                "{currentSentence.sentence}"
              </h3>
            </div>

            {/* Native Audio Listen Controls (Normal vs Distinct Slow Motion) */}
            <div className="flex items-center justify-center gap-3">
              <Button
                variant={isPlayingAudio && audioSpeed === 1.0 ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => handlePlayModelAudio(1.0)}
                className={`rounded-xl px-4 text-xs font-semibold transition-all ${
                  isPlayingAudio && audioSpeed === 1.0
                    ? 'ring-2 ring-blue-500 bg-blue-50 text-blue-700 font-bold shadow-sm'
                    : 'hover:bg-muted'
                }`}
              >
                <Volume2 className="w-4 h-4 mr-1.5 text-blue-600" />
                {isPlayingAudio && audioSpeed === 1.0 ? 'Playing (1.0x)...' : 'Listen Native (1.0x)'}
              </Button>

              <Button
                variant={isPlayingAudio && audioSpeed === 0.55 ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => handlePlayModelAudio(0.55)}
                className={`rounded-xl px-4 text-xs font-semibold transition-all ${
                  isPlayingAudio && audioSpeed === 0.55
                    ? 'ring-2 ring-emerald-500 bg-emerald-50 text-emerald-800 font-bold shadow-sm'
                    : 'hover:bg-muted'
                }`}
              >
                <Turtle className="w-4 h-4 mr-1.5 text-emerald-600" />
                {isPlayingAudio && audioSpeed === 0.55 ? 'Playing Slow...' : 'Slow Motion (0.55x 🐢)'}
              </Button>
            </div>

            {/* Grammar & Phonetic Tips */}
            {(currentSentence.grammarTip || currentSentence.phoneticFocus) && (
              <div className="bg-muted/30 border rounded-2xl p-4 text-xs space-y-1.5 max-w-xl mx-auto">
                {currentSentence.grammarTip && (
                  <p className="text-foreground font-medium">
                    <strong className="text-blue-600 font-bold">Grammar Tip:</strong>{' '}
                    {currentSentence.grammarTip}
                  </p>
                )}
                {currentSentence.phoneticFocus && (
                  <p className="text-muted-foreground">
                    <strong className="text-emerald-600 font-bold">Accent & Rhythm:</strong>{' '}
                    {currentSentence.phoneticFocus}
                  </p>
                )}
              </div>
            )}

            {/* Microphone Record Centerpiece */}
            <div className="pt-2 pb-4 text-center space-y-4">
              <div className="relative inline-block">
                {isRecording && (
                  <span className="absolute -inset-3 rounded-full bg-rose-500/20 animate-ping" />
                )}
                <button
                  type="button"
                  onClick={handleToggleRecord}
                  className={`w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-lg active:scale-95 ${
                    isRecording
                      ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-400/40'
                      : 'bg-blue-600 hover:bg-blue-700 text-white ring-4 ring-blue-500/20'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-8 h-8 animate-pulse" />
                      <span className="text-[10px] font-bold mt-1">Tap to Stop</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-8 h-8" />
                      <span className="text-[10px] font-bold mt-1">Tap & Speak</span>
                    </>
                  )}
                </button>
              </div>

              {isRecording && (
                <div className="space-y-1 animate-pulse">
                  <p className="text-sm font-bold text-rose-600">Listening to your pronunciation...</p>
                  <p className="text-xs text-muted-foreground">Speak clearly into your microphone</p>
                  {transcript && (
                    <p className="text-xs font-mono text-muted-foreground bg-muted p-2 rounded-xl max-w-md mx-auto">
                      "{transcript}"
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Real-time Evaluation Results Panel */}
            {evaluation && (
              <div className="rounded-2xl border p-5 sm:p-6 bg-card space-y-4 shadow-sm animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-foreground">{evaluation.score}%</span>
                    <Badge
                      className={`text-xs font-bold ${
                        evaluation.score >= 80
                          ? 'bg-emerald-600 text-white'
                          : evaluation.score >= 60
                          ? 'bg-amber-500 text-white'
                          : 'bg-rose-500 text-white'
                      }`}
                    >
                      {evaluation.score >= 80 ? 'Great Accent!' : evaluation.score >= 60 ? 'Close!' : 'Needs Practice'}
                    </Badge>
                  </div>

                  {/* Stars Display */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((star) => (
                      <span
                        key={star}
                        className={`text-lg ${star <= evaluation.stars ? 'text-amber-400' : 'text-gray-300'}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-xs sm:text-sm font-medium text-foreground">{evaluation.feedback}</p>

                {/* Word-by-word visual color feedback */}
                <div className="space-y-1.5">
                  <p className="text-[11px] uppercase font-bold text-muted-foreground tracking-wider">
                    Pronunciation Breakdown:
                  </p>
                  <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-muted/30 border">
                    {evaluation.words.map((item, idx) => {
                      const isCorrect = item.status === 'correct';
                      const isNear = item.status === 'near';
                      return (
                        <span
                          key={idx}
                          className={`text-sm px-2 py-1 rounded-lg font-semibold transition-all ${
                            isCorrect
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40'
                              : isNear
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/40'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300/40 line-through'
                          }`}
                          title={item.status === 'missing' ? 'Mispronounced or omitted word' : 'Accurate'}
                        >
                          {item.word}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* What student actually said */}
                <div className="text-xs text-muted-foreground">
                  <strong>What was transcribed:</strong> "{evaluation.spokenText}"
                </div>

                {/* Navigation Controls */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetrySentence}
                    className="rounded-xl text-xs font-semibold"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Retry Phrase
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleNextSentence}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                  >
                    {currentSentenceIndex < currentChapter.sentences.length - 1 ? (
                      <>
                        Next Phrase <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </>
                    ) : (
                      <>
                        Complete Chapter 🎉
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
