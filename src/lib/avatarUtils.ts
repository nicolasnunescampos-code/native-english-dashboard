import { supabase, UserRole } from '@/lib/supabase';

/**
 * Center-crops an image to a square and resizes it to `maxSize x maxSize`,
 * encoding as WebP (or JPEG fallback) so avatars stay very small (~5-50 KB).
 */
export async function compressAvatarImage(
  file: File,
  maxSize = 400,
  quality = 0.82
): Promise<{ blob: Blob; ext: string; mimeType: string }> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not load image'));
      el.src = bitmapUrl;
    });

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = Math.floor((img.naturalWidth - side) / 2);
    const sy = Math.floor((img.naturalHeight - side) / 2);
    const targetSize = Math.min(side, maxSize);

    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);

    const encode = (type: string, q: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));

    let blob = await encode('image/webp', quality);
    let ext = 'webp';
    let mimeType = 'image/webp';

    if (!blob || blob.type !== 'image/webp') {
      blob = await encode('image/jpeg', quality);
      ext = 'jpg';
      mimeType = 'image/jpeg';
    }

    if (!blob) throw new Error('Failed to compress image');
    return { blob, ext, mimeType };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to read image data'));
    };
    reader.onerror = () => reject(new Error('Failed to read image data'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Compresses and saves a user's avatar.
 * Tries Supabase Storage (`thumbnails/avatars/`) first; if Storage RLS blocks non-admin roles,
 * automatically falls back to a compact 200x200 WebP data URL stored in Supabase Auth `user_metadata`.
 */
export async function uploadUserAvatar(params: {
  file: File;
  userId: string;
  role: UserRole | null;
  studentId?: string | null;
  teacherName?: string | null;
}): Promise<string> {
  const { file, userId, role, studentId, teacherName } = params;
  const { blob, ext, mimeType } = await compressAvatarImage(file, 400, 0.82);

  let publicUrl: string | null = null;

  const filePath = `avatars/${userId}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('thumbnails')
    .upload(filePath, blob, {
      contentType: mimeType,
      upsert: true,
    });

  if (!uploadError) {
    const { data } = supabase.storage.from('thumbnails').getPublicUrl(filePath);
    publicUrl = `${data.publicUrl}?v=${Date.now()}`;
  } else {
    // Fallback for teachers/students if storage.objects RLS blocks uploads to `thumbnails`
    const { blob: compactBlob } = await compressAvatarImage(file, 200, 0.75);
    publicUrl = await blobToDataUrl(compactBlob);
  }

  const { error: authErr } = await supabase.auth.updateUser({
    data: { avatar_url: publicUrl },
  });
  if (authErr) throw authErr;

  // Best-effort sync to students / teachers table (ignores if column or RLS blocks it)
  try {
    if (role === 'student' && studentId) {
      await supabase
        .from('students')
        .update({ avatar_url: publicUrl })
        .eq('id', studentId);
    } else if (role === 'teacher' && teacherName) {
      await supabase
        .from('teachers')
        .update({ avatar_url: publicUrl })
        .ilike('name', teacherName);
    }
  } catch {
    // Non-blocking
  }

  return publicUrl;
}

/**
 * Removes the current user's avatar from Auth metadata and best-effort from Storage/DB.
 */
export async function removeUserAvatar(params: {
  userId: string;
  role: UserRole | null;
  studentId?: string | null;
  teacherName?: string | null;
}): Promise<void> {
  const { userId, role, studentId, teacherName } = params;

  const { error: authErr } = await supabase.auth.updateUser({
    data: { avatar_url: null },
  });
  if (authErr) throw authErr;

  try {
    await supabase.storage
      .from('thumbnails')
      .remove([`avatars/${userId}.webp`, `avatars/${userId}.jpg`]);
  } catch {
    // Non-blocking
  }

  try {
    if (role === 'student' && studentId) {
      await supabase
        .from('students')
        .update({ avatar_url: null })
        .eq('id', studentId);
    } else if (role === 'teacher' && teacherName) {
      await supabase
        .from('teachers')
        .update({ avatar_url: null })
        .ilike('name', teacherName);
    }
  } catch {
    // Non-blocking
  }
}
