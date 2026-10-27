import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GrammarGameQuestion } from '@/lib/supabase';
import { tokenizeSentenceWords, GRAMMAR_QUESTION_TYPES } from '@/data/grammarRushCurriculum';
import {
  evaluatePronunciation,
  EvaluationResult,
  playNativeSpeech,
} from '@/utils/speechEvaluator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Check,
  X,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Mic,
  MicOff,
  Volume2,
  Turtle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface QuestionAttemptResult {
  isCorrect: boolean;
  studentAnswer: string;
  correctAnswer: string;
  elapsedMs: number;
  speakingScore?: number;
  speakingStars?: number;
}

interface GrammarQuestionCardProps {
  question: GrammarGameQuestion;
  onAnswer: (result: QuestionAttemptResult) => void;
  onSkipSpeaking?: () => void;
  onSpeakingBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
  isPreview?: boolean;
}

export const GrammarQuestionCard: React.FC<GrammarQuestionCardProps> = ({
  question,
  onAnswer,
  onSkipSpeaking,
  onSpeakingBusyChange,
  disabled = false,
  isPreview = false,
}) => {
  const [startTime, setStartTime] = useState<number>(() => performance.now());

  // State for true_false_fix
  const [tfStage, setTfStage] = useState<'verdict' | 'pick_word' | 'pick_fix'>('verdict');
  const [selectedWordIdx, setSelectedWordIdx] = useState<number | null>(null);

  // State for fill_gap
  const [selectedGapOption, setSelectedGapOption] = useState<string | null>(null);

  // State for word_order (stores indices from shuffledPool)
  const [placedTileIndices, setPlacedTileIndices] = useState<number[]>([]);

  // State for speaking (interactive pronunciation challenge)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState<number>(1.0);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speakingEval, setSpeakingEval] = useState<EvaluationResult | null>(null);
  const [speakingRetries, setSpeakingRetries] = useState(0);

  const recognitionRef = useRef<any>(null);
  const cancelSpeechRef = useRef<(() => void) | null>(null);

  // Feedback glow state
  const [feedbackState, setFeedbackState] = useState<{
    status: 'correct' | 'wrong';
    studentAnswer: string;
  } | null>(null);

  // Tokenize sentence words for true_false_fix
  const sentenceWords = useMemo(
    () => tokenizeSentenceWords(question.sentence),
    [question.sentence]
  );

  // Shuffled pool for word_order
  const wordOrderPool = useMemo(() => {
    const baseTiles =
      question.options && question.options.length > 0
        ? [...question.options]
        : tokenizeSentenceWords(question.correct_sentence);
    return baseTiles;
  }, [question.id, question.options, question.correct_sentence]);

  // Notify parent when audio or mic recording is active so timer can pause during speaking
  useEffect(() => {
    onSpeakingBusyChange?.(isPlayingAudio || isRecording);
  }, [isPlayingAudio, isRecording, onSpeakingBusyChange]);

  // Reset internal state whenever question changes
  useEffect(() => {
    setStartTime(performance.now());
    setTfStage('verdict');
    setSelectedWordIdx(null);
    setSelectedGapOption(null);
    setPlacedTileIndices([]);
    setFeedbackState(null);
    setIsPlayingAudio(false);
    setIsRecording(false);
    setTranscript('');
    setSpeakingEval(null);
    setSpeakingRetries(0);

    if (cancelSpeechRef.current) {
      cancelSpeechRef.current();
      cancelSpeechRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
  }, [question.id]);

  // Initialize Web Speech API for speaking questions
  useEffect(() => {
    if (question.type !== 'speaking') return;

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
        setIsRecording(false);
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. You can tap "Can\'t speak right now" to continue.');
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
        } catch {}
      }
      if (cancelSpeechRef.current) {
        cancelSpeechRef.current();
      }
    };
  }, [question.id, question.type]);

  const triggerOutcome = (
    isCorrect: boolean,
    studentAnswer: string,
    correctAnswer: string,
    extra?: { speakingScore?: number; speakingStars?: number }
  ) => {
    if (feedbackState || disabled) return;
    const elapsedMs = Math.max(100, Math.round(performance.now() - startTime));
    setFeedbackState({ status: isCorrect ? 'correct' : 'wrong', studentAnswer });
    onAnswer({
      isCorrect,
      studentAnswer,
      correctAnswer,
      elapsedMs,
      ...extra,
    });
  };

  // Evaluate pronunciation when recording ends with non-empty transcript
  useEffect(() => {
    if (question.type !== 'speaking') return;
    if (!isRecording && transcript.trim() && !feedbackState) {
      const targetText = question.correct_sentence || question.sentence;
      const result = evaluatePronunciation(targetText, transcript);
      setSpeakingEval(result);

      if (result.score >= 65) {
        triggerOutcome(
          true,
          `${result.spokenText} (${result.score}%)`,
          targetText,
          { speakingScore: result.score, speakingStars: result.stars }
        );
      } else if (speakingRetries >= 1) {
        triggerOutcome(
          false,
          `${result.spokenText} (${result.score}%)`,
          targetText,
          { speakingScore: result.score, speakingStars: result.stars }
        );
      } else {
        setSpeakingRetries((prev) => prev + 1);
      }
    }
  }, [isRecording]);

  const handlePlayModelAudio = (speed: number) => {
    const targetText = question.correct_sentence || question.sentence;
    if (isPlayingAudio && audioSpeed === speed) {
      if (cancelSpeechRef.current) cancelSpeechRef.current();
      setIsPlayingAudio(false);
      return;
    }
    if (cancelSpeechRef.current) cancelSpeechRef.current();

    setAudioSpeed(speed);
    setIsPlayingAudio(true);

    cancelSpeechRef.current = playNativeSpeech(
      targetText,
      speed,
      () => setIsPlayingAudio(true),
      () => setIsPlayingAudio(false)
    );
  };

  const handleToggleRecord = () => {
    if (feedbackState || disabled) return;
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      if (!recognitionRef.current) {
        toast.error(
          'Voice recognition is not supported in this browser. Tap "Can\'t speak right now" below.'
        );
        return;
      }
      if (cancelSpeechRef.current) {
        cancelSpeechRef.current();
        setIsPlayingAudio(false);
      }
      setSpeakingEval(null);
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch {}
    }
  };

  // ============================================================
  // HANDLERS: true_false_fix
  // ============================================================
  const hasError =
    question.error_word_index !== null &&
    question.error_word_index !== undefined &&
    question.error_word_index >= 0;

  const handleVerdictTap = (tappedCorrect: boolean) => {
    if (feedbackState || disabled) return;

    if (!hasError) {
      if (tappedCorrect) {
        triggerOutcome(true, '✓ Correct sentence', '✓ Correct sentence');
      } else {
        triggerOutcome(
          false,
          '✗ Marked as error (sentence was already correct)',
          question.correct_sentence
        );
      }
    } else {
      if (tappedCorrect) {
        triggerOutcome(false, '✓ Marked as correct (missed error)', question.correct_sentence);
      } else {
        setTfStage('pick_word');
      }
    }
  };

  const handleTapErrorWord = (idx: number) => {
    if (feedbackState || disabled) return;
    setSelectedWordIdx(idx);

    if (idx === question.error_word_index) {
      if (question.options && question.options.length > 0) {
        setTfStage('pick_fix');
      } else {
        triggerOutcome(true, `Fixed "${sentenceWords[idx]}"`, question.correct_sentence);
      }
    } else {
      const tappedWord = sentenceWords[idx] || '';
      const actualErrorWord =
        question.error_word_index != null ? sentenceWords[question.error_word_index] : '';
      triggerOutcome(
        false,
        `Tapped "${tappedWord}" instead of "${actualErrorWord}"`,
        question.correct_sentence
      );
    }
  };

  const handlePickFixOption = (opt: string) => {
    if (feedbackState || disabled) return;
    const isRight =
      opt.trim().toLowerCase() === (question.correct_option || '').trim().toLowerCase();
    const badWord =
      question.error_word_index != null ? sentenceWords[question.error_word_index] : 'error';
    triggerOutcome(
      isRight,
      `${badWord} → ${opt}`,
      `${badWord} → ${question.correct_option} (${question.correct_sentence})`
    );
  };

  // ============================================================
  // HANDLERS: fill_gap
  // ============================================================
  const handleFillGapOption = (opt: string) => {
    if (feedbackState || disabled) return;
    setSelectedGapOption(opt);
    const isRight =
      opt.trim().toLowerCase() === (question.correct_option || '').trim().toLowerCase();
    triggerOutcome(isRight, opt, question.correct_option || question.correct_sentence);
  };

  // ============================================================
  // HANDLERS: word_order
  // ============================================================
  const handleTapPoolTile = (poolIdx: number) => {
    if (feedbackState || disabled) return;
    if (placedTileIndices.includes(poolIdx)) return;
    setPlacedTileIndices((prev) => [...prev, poolIdx]);
  };

  const handleRemovePlacedTile = (positionInTray: number) => {
    if (feedbackState || disabled) return;
    setPlacedTileIndices((prev) => prev.filter((_, idx) => idx !== positionInTray));
  };

  const normalizeSentenceForCompare = (str: string) =>
    str
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\s+([?.!,;:])/g, '$1')
      .toLowerCase();

  const handleSubmitWordOrder = () => {
    if (feedbackState || disabled) return;
    const builtSentence = placedTileIndices.map((i) => wordOrderPool[i]).join(' ');
    const targetSentence = question.correct_sentence || question.correct_option;
    const isRight =
      normalizeSentenceForCompare(builtSentence) === normalizeSentenceForCompare(targetSentence);
    triggerOutcome(isRight, builtSentence, question.correct_sentence);
  };

  const typeMeta = GRAMMAR_QUESTION_TYPES.find((t) => t.value === question.type);

  return (
    <div
      className={cn(
        'liquid-glass-card rounded-3xl p-5 sm:p-6 transition-all duration-300 max-w-xl mx-auto w-full select-none',
        feedbackState?.status === 'correct' &&
          'ring-4 ring-emerald-500/70 bg-emerald-500/15 dark:bg-emerald-950/40 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.35)]',
        feedbackState?.status === 'wrong' &&
          'ring-4 ring-rose-500/70 bg-rose-500/15 dark:bg-rose-950/40 border-rose-400 shadow-[0_0_35px_rgba(244,63,94,0.35)]'
      )}
    >
      {/* Question Type Header Pill */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <Badge
          variant="outline"
          className={cn(
            'liquid-glass-pill text-xs font-bold px-3 py-1',
            question.type === 'speaking'
              ? 'text-purple-700 dark:text-purple-300 border-purple-400/40 bg-purple-500/10'
              : 'text-sky-700 dark:text-sky-300 border-sky-400/40'
          )}
        >
          {question.type === 'speaking' ? (
            <Mic className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-sky-500" />
          )}
          {typeMeta?.label || question.type}
        </Badge>

        {isPreview && feedbackState && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTfStage('verdict');
              setSelectedWordIdx(null);
              setSelectedGapOption(null);
              setPlacedTileIndices([]);
              setFeedbackState(null);
              setSpeakingEval(null);
              setTranscript('');
              setSpeakingRetries(0);
              setStartTime(performance.now());
            }}
            className="h-7 rounded-xl text-xs gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Preview
          </Button>
        )}
      </div>

      {/* ============================================================ */}
      {/* TYPE 4: SPEAKING & PRONUNCIATION CHALLENGE                   */}
      {/* ============================================================ */}
      {question.type === 'speaking' && (
        <div className="space-y-4">
          <div className="text-center space-y-2 py-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Listen & speak this sentence aloud:
            </p>
            <div className="liquid-glass-pill rounded-2xl p-4 sm:p-5 space-y-3">
              <p className="text-lg sm:text-2xl font-extrabold text-foreground leading-snug">
                “{question.correct_sentence || question.sentence}”
              </p>

              {/* Native Audio Controls (1.0x Normal & 0.55x Slow Motion) */}
              <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1">
                <Button
                  type="button"
                  variant={isPlayingAudio && audioSpeed === 1.0 ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handlePlayModelAudio(1.0)}
                  className={cn(
                    'rounded-xl px-3.5 text-xs font-bold transition-all',
                    isPlayingAudio && audioSpeed === 1.0 &&
                      'ring-2 ring-sky-500 bg-sky-500/15 text-sky-700 dark:text-sky-300'
                  )}
                >
                  <Volume2 className="w-3.5 h-3.5 mr-1.5 text-sky-500" />
                  {isPlayingAudio && audioSpeed === 1.0 ? 'Playing (1.0x)...' : 'Listen (1.0x)'}
                </Button>

                <Button
                  type="button"
                  variant={isPlayingAudio && audioSpeed === 0.55 ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handlePlayModelAudio(0.55)}
                  className={cn(
                    'rounded-xl px-3.5 text-xs font-bold transition-all',
                    isPlayingAudio && audioSpeed === 0.55 &&
                      'ring-2 ring-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  )}
                >
                  <Turtle className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                  {isPlayingAudio && audioSpeed === 0.55 ? 'Playing Slow...' : 'Slow (0.55x 🐢)'}
                </Button>
              </div>
            </div>
          </div>

          {question.phonetic_focus && (
            <div className="text-center text-xs text-muted-foreground bg-purple-500/10 border border-purple-400/25 rounded-xl px-3 py-2">
              🎯 <strong className="text-purple-700 dark:text-purple-300">Pronunciation Tip:</strong>{' '}
              {question.phonetic_focus}
            </div>
          )}

          {/* Big Microphone Button */}
          <div className="py-2 text-center space-y-3">
            <div className="relative inline-block">
              {isRecording && (
                <span className="absolute -inset-3 rounded-full bg-rose-500/25 animate-ping" />
              )}
              <button
                type="button"
                disabled={!!feedbackState || disabled}
                onClick={handleToggleRecord}
                className={cn(
                  'w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-lg active:scale-95',
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-400/40'
                    : 'bg-gradient-to-br from-purple-600 via-indigo-600 to-sky-600 hover:opacity-95 text-white ring-4 ring-indigo-500/25'
                )}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-7 h-7 animate-pulse" />
                    <span className="text-[10px] font-extrabold mt-1">Tap to Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-7 h-7" />
                    <span className="text-[10px] font-extrabold mt-1">Tap & Speak</span>
                  </>
                )}
              </button>
            </div>

            {isRecording && (
              <div className="space-y-1 animate-pulse">
                <p className="text-xs font-extrabold text-rose-600 dark:text-rose-400">
                  Listening... speak clearly into your microphone
                </p>
                {transcript && (
                  <p className="text-xs font-mono text-foreground bg-muted/60 px-3 py-1.5 rounded-xl max-w-md mx-auto">
                    “{transcript}”
                  </p>
                )}
              </div>
            )}

            {/* Word-by-word pronunciation breakdown when evaluated */}
            {speakingEval && (
              <div className="rounded-2xl border p-3.5 bg-white/60 dark:bg-slate-900/60 space-y-2.5 text-left animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-foreground">
                      {speakingEval.score}%
                    </span>
                    <Badge
                      className={cn(
                        'text-[11px] font-bold',
                        speakingEval.score >= 80
                          ? 'bg-emerald-600 text-white'
                          : speakingEval.score >= 65
                            ? 'bg-amber-500 text-white'
                            : 'bg-rose-500 text-white'
                      )}
                    >
                      {speakingEval.score >= 80
                        ? 'Native Rhythm!'
                        : speakingEval.score >= 65
                          ? 'Good Job!'
                          : 'Try Once More!'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3].map((s) => (
                      <span
                        key={s}
                        className={cn(
                          'text-sm',
                          s <= speakingEval.stars ? 'text-amber-400' : 'text-muted-foreground/30'
                        )}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {speakingEval.words.map((item, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-lg font-bold border',
                        item.status === 'correct'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : item.status === 'near'
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 line-through'
                      )}
                    >
                      {item.word}
                    </span>
                  ))}
                </div>

                {!feedbackState && speakingEval.score < 65 && (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] text-muted-foreground">
                      Tap the mic to try speaking again, or continue:
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        triggerOutcome(
                          false,
                          `${speakingEval.spokenText} (${speakingEval.score}%)`,
                          question.correct_sentence || question.sentence,
                          { speakingScore: speakingEval.score, speakingStars: speakingEval.stars }
                        )
                      }
                      className="h-7 rounded-xl text-xs font-bold"
                    >
                      Continue →
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* "Can't speak right now" button */}
            {!feedbackState && onSkipSpeaking && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onSkipSpeaking}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                >
                  Can't speak right now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TYPE 1: TRUE / FALSE + FIX                                   */}
      {/* ============================================================ */}
      {question.type === 'true_false_fix' && (
        <div className="space-y-5">
          {tfStage === 'verdict' && (
            <>
              <div className="text-center space-y-2 py-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Is this sentence grammatically correct?
                </p>
                <div className="liquid-glass-pill rounded-2xl p-4 sm:p-5">
                  <p className="text-lg sm:text-2xl font-extrabold text-foreground leading-snug">
                    “{question.sentence}”
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <button
                  type="button"
                  disabled={!!feedbackState || disabled}
                  onClick={() => handleVerdictTap(true)}
                  className="min-h-[60px] rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2.5 text-emerald-700 dark:text-emerald-300 font-extrabold text-base sm:text-lg shadow-sm"
                >
                  <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow">
                    <Check className="w-5 h-5 stroke-[3]" />
                  </span>
                  <span>Correct</span>
                </button>

                <button
                  type="button"
                  disabled={!!feedbackState || disabled}
                  onClick={() => handleVerdictTap(false)}
                  className="min-h-[60px] rounded-2xl border-2 border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-2.5 text-rose-700 dark:text-rose-300 font-extrabold text-base sm:text-lg shadow-sm"
                >
                  <span className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow">
                    <X className="w-5 h-5 stroke-[3]" />
                  </span>
                  <span>Has Error</span>
                </button>
              </div>
            </>
          )}

          {tfStage === 'pick_word' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center space-y-1">
                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-xs font-bold">
                  Step 2 of 3 • Spot the Mistake
                </Badge>
                <p className="text-sm font-bold text-foreground pt-1">
                  Tap the incorrect word in the sentence:
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 p-4 rounded-2xl liquid-glass-pill">
                {sentenceWords.map((word, idx) => (
                  <button
                    key={`${word}-${idx}`}
                    type="button"
                    disabled={!!feedbackState || disabled}
                    onClick={() => handleTapErrorWord(idx)}
                    className={cn(
                      'min-h-[48px] px-4 py-2.5 rounded-2xl font-bold text-base sm:text-lg border transition-all active:scale-95',
                      selectedWordIdx === idx
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                        : 'bg-white/80 dark:bg-slate-900/70 hover:bg-sky-500/15 hover:border-sky-400 border-border text-foreground shadow-xs'
                    )}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tfStage === 'pick_fix' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center space-y-1">
                <Badge className="bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-500/30 text-xs font-bold">
                  Step 3 of 3 • Fix the Error
                </Badge>
                <p className="text-sm font-bold text-foreground pt-1">
                  Choose the right replacement for{' '}
                  <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 line-through font-extrabold">
                    {question.error_word_index != null
                      ? sentenceWords[question.error_word_index]
                      : ''}
                  </span>
                </p>
              </div>

              {/* Sentence with highlighted error slot */}
              <div className="p-3.5 rounded-2xl liquid-glass-pill text-center text-base sm:text-lg font-bold leading-relaxed">
                {sentenceWords.map((word, idx) => (
                  <React.Fragment key={idx}>
                    {idx === question.error_word_index ? (
                      <span className="inline-block mx-1 px-3 py-0.5 rounded-xl bg-sky-500/20 border-2 border-dashed border-sky-500 text-sky-700 dark:text-sky-300 font-extrabold">
                        ?
                      </span>
                    ) : (
                      <span>{word} </span>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Fix Options */}
              <div className="grid grid-cols-2 gap-3">
                {question.options.map((opt, idx) => (
                  <button
                    key={`${opt}-${idx}`}
                    type="button"
                    disabled={!!feedbackState || disabled}
                    onClick={() => handlePickFixOption(opt)}
                    className="min-h-[54px] px-4 py-3 rounded-2xl font-extrabold text-base border bg-white/80 dark:bg-slate-900/75 hover:bg-sky-500/15 hover:border-sky-400 active:scale-95 transition-all text-foreground shadow-sm"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TYPE 2: FILL IN THE GAP                                      */}
      {/* ============================================================ */}
      {question.type === 'fill_gap' && (
        <div className="space-y-5">
          <div className="text-center space-y-2 py-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tap the best option to complete the sentence:
            </p>
            <div className="liquid-glass-pill rounded-2xl p-4 sm:p-5">
              <p className="text-lg sm:text-2xl font-extrabold text-foreground leading-relaxed">
                {question.sentence.split(/___+/g).map((part, i, arr) => (
                  <React.Fragment key={i}>
                    <span>{part}</span>
                    {i < arr.length - 1 && (
                      <span
                        className={cn(
                          'inline-block mx-1.5 px-3.5 py-0.5 rounded-xl border-2 font-extrabold transition-all',
                          selectedGapOption
                            ? 'bg-sky-500/20 border-sky-500 text-sky-700 dark:text-sky-300'
                            : 'bg-sky-500/10 border-dashed border-sky-400/70 text-sky-600 dark:text-sky-400 min-w-[68px]'
                        )}
                      >
                        {selectedGapOption || '___'}
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.options.map((opt, idx) => {
              const isSelected = selectedGapOption === opt;
              return (
                <button
                  key={`${opt}-${idx}`}
                  type="button"
                  disabled={!!feedbackState || disabled}
                  onClick={() => handleFillGapOption(opt)}
                  className={cn(
                    'min-h-[56px] px-4 py-3 rounded-2xl font-extrabold text-base sm:text-lg border transition-all active:scale-95 shadow-sm flex items-center justify-center',
                    isSelected
                      ? 'bg-sky-500 text-white border-sky-600'
                      : 'bg-white/80 dark:bg-slate-900/75 hover:bg-sky-500/15 hover:border-sky-400 border-border text-foreground'
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TYPE 3: WORD ORDER                                           */}
      {/* ============================================================ */}
      {question.type === 'word_order' && (
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tap words in order to build the sentence:
            </p>
          </div>

          {/* Built Sentence Tray (Tap placed word to remove) */}
          <div className="min-h-[76px] p-3.5 rounded-2xl liquid-input flex flex-wrap items-center gap-2">
            {placedTileIndices.length === 0 ? (
              <span className="text-xs sm:text-sm text-muted-foreground mx-auto italic">
                Tap the word tiles below to place them here...
              </span>
            ) : (
              placedTileIndices.map((poolIdx, trayPosition) => (
                <button
                  key={`placed-${poolIdx}-${trayPosition}`}
                  type="button"
                  disabled={!!feedbackState || disabled}
                  onClick={() => handleRemovePlacedTile(trayPosition)}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-sky-500 text-white font-bold text-sm sm:text-base shadow-sm active:scale-95 transition-transform flex items-center gap-1.5"
                  title="Tap to remove"
                >
                  <span>{wordOrderPool[poolIdx]}</span>
                </button>
              ))
            )}
          </div>

          {/* Available Shuffled Word Tiles */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 py-2">
            {wordOrderPool.map((word, poolIdx) => {
              const isUsed = placedTileIndices.includes(poolIdx);
              return (
                <button
                  key={`pool-${poolIdx}-${word}`}
                  type="button"
                  disabled={isUsed || !!feedbackState || disabled}
                  onClick={() => handleTapPoolTile(poolIdx)}
                  className={cn(
                    'min-h-[48px] px-4 py-2.5 rounded-2xl font-extrabold text-sm sm:text-base border transition-all',
                    isUsed
                      ? 'opacity-25 scale-95 bg-muted border-dashed border-border cursor-default'
                      : 'bg-white/85 dark:bg-slate-900/75 hover:bg-sky-500/15 hover:border-sky-400 border-border text-foreground shadow-sm active:scale-95'
                  )}
                >
                  {word}
                </button>
              );
            })}
          </div>

          {/* Action Row: Clear & Check */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={placedTileIndices.length === 0 || !!feedbackState || disabled}
              onClick={() => setPlacedTileIndices([])}
              className="min-h-[50px] rounded-2xl px-4 font-bold"
            >
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Clear
            </Button>

            <Button
              type="button"
              disabled={
                placedTileIndices.length !== wordOrderPool.length || !!feedbackState || disabled
              }
              onClick={handleSubmitWordOrder}
              className="flex-1 min-h-[50px] rounded-2xl font-extrabold text-base liquid-btn-primary text-white"
            >
              Check Sentence
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* IMMEDIATE FEEDBACK BANNER (Shown briefly after each answer)  */}
      {/* ============================================================ */}
      {feedbackState && (
        <div
          className={cn(
            'mt-5 p-4 rounded-2xl border animate-in fade-in slide-in-from-bottom-2 duration-200 space-y-1.5',
            feedbackState.status === 'correct'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-950 dark:text-emerald-100'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-950 dark:text-rose-100'
          )}
        >
          <div className="flex items-center gap-2 font-extrabold text-sm sm:text-base">
            {feedbackState.status === 'correct' ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Spot On!</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Correct Sentence: “{question.correct_sentence}”</span>
              </>
            )}
          </div>
          <p className="text-xs sm:text-sm opacity-90 flex items-start gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-75" />
            <span>{question.explanation}</span>
          </p>
        </div>
      )}
    </div>
  );
};
