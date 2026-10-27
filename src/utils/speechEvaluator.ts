/**
 * Speech evaluation, word-by-word alignment, and Text-to-Speech audio engine
 */

export interface WordResult {
  word: string;
  status: 'correct' | 'near' | 'missing';
  spokenMatch?: string;
}

export interface EvaluationResult {
  score: number; // 0 to 100
  stars: 1 | 2 | 3;
  feedback: string;
  words: WordResult[];
  spokenText: string;
  targetText: string;
}

// Normalize word for comparison
export function normalizeWord(w: string): string {
  return w
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, '')
    .trim();
}

// Levenshtein distance for fuzzy matching typos/near pronunciations
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Compare target sentence with transcribed student audio
 */
export function evaluatePronunciation(targetSentence: string, spokenText: string): EvaluationResult {
  const targetTokens = targetSentence.trim().split(/\s+/);
  const spokenTokens = spokenText.trim().split(/\s+/).map(normalizeWord).filter(Boolean);

  let spokenIndex = 0;
  let correctCount = 0;
  const wordResults: WordResult[] = [];

  for (let i = 0; i < targetTokens.length; i++) {
    const rawTarget = targetTokens[i];
    const normTarget = normalizeWord(rawTarget);

    let matchStatus: 'correct' | 'near' | 'missing' = 'missing';
    let matchedToken: string | undefined = undefined;

    // Look ahead up to 3 spoken tokens to find alignment
    for (let offset = 0; offset <= 2 && spokenIndex + offset < spokenTokens.length; offset++) {
      const candidate = spokenTokens[spokenIndex + offset];

      if (candidate === normTarget) {
        matchStatus = 'correct';
        matchedToken = candidate;
        spokenIndex += offset + 1;
        break;
      } else if (
        levenshteinDistance(candidate, normTarget) <= 1 ||
        (normTarget.length > 5 && levenshteinDistance(candidate, normTarget) <= 2)
      ) {
        matchStatus = 'near';
        matchedToken = candidate;
        spokenIndex += offset + 1;
        break;
      }
    }

    if (matchStatus === 'correct') {
      correctCount += 1;
    } else if (matchStatus === 'near') {
      correctCount += 0.8;
    }

    wordResults.push({
      word: rawTarget,
      status: matchStatus,
      spokenMatch: matchedToken,
    });
  }

  const rawScore = targetTokens.length > 0 ? (correctCount / targetTokens.length) * 100 : 0;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  let stars: 1 | 2 | 3 = 1;
  let feedback = 'Keep practicing! Listen closely to the native model and try again.';

  if (score >= 85) {
    stars = 3;
    feedback = 'Outstanding pronunciation! Clear, natural rhythm.';
  } else if (score >= 65) {
    stars = 2;
    feedback = 'Great job! Very close—watch the highlighted words and retry for 100%.';
  } else if (score >= 40) {
    stars = 1;
    feedback = 'Good try! Tap the slow 🐢 speaker to hear the linking sounds.';
  }

  return {
    score,
    stars,
    feedback,
    words: wordResults,
    spokenText,
    targetText: targetSentence,
  };
}

// -------------------------------------------------------------
// Web Speech Synthesis (Natural Text-To-Speech)
// -------------------------------------------------------------

export interface SpeechPlaybackOptions {
  speed?: number;
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err?: any) => void;
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let activeUtterance: SpeechSynthesisUtterance | null = null;

export function getBestEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const liveVoices = window.speechSynthesis.getVoices();
  const voices = liveVoices && liveVoices.length > 0 ? liveVoices : cachedVoices;
  if (!voices || voices.length === 0) return null;

  const englishVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
  if (englishVoices.length === 0) return voices[0] || null;

  // Prefer high-quality neural / natural / fluent English voices
  const premium = englishVoices.find(
    (v) =>
      v.name.includes('Natural') ||
      v.name.includes('Google') ||
      v.name.includes('Samantha') ||
      v.name.includes('Daniel') ||
      v.name.includes('Jenny') ||
      v.name.includes('Karen') ||
      v.name.includes('Alex')
  );

  return premium || englishVoices[0];
}

// Pre-load voices on browser initialization
if (typeof window !== 'undefined' && window.speechSynthesis) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

import {
  isHumanVoiceEnabled,
  playOpenAiSpeech,
  stopCurrentSpeech,
} from '@/services/openAiTtsService';

