/**
 * OpenAI Text-to-Speech (TTS) Service for Native English
 * 
 * Provides ultra-realistic, studio-grade human pronunciation for Native Quest and Speaking Lab.
 * Replaces robotic browser voices with natural native human articulation.
 * Includes IndexedDB persistent audio caching so each phrase is only generated once.
 */

import { supabase } from '@/lib/supabase';

export type OpenAiVoice = 'nova' | 'alloy' | 'echo' | 'shimmer' | 'onyx' | 'fable';

export interface VoiceOption {
  id: OpenAiVoice;
  name: string;
  gender: 'Female' | 'Male' | 'Neutral';
  accent: string;
  description: string;
  avatar: string;
}

export const OPENAI_VOICES: VoiceOption[] = [
  {
    id: 'nova',
    name: 'Nova',
    gender: 'Female',
    accent: 'American',
    description: 'Warm, natural, friendly tutor (Recommended)',
    avatar: '👩',
  },
  {
    id: 'alloy',
    name: 'Alloy',
    gender: 'Neutral',
    accent: 'American',
    description: 'Clear, balanced, studio-quality articulation',
    avatar: '🎙️',
  },
  {
    id: 'echo',
    name: 'Echo',
    gender: 'Male',
    accent: 'American',
    description: 'Mellow, conversational native male voice',
    avatar: '👨',
  },
  {
    id: 'shimmer',
    name: 'Shimmer',
    gender: 'Female',
    accent: 'American',
    description: 'Expressive, upbeat, melodic pronunciation',
    avatar: '✨',
  },
  {
    id: 'onyx',
    name: 'Onyx',
    gender: 'Male',
    accent: 'American',
    description: 'Deep, resonant, authoritative pronunciation',
    avatar: '🎩',
  },
  {
    id: 'fable',
    name: 'Fable',
    gender: 'Neutral',
    accent: 'British',
    description: 'British accent with refined phonetics',
    avatar: '🇬🇧',
  },
];

const STORAGE_KEY_API_KEY = 'native_english_openai_api_key';
const STORAGE_KEY_VOICE = 'native_english_tts_voice';
const STORAGE_KEY_ENABLED = 'native_english_tts_enabled';

const DB_NAME = 'NativeEnglishAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'tts_cache';

// In-memory cache for ultra-fast instant replay during the current session
const memoryCache = new Map<string, string>(); // cacheKey -> ObjectURL

// -------------------------------------------------------------
// IndexedDB Storage Helpers
// -------------------------------------------------------------
function openAudioDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.warn('Failed to open IndexedDB for audio cache');
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

async function getBlobFromIndexedDb(key: string): Promise<Blob | null> {
  const db = await openAudioDatabase();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result instanceof Blob) {
          resolve(result);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveBlobToIndexedDb(key: string, blob: Blob): Promise<void> {
  const db = await openAudioDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, key);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getCachedAudioCount(): Promise<number> {
  const db = await openAudioDatabase();
  if (!db) return memoryCache.size;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => resolve(memoryCache.size);
    } catch {
      resolve(memoryCache.size);
    }
  });
}

export async function clearCachedAudio(): Promise<void> {
  // Revoke memory URLs
  memoryCache.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  });
  memoryCache.clear();

  const db = await openAudioDatabase();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// -------------------------------------------------------------
// Key & Configuration Management with Supabase Platform Sync
// -------------------------------------------------------------
let inMemoryDbConfig: { apiKey?: string; voice?: OpenAiVoice; enabled?: boolean } | null = null;
let hasAttemptedDbSync = false;
let dbSyncPromise: Promise<{ apiKey?: string; voice?: OpenAiVoice; enabled?: boolean } | null> | null = null;

