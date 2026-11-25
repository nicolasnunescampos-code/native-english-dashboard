import { supabase, UserRole } from '@/lib/supabase';

/**
 * Center-crops an image to a square and resizes it to `maxSize x maxSize` (default 400x400),
 * encoding as WebP (or JPEG fallback) so avatars stay ~30-60 KB.
 */
export async function compressAvatarImage(file: File, maxSize = 400): Promise<{ blob: Blob; ext: string; mimeType: string }> {
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

    const encode = (type: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

    let blob = await encode('image/webp', 0.82);
    let ext = 'webp';
    let mimeType = 'image/webp';

    if (!blob || blob.type !== 'image/webp') {
      blob = await encode('image/jpeg', 0.85);
      ext = 'jpg';
      mimeType = 'image/jpeg';
    }

    if (!blob) throw new Error('Failed to compress image');
    return { blob, ext, mimeType };
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

/**
 * Compresses and uploads a user's avatar to `thumbnails/avatars/<userId>.<ext>` (overwriting any previous avatar),
 * updates Supabase Auth `user_metadata.avatar_url`, and best-effort syncs to `students`/`teachers`.
 */
export async function uploadUserAvatar(params: {
  file: File;
  userId: string;
  role: UserRole | null;
  studentId?: string | null;
  teacherName?: string | null;
}): Promise<string> {
  const { file, userId, role, studentId, teacherName } = params;
  const { blob, ext, mimeType } = await compressAvatarImage(file, 400);

  const filePath = `avatars/${userId}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('thumbnails')
    .upload(filePath, blob, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('thumbnails').getPublicUrl(filePath);
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: authErr } = await supabase.auth.updateUser({
    data: { avatar_url: publicUrl },
  });
  if (authErr) throw authErr;

  // Best-effort sync to students / teachers table (ignores if avatar_url column isn't added yet)
  if (role === 'student' && studentId) {
    await supabase
      .from('students')
      .update({ avatar_url: publicUrl })
      .eq('id', studentId)
      .then(() => {});
  } else if (role === 'teacher' && teacherName) {
    await supabase
      .from('teachers')
      .update({ avatar_url: publicUrl })
      .ilike('name', teacherName)
      .then(() => {});
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

  await supabase.storage
    .from('thumbnails')
    .remove([`avatars/${userId}.webp`, `avatars/${userId}.jpg`])
    .catch(() => {});

  if (role === 'student' && studentId) {
    await supabase
      .from('students')
      .update({ avatar_url: null })
      .eq('id', studentId)
      .then(() => {});
  } else if (role === 'teacher' && teacherName) {
    await supabase
      .from('teachers')
      .update({ avatar_url: null })
      .ilike('name', teacherName)
      .then(() => {});
  }
}
