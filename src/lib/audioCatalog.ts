import { supabase, Audio } from './supabase';

export const AUDIO_CATEGORIES = ['Beginner', 'Intermediate', 'Advanced 1', 'Advanced 2'] as const;

export interface ExtendedAudio extends Audio {
  storage_path?: string;
}

export interface UnlinkedStorageAudio {
  name: string;
  url: string;
  suggestedTitle: string;
  suggestedCategory: string;
  createdAt?: string;
}

const CATEGORY_PREFIX_REGEX = /^\[Category:\s*([^\]]+)\]\s*/i;
const DELETED_URLS_STORAGE_KEY = 'native_deleted_audio_urls';

function getDeletedUrlsLocal(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_URLS_STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function markUrlDeletedLocal(url: string) {
  try {
    const set = getDeletedUrlsLocal();
    set.add(url);
    localStorage.setItem(DELETED_URLS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore storage errors
  }
}

export function encodeCategoryInDescription(category: string, description?: string): string {
  const cleanDesc = (description || '').replace(CATEGORY_PREFIX_REGEX, '').trim();
  const safeCategory = category || 'Beginner';
  return cleanDesc ? `[Category: ${safeCategory}] ${cleanDesc}` : `[Category: ${safeCategory}]`;
}

export function parseCategoryAndDescription(rawCategory?: string | null, rawDescription?: string | null, title?: string): {
  category: string;
  description: string;
} {
  const desc = rawDescription || '';
  const match = desc.match(CATEGORY_PREFIX_REGEX);

  if (rawCategory && rawCategory.trim()) {
    return {
      category: rawCategory.trim(),
      description: match ? desc.replace(CATEGORY_PREFIX_REGEX, '').trim() : desc,
    };
  }

  if (match && match[1]) {
    return {
      category: match[1].trim(),
      description: desc.replace(CATEGORY_PREFIX_REGEX, '').trim(),
    };
  }

  // Infer from title if no explicit category was stored
  const lowerTitle = (title || '').toLowerCase();
  if (lowerTitle.includes('advanced 2') || lowerTitle.includes('advanced (2)')) {
    return { category: 'Advanced 2', description: desc };
  }
  if (lowerTitle.includes('advanced')) {
    return { category: 'Advanced 1', description: desc };
  }
  if (lowerTitle.includes('intermediate')) {
    return { category: 'Intermediate', description: desc };
  }

  return { category: 'Beginner', description: desc };
}

function toHex(str: string): string {
  const bytes = new TextEncoder().encode(str);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): string {
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

interface CatalogMetaPayload {
  t: string; // title
  c: string; // category
  d: string; // description
  u?: string; // optional external url (for recovered files)
}

function encodeCatalogFilename(meta: CatalogMetaPayload, ext: string): string {
  const payload: CatalogMetaPayload = {
    t: (meta.t || 'Audio Track').slice(0, 80),
    c: meta.c || 'Beginner',
    d: (meta.d || '').slice(0, 120),
    ...(meta.u ? { u: meta.u } : {}),
  };
  const hex = toHex(JSON.stringify(payload));
  const safeExt = (ext || 'mp3').replace(/[^a-zA-Z0-9]/g, '') || 'mp3';
  return `catalog/${Date.now()}__${hex}.${safeExt}`;
}

function decodeCatalogItem(fileName: string, createdAt?: string): ExtendedAudio | null {
  if (!fileName || fileName === '.emptyFolderPlaceholder' || fileName.startsWith('deleted__')) {
    return null;
  }

  const parts = fileName.split('__');
  if (parts.length < 2) return null;

  const timestampStr = parts[0];
  const rest = parts.slice(1).join('__');
  const dotIndex = rest.lastIndexOf('.');
  const hexPart = dotIndex !== -1 ? rest.slice(0, dotIndex) : rest;

  const decodedJson = fromHex(hexPart);
  if (!decodedJson) return null;

  try {
    const parsed = JSON.parse(decodedJson) as CatalogMetaPayload;
    const storagePath = `catalog/${fileName}`;
    const { data } = supabase.storage.from('audio-materials').getPublicUrl(storagePath);
    const url = parsed.u || data.publicUrl;
    const numericId = Number(timestampStr) || Date.now();

    return {
      id: numericId,
      title: parsed.t || 'Audio Material',
      category: parsed.c || 'Beginner',
      description: parsed.d || '',
      url,
      created_at: createdAt,
      storage_path: storagePath,
    };
  } catch {
    return null;
  }
}

export function normalizeAudioRow(row: any): ExtendedAudio {
  const { category, description } = parseCategoryAndDescription(
    row.category,
    row.description,
    row.title
  );
  return {
    id: row.id,
    title: row.title,
    description,
    category,
    url: row.url,
    created_at: row.created_at,
  };
}

export async function fetchAllAudios(): Promise<ExtendedAudio[]> {
  const deletedUrls = getDeletedUrlsLocal();
  const byUrl = new Map<string, ExtendedAudio>();

  // 1. Fetch from `audios` table
  try {
    const { data, error } = await supabase
      .from('audios')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) {
      for (const row of data) {
        const normalized = normalizeAudioRow(row);
        if (normalized.url && !deletedUrls.has(normalized.url)) {
          byUrl.set(normalized.url, normalized);
        }
      }
    }
  } catch (err) {
    console.warn('Could not read from audios table:', err);
  }

  // 2. Also fetch from `audio-materials/catalog` storage folder (fallback when DB table lacks category column or RLS blocks DB insert)
  try {
    const { data: catalogFiles, error: listErr } = await supabase.storage
      .from('audio-materials')
      .list('catalog', {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (!listErr && catalogFiles) {
      // Collect any tombstone deletion markers in catalog/
      for (const file of catalogFiles) {
        if (file.name.startsWith('deleted__')) {
          const hexUrl = file.name.replace(/^deleted__/, '').replace(/\.[^.]+$/, '');
          const deletedUrl = fromHex(hexUrl);
          if (deletedUrl) {
            deletedUrls.add(deletedUrl);
            byUrl.delete(deletedUrl);
          }
        }
      }

      for (const file of catalogFiles) {
        const item = decodeCatalogItem(file.name, file.created_at || undefined);
        if (item && item.url && !deletedUrls.has(item.url)) {
          if (!byUrl.has(item.url)) {
            byUrl.set(item.url, item);
          } else {
            // Attach storage_path to existing DB item so delete can clean up both
            const existing = byUrl.get(item.url)!;
            existing.storage_path = item.storage_path;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not list audio-materials/catalog:', err);
  }

  return Array.from(byUrl.values()).sort((a, b) => (b.id || 0) - (a.id || 0));
}

export async function insertAudioRecordToDb(params: {
  title: string;
  description: string;
  category: string;
  url: string;
}): Promise<{ dbSaved: boolean; error?: any }> {
  const { title, description, category, url } = params;

  // Attempt 1: Insert with `category` column
  const { error: firstError } = await supabase.from('audios').insert({
    title,
    description: description.trim(),
    category,
    url,
  });

  if (!firstError) {
    return { dbSaved: true };
  }

  // Attempt 2: If `category` column does not exist in schema cache (PGRST204 / 42703), encode category in `description`
  const isMissingCategoryColumn =
    firstError.code === 'PGRST204' ||
    firstError.code === '42703' ||
    (firstError.message && firstError.message.toLowerCase().includes('category'));

  if (isMissingCategoryColumn) {
    const encodedDescription = encodeCategoryInDescription(category, description);
    const { error: secondError } = await supabase.from('audios').insert({
      title,
      description: encodedDescription,
      url,
    });

    if (!secondError) {
      return { dbSaved: true };
    }
    return { dbSaved: false, error: secondError };
  }

  return { dbSaved: false, error: firstError };
}

export async function uploadAndSaveAudio(params: {
  title: string;
  description: string;
  category: string;
  audioFile: File;
}): Promise<ExtendedAudio> {
  const { title, description, category, audioFile } = params;
  const fileExt = audioFile.name.split('.').pop() || 'mp3';

  // Upload to `audio-materials/catalog/...` so metadata is preserved even if DB table lacks columns or RLS blocks insert
  const catalogFilePath = encodeCatalogFilename(
    {
      t: title.trim(),
      c: category,
      d: description.trim(),
    },
    fileExt
  );

  let publicUrl = '';
  let uploadedStoragePath: string | undefined = catalogFilePath;

  const { error: uploadError } = await supabase.storage
    .from('audio-materials')
    .upload(catalogFilePath, audioFile, {
      contentType: audioFile.type || 'audio/mpeg',
      upsert: false,
    });

  if (!uploadError) {
    const { data } = supabase.storage.from('audio-materials').getPublicUrl(catalogFilePath);
    publicUrl = data.publicUrl;
  } else {
    // Fallback to `thumbnails` bucket if `audio-materials` has any storage policy issue
    const fallbackPath = `audios/${Date.now()}_${audioFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: fallbackUploadErr } = await supabase.storage
      .from('thumbnails')
      .upload(fallbackPath, audioFile, {
        contentType: audioFile.type || 'audio/mpeg',
        upsert: false,
      });

    if (fallbackUploadErr) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('thumbnails').getPublicUrl(fallbackPath);
    publicUrl = data.publicUrl;
    uploadedStoragePath = undefined;
  }

  // Insert into `public.audios` table (with automatic fallback for missing `category` column)
  const { dbSaved, error: dbError } = await insertAudioRecordToDb({
    title: title.trim(),
    description: description.trim(),
    category,
    url: publicUrl,
  });

  if (!dbSaved && !uploadedStoragePath) {
    throw dbError || new Error('Failed to save audio record');
  }

  return {
    id: Date.now(),
    title: title.trim(),
    description: description.trim(),
    category,
    url: publicUrl,
    storage_path: uploadedStoragePath,
  };
}

export async function recoverStorageAudio(params: {
  title: string;
  description: string;
  category: string;
  url: string;
}): Promise<void> {
  const { title, description, category, url } = params;

  const { dbSaved } = await insertAudioRecordToDb({
    title: title.trim(),
    description: description.trim(),
    category,
    url,
  });

  // Also write a small catalog pointer in `audio-materials/catalog` if DB insert was blocked by RLS
  if (!dbSaved) {
    const pointerPath = encodeCatalogFilename(
      {
        t: title.trim(),
        c: category,
        d: description.trim(),
        u: url,
      },
      'mp3'
    );
    const tinyBlob = new Blob(['ID3'], { type: 'audio/mpeg' });
    const { error } = await supabase.storage
      .from('audio-materials')
      .upload(pointerPath, tinyBlob, { contentType: 'audio/mpeg' });
    if (error) throw error;
  }
}

export async function deleteAudioRecord(audio: ExtendedAudio): Promise<void> {
  if (audio.url) {
    markUrlDeletedLocal(audio.url);
  }

  // 1. Try deleting from `audios` DB table by id or url
  try {
    if (audio.id) {
      await supabase.from('audios').delete().eq('id', audio.id);
    }
    if (audio.url) {
      await supabase.from('audios').delete().eq('url', audio.url);
    }
  } catch (err) {
    console.warn('Error deleting from audios table:', err);
  }

  // 2. If backed by `audio-materials/catalog`, remove or write deletion marker
  if (audio.storage_path) {
    const { error: rmError } = await supabase.storage
      .from('audio-materials')
      .remove([audio.storage_path]);

    if (rmError && audio.url) {
      // If DELETE policy isn't enabled on storage bucket, write a tiny tombstone marker
      const markerPath = `catalog/deleted__${toHex(audio.url)}.mp3`;
      const tinyBlob = new Blob([''], { type: 'audio/mpeg' });
      await supabase.storage
        .from('audio-materials')
        .upload(markerPath, tinyBlob, { contentType: 'audio/mpeg' });
    }
  }
}

function cleanHumanTitleFromStorageName(rawName: string): {
  cleanKey: string;
  suggestedTitle: string;
  suggestedCategory: string;
} {
  // Strip leading timestamp like `1792525403916_`
  const withoutTs = rawName.replace(/^\d+_/, '');
  // Strip extension and duplicate extension like `_mp3.mp3` or `_wav.wav`
  const withoutExt = withoutTs
    .replace(/\.(mp3|wav|m4a|ogg)$/i, '')
    .replace(/_(mp3|wav|m4a|ogg)$/i, '');

  const readable = withoutExt.replace(/_+/g, ' ').trim();
  const cleanKey = readable.toLowerCase();

  let suggestedCategory = 'Beginner';
  if (cleanKey.includes('advanced 2') || cleanKey.includes('advanced (2)')) {
    suggestedCategory = 'Advanced 2';
  } else if (cleanKey.includes('advanced')) {
    suggestedCategory = 'Advanced 1';
  } else if (cleanKey.includes('intermediate')) {
    suggestedCategory = 'Intermediate';
  }

  return {
    cleanKey,
    suggestedTitle: readable || rawName,
    suggestedCategory,
  };
}

export async function listUnlinkedStorageAudios(existingAudios: ExtendedAudio[]): Promise<UnlinkedStorageAudio[]> {
  try {
    const { data: files, error } = await supabase.storage
      .from('audio-materials')
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error || !files) return [];

    const existingUrls = new Set(existingAudios.map((a) => a.url));
    const existingTitles = new Set(existingAudios.map((a) => a.title.toLowerCase().trim()));
    const deletedUrls = getDeletedUrlsLocal();
    const seenCleanKeys = new Set<string>();
    const results: UnlinkedStorageAudio[] = [];

    for (const file of files) {
      if (!file.name || file.name === '.emptyFolderPlaceholder') continue;
      if (!/\.(mp3|wav|m4a|ogg)$/i.test(file.name)) continue;

      const { data } = supabase.storage.from('audio-materials').getPublicUrl(file.name);
      const publicUrl = data.publicUrl;

      if (existingUrls.has(publicUrl) || deletedUrls.has(publicUrl)) continue;

      const { cleanKey, suggestedTitle, suggestedCategory } = cleanHumanTitleFromStorageName(file.name);
      if (seenCleanKeys.has(cleanKey) || existingTitles.has(cleanKey)) continue;

      seenCleanKeys.add(cleanKey);
      results.push({
        name: file.name,
        url: publicUrl,
        suggestedTitle,
        suggestedCategory,
        createdAt: file.created_at || undefined,
      });
    }

    return results;
  } catch {
    return [];
  }
}