export function syncOpenAiConfigFromDb(): Promise<{ apiKey?: string; voice?: OpenAiVoice; enabled?: boolean } | null> {
  if (dbSyncPromise) return dbSyncPromise;

  dbSyncPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_rules')
        .select('content')
        .eq('role', 'system')
        .eq('title', 'openai_tts_config')
        .maybeSingle();

      hasAttemptedDbSync = true;

      if (error) {
        console.warn('OpenAI TTS config sync notice:', error.message);
        return inMemoryDbConfig;
      }

      if (data?.content) {
        try {
          const parsed = JSON.parse(data.content);
          inMemoryDbConfig = {
            apiKey: parsed.apiKey || '',
            voice: parsed.voice || 'nova',
            enabled: parsed.enabled !== undefined ? !!parsed.enabled : true,
          };
          // Also keep in localStorage as fast offline cache
          if (typeof window !== 'undefined') {
            if (parsed.apiKey) localStorage.setItem(STORAGE_KEY_API_KEY, parsed.apiKey);
            if (parsed.voice) localStorage.setItem(STORAGE_KEY_VOICE, parsed.voice);
            if (parsed.enabled !== undefined) localStorage.setItem(STORAGE_KEY_ENABLED, parsed.enabled ? 'true' : 'false');
          }
          return inMemoryDbConfig;
        } catch {
          // invalid JSON, ignore
        }
      }
    } catch (err) {
      console.warn('Failed to sync OpenAI TTS config from DB:', err);
    }
    return inMemoryDbConfig;
  })();

  return dbSyncPromise;
}

// Automatically sync OpenAI TTS settings from Supabase in the background
if (typeof window !== 'undefined') {
  syncOpenAiConfigFromDb();
}

export async function saveOpenAiConfigToDb(config: { apiKey: string; voice: OpenAiVoice; enabled: boolean }): Promise<void> {
  // 1. Save locally
  setOpenAiApiKey(config.apiKey);
  setPreferredVoice(config.voice);
  setHumanVoiceEnabled(config.enabled);

  inMemoryDbConfig = { ...config };
  dbSyncPromise = Promise.resolve(inMemoryDbConfig);

  // 2. Persist to Supabase dashboard_rules so all student devices load it automatically
  try {
    const payload = JSON.stringify({
      apiKey: config.apiKey.trim(),
      voice: config.voice,
      enabled: config.enabled,
      updated_at: new Date().toISOString(),
    });

    const { data: existing } = await supabase
      .from('dashboard_rules')
      .select('id')
      .eq('role', 'system')
      .eq('title', 'openai_tts_config')
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('dashboard_rules')
        .update({
          content: payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('dashboard_rules')
        .insert({
          role: 'system',
          title: 'openai_tts_config',
          content: payload,
          order_index: 999,
        });
    }
  } catch (err) {
    console.warn('Could not persist OpenAI config to Supabase:', err);
  }
}

export function getOpenAiApiKey(): string {
  if (typeof window === 'undefined') return '';
  const local = localStorage.getItem(STORAGE_KEY_API_KEY) || '';
  if (local.trim()) return local.trim();

  if (inMemoryDbConfig?.apiKey?.trim()) {
    return inMemoryDbConfig.apiKey.trim();
  }

  // Also check Vite environment variable if injected
  const envKey = (import.meta as any).env?.VITE_OPENAI_API_KEY || '';
  return envKey.trim();
}

export function setOpenAiApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = apiKey.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY_API_KEY, trimmed);
    localStorage.setItem(STORAGE_KEY_ENABLED, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEY_API_KEY);
  }
}

export function hasOpenAiKey(): boolean {
  return getOpenAiApiKey().length > 10;
}

export function isHumanVoiceEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (!hasOpenAiKey()) return false;

  const isEnabled = localStorage.getItem(STORAGE_KEY_ENABLED);
  if (isEnabled !== null) return isEnabled === 'true';

  if (inMemoryDbConfig?.enabled !== undefined) {
    return inMemoryDbConfig.enabled;
  }

  // Default to true if key is present
  return true;
}

export function setHumanVoiceEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_ENABLED, enabled ? 'true' : 'false');
}

export function getPreferredVoice(): OpenAiVoice {
  if (typeof window === 'undefined') return 'nova';
  const saved = localStorage.getItem(STORAGE_KEY_VOICE) as OpenAiVoice;
  if (saved && OPENAI_VOICES.some((v) => v.id === saved)) {
    return saved;
  }
  if (inMemoryDbConfig?.voice && OPENAI_VOICES.some((v) => v.id === inMemoryDbConfig?.voice)) {
    return inMemoryDbConfig.voice;
  }
  return 'nova';
}

export function setPreferredVoice(voice: OpenAiVoice): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_VOICE, voice);
}

