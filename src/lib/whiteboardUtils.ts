import { supabase } from '@/lib/supabase';
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';

export const WHITEBOARD_RETENTION_DAYS = 10;

const WHITEBOARD_TAG_REGEX = /\[Whiteboard:\s*(https?:\/\/[^\s\]]+)\]/i;

export type WhiteboardStatus = {
  url: string;
  daysLeft: number;
  isExpired: boolean;
  expiresAt: Date | null;
};

/**
 * Extracts the raw whiteboard screenshot URL from `cls.whiteboard_url`
 * or the fallback `[Whiteboard: <url>]` tag in `cls.notes`, ignoring expiration.
 */
export function extractRawWhiteboardUrl(
  cls?: { whiteboard_url?: string | null; notes?: string | null } | null
): string | null {
  if (!cls) return null;
  if (cls.whiteboard_url && cls.whiteboard_url.trim()) {
    return cls.whiteboard_url.trim();
  }
  if (cls.notes) {
    const match = cls.notes.match(WHITEBOARD_TAG_REGEX);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

/**
 * Returns the whiteboard URL and 14-day expiration metadata.
 * Returns `null` if no screenshot exists or if it has expired (> 14 days since class date).
 */
export function getWhiteboardStatus(
  cls?: { date?: string; whiteboard_url?: string | null; notes?: string | null } | null
): WhiteboardStatus | null {
  const url = extractRawWhiteboardUrl(cls);
  if (!url) return null;

  if (!cls?.date) {
    return { url, daysLeft: WHITEBOARD_RETENTION_DAYS, isExpired: false, expiresAt: null };
  }

  try {
    const classDate = parseISO(cls.date);
    const expiresAt = addDays(classDate, WHITEBOARD_RETENTION_DAYS);
    const daysLeft = differenceInCalendarDays(expiresAt, new Date());
    const isExpired = daysLeft < 0;
    if (isExpired) return null;
    return { url, daysLeft, isExpired: false, expiresAt };
  } catch {
    return { url, daysLeft: WHITEBOARD_RETENTION_DAYS, isExpired: false, expiresAt: null };
  }
}

/**
 * Extracts the active (non-expired) whiteboard screenshot URL.
 */
export function extractWhiteboardUrl(
  cls?: { date?: string; whiteboard_url?: string | null; notes?: string | null } | null
): string | null {
  return getWhiteboardStatus(cls)?.url ?? null;
}

/**
 * Removes any fallback `[Whiteboard: <url>]` tag from class notes before displaying.
 */
export function stripWhiteboardTag(notes?: string | null): string {
  if (!notes) return '';
  return notes
    .replace(/\[Whiteboard:\s*https?:\/\/[^\s\]]+\]/gi, '')
    .trim();
}

/**
 * Appends a fallback `[Whiteboard: <url>]` tag to notes when the
 * `whiteboard_url` column is not yet present in Supabase.
 */
export function appendWhiteboardTag(notes: string | null | undefined, url: string): string {
  const cleaned = stripWhiteboardTag(notes);
  return cleaned ? `${cleaned}\n[Whiteboard: ${url}]` : `[Whiteboard: ${url}]`;
}

/**
 * Uploads a whiteboard screenshot image to Supabase Storage (`thumbnails` bucket)
 * and returns its public URL.
 */
export async function uploadWhiteboardScreenshot(
  file: File,
  classId: number | string
): Promise<string> {
  const extFromName = file.name.includes('.') ? file.name.split('.').pop() : '';
  const extFromMime = file.type.split('/')[1] || 'png';
  const ext = (extFromName || extFromMime).replace(/[^a-zA-Z0-9]/g, '') || 'png';
  const filePath = `whiteboards/${classId}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('thumbnails')
    .upload(filePath, file, {
      contentType: file.type || 'image/png',
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('thumbnails').getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Best-effort cleanup of whiteboard screenshots older than 14 days from Supabase Storage
 * (`thumbnails/whiteboards/`) and `classes.whiteboard_url`. Runs at most once per browser session.
 */
export async function cleanupExpiredWhiteboards(): Promise<void> {
  if (typeof window !== 'undefined') {
    if (sessionStorage.getItem('wb_cleanup_done')) return;
    sessionStorage.setItem('wb_cleanup_done', '1');
  }

  try {
    const cutoffMs = Date.now() - WHITEBOARD_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const { data: files, error } = await supabase.storage
      .from('thumbnails')
      .list('whiteboards', { limit: 200 });

    if (!error && files && files.length > 0) {
      const expiredPaths: string[] = [];
      for (const f of files) {
        // Filename format: <classId>_<timestamp>.<ext>
        const match = f.name.match(/^[^_]+_(\d+)\./);
        const ts = match ? Number(match[1]) : f.created_at ? Date.parse(f.created_at) : NaN;
        if (!isNaN(ts) && ts < cutoffMs) {
          expiredPaths.push(`whiteboards/${f.name}`);
        }
      }

      if (expiredPaths.length > 0) {
        await supabase.storage.from('thumbnails').remove(expiredPaths);
      }
    }

    // Clear expired whiteboard_url references on classes older than 14 days
    const cutoffDate = addDays(new Date(), -WHITEBOARD_RETENTION_DAYS - 1)
      .toISOString()
      .slice(0, 10);
    await supabase
      .from('classes')
      .update({ whiteboard_url: null })
      .lt('date', cutoffDate)
      .not('whiteboard_url', 'is', null);
  } catch {
    // Non-blocking best-effort cleanup
  }
}