export function playBrowserSpeechSynthesis(
  text: string,
  rateOrOptions: number | SpeechPlaybackOptions = 1.0,
  onStart?: () => void,
  onEnd?: () => void
): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd?.();
    return () => {};
  }

  // Parse polymorphic arguments
  let rawRate = 1.0;
  let startCb = onStart;
  let endCb = onEnd;

  if (typeof rateOrOptions === 'number') {
    rawRate = Number.isFinite(rateOrOptions) && !isNaN(rateOrOptions) ? rateOrOptions : 1.0;
  } else if (typeof rateOrOptions === 'object' && rateOrOptions !== null) {
    if (typeof rateOrOptions.speed === 'number' && Number.isFinite(rateOrOptions.speed)) {
      rawRate = rateOrOptions.speed;
    } else if (typeof rateOrOptions.rate === 'number' && Number.isFinite(rateOrOptions.rate)) {
      rawRate = rateOrOptions.rate;
    }
    if (typeof rateOrOptions.onStart === 'function') startCb = rateOrOptions.onStart;
    if (typeof rateOrOptions.onEnd === 'function') endCb = rateOrOptions.onEnd;
  }

  // Safety clamp: rate must ALWAYS be a valid finite number between 0.5 (slow) and 1.5 (fast)
  const safeRate = Math.max(0.5, Math.min(1.5, Number.isFinite(rawRate) && !isNaN(rawRate) ? rawRate : 1.0));

  // Force stop any ongoing or queued synthesis
  try {
    window.speechSynthesis.cancel();
  } catch {}

  const utterance = new SpeechSynthesisUtterance(text);
  activeUtterance = utterance;

  const voice = getBestEnglishVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || 'en-US';
  } else {
    utterance.lang = 'en-US';
  }

  utterance.rate = safeRate;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  let isFinished = false;
  const finish = () => {
    if (isFinished) return;
    isFinished = true;
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    endCb?.();
  };

  utterance.onstart = () => {
    startCb?.();
  };

  utterance.onend = () => {
    finish();
  };

  utterance.onerror = (e) => {
    // Interrupted / canceled happens normally when user triggers new speech
    if (e?.error !== 'interrupted' && e?.error !== 'canceled') {
      console.warn('SpeechSynthesis error:', e);
    }
    finish();
  };

  // If Chrome or Safari is paused, resume it
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch {}

  // Timeout ensures Safari iOS and Chrome properly queue the utterance after cancel()
  const timer = setTimeout(() => {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Failed to speak utterance:', err);
      finish();
    }
  }, 25);

  return () => {
    clearTimeout(timer);
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    try {
      window.speechSynthesis.cancel();
    } catch {}
    finish();
  };
}

export function playNativeSpeech(
  text: string,
  rateOrOptions: number | SpeechPlaybackOptions = 1.0,
  onStart?: () => void,
  onEnd?: () => void
): () => void {
  // Parse polymorphic arguments
  let rawRate = 1.0;
  let startCb = onStart;
  let endCb = onEnd;
  let errorCb: ((err?: any) => void) | undefined;

  if (typeof rateOrOptions === 'number') {
    rawRate = Number.isFinite(rateOrOptions) && !isNaN(rateOrOptions) ? rateOrOptions : 1.0;
  } else if (typeof rateOrOptions === 'object' && rateOrOptions !== null) {
    if (typeof rateOrOptions.speed === 'number' && Number.isFinite(rateOrOptions.speed)) {
      rawRate = rateOrOptions.speed;
    } else if (typeof rateOrOptions.rate === 'number' && Number.isFinite(rateOrOptions.rate)) {
      rawRate = rateOrOptions.rate;
    }
    if (typeof rateOrOptions.onStart === 'function') startCb = rateOrOptions.onStart;
    if (typeof rateOrOptions.onEnd === 'function') endCb = rateOrOptions.onEnd;
    if (typeof rateOrOptions.onError === 'function') errorCb = rateOrOptions.onError;
  }

  // Safety clamp: rate must ALWAYS be a valid finite number
  const safeRate = Math.max(0.4, Math.min(2.0, Number.isFinite(rawRate) && !isNaN(rawRate) ? rawRate : 1.0));

  // If OpenAI TTS is configured and enabled, use ultra-realistic human studio voice!
  if (isHumanVoiceEnabled()) {
    // Cancel browser speech if it was speaking
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    let isCancelled = false;
    let fallbackCancel: (() => void) | null = null;

    const cancelOpenAi = playOpenAiSpeech(text, {
      speed: safeRate,
      onStart: startCb,
      onEnd: endCb,
      onError: (err) => {
        if (isCancelled) return;
        console.warn('OpenAI TTS error, falling back to browser synthesis:', err);
        fallbackCancel = playBrowserSpeechSynthesis(text, safeRate, startCb, endCb);
        errorCb?.(err);
      },
    });

    return () => {
      isCancelled = true;
      cancelOpenAi();
      if (fallbackCancel) fallbackCancel();
    };
  }

  // Fallback to browser built-in speech synthesis
  stopCurrentSpeech();
  return playBrowserSpeechSynthesis(text, safeRate, startCb, endCb);
}

// -------------------------------------------------------------
// Synthesized Sound Effects (Audio feedback)
// -------------------------------------------------------------
export function playChime(type: 'success' | 'try-again' | 'celebrate') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'success') {
      // Pleasant rising double ping (C5 -> G5)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.1); // E5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);
    } else if (type === 'try-again') {
      // Gentle soft low note
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.setValueAtTime(293.66, now + 0.15); // D4
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'celebrate') {
      // Major triad fan-fare (C5 -> E5 -> G5 -> C6)
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const now = ctx.currentTime + i * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      });
    }
  } catch (e) {
    // AudioContext blocked or not supported
  }
}