// -------------------------------------------------------------
// Audio Generation & Playback
// -------------------------------------------------------------
function makeCacheKey(text: string, voice: string, speed: number): string {
  const normalizedText = text.trim().toLowerCase().replace(/\s+/g, ' ');
  const safeSpeed = Number.isFinite(speed) && !isNaN(speed) ? speed : 1.0;
  const roundedSpeed = Math.round(safeSpeed * 100) / 100;
  return `tts_${voice}_${roundedSpeed}_${normalizedText}`;
}

/**
 * Fetch or load cached audio URL for the given sentence.
 */
export async function getOpenAiAudioUrl(
  text: string,
  options?: {
    voice?: OpenAiVoice;
    speed?: number;
    signal?: AbortSignal;
  }
): Promise<string> {
  const voice = options?.voice || getPreferredVoice();
  // OpenAI TTS speed is between 0.25 and 4.0 (we clamp to language-learner range: 0.5 - 1.5)
  const rawSpeed = typeof options?.speed === 'number' && Number.isFinite(options.speed) && !isNaN(options.speed)
    ? options.speed
    : 1.0;
  const speed = Math.max(0.5, Math.min(1.5, rawSpeed));
  const cacheKey = makeCacheKey(text, voice, speed);

  // 1. Check in-memory session cache (0ms)
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 2. Check IndexedDB persistent cache
  const cachedBlob = await getBlobFromIndexedDb(cacheKey);
  if (cachedBlob) {
    const objectUrl = URL.createObjectURL(cachedBlob);
    memoryCache.set(cacheKey, objectUrl);
    return objectUrl;
  }

  // 3. Request audio from OpenAI Text-to-Speech API
  let apiKey = getOpenAiApiKey();
  if (!apiKey && dbSyncPromise) {
    try {
      await dbSyncPromise;
      apiKey = getOpenAiApiKey();
    } catch {
      // ignore
    }
  }

  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice,
      speed,
      response_format: 'mp3',
    }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    let parsedErr = '';
    try {
      const json = JSON.parse(errText);
      parsedErr = json.error?.message || errText;
    } catch {
      parsedErr = errText;
    }
    throw new Error(parsedErr || `OpenAI TTS error: ${response.status}`);
  }

  const blob = await response.blob();

  // Save to persistent IndexedDB cache
  await saveBlobToIndexedDb(cacheKey, blob);

  // Create and cache memory URL
  const objectUrl = URL.createObjectURL(blob);
  memoryCache.set(cacheKey, objectUrl);

  return objectUrl;
}

let activeAudioElement: HTMLAudioElement | null = null;
let activeAbortController: AbortController | null = null;

/**
 * Play sentence with human-grade OpenAI voice pronunciation.
 * Returns a cancel function.
 */
export function playOpenAiSpeech(
  text: string,
  options?: {
    speed?: number;
    voice?: OpenAiVoice;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): () => void {
  // Stop any currently playing audio
  stopCurrentSpeech();

  const abortController = new AbortController();
  activeAbortController = abortController;

  let isCancelled = false;

  const cancel = () => {
    isCancelled = true;
    if (activeAbortController === abortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    if (activeAudioElement) {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement = null;
    }
    options?.onEnd?.();
  };

  (async () => {
    try {
      const audioUrl = await getOpenAiAudioUrl(text, {
        speed: options?.speed,
        voice: options?.voice,
        signal: abortController.signal,
      });

      if (isCancelled) return;

      const audio = new Audio(audioUrl);
      activeAudioElement = audio;

      audio.onplay = () => {
        if (!isCancelled) {
          options?.onStart?.();
        }
      };

      audio.onended = () => {
        if (activeAudioElement === audio) {
          activeAudioElement = null;
        }
        options?.onEnd?.();
      };

      audio.onerror = (e) => {
        if (activeAudioElement === audio) {
          activeAudioElement = null;
        }
        if (!isCancelled) {
          options?.onError?.(e);
          options?.onEnd?.();
        }
      };

      await audio.play();
    } catch (err: any) {
      if (!isCancelled && err?.name !== 'AbortError') {
        options?.onError?.(err);
        options?.onEnd?.();
      }
    }
  })();

  return cancel;
}

export function stopCurrentSpeech(): void {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
}
