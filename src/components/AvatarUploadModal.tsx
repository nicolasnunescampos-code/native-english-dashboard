import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { uploadUserAvatar, removeUserAvatar } from '@/lib/avatarUtils';
import { toast } from 'sonner';
import { Camera, Trash2, Upload, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  src?: string | null;
  initials: string;
  alt?: string;
  className?: string;
  textClassName?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  initials,
  alt = 'Profile picture',
  className,
  textClassName,
}) => {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setImgError(true)}
        className={cn('object-cover rounded-xl shrink-0', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl bg-sky-500/15 dark:bg-sky-400/20 border border-sky-400/30 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-300 font-bold',
        className,
        textClassName
      )}
    >
      {initials}
    </div>
  );
};

interface AvatarUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initials: string;
  displayName: string;
}

export const AvatarUploadDialog: React.FC<AvatarUploadDialogProps> = ({
  open,
  onOpenChange,
  initials,
  displayName,
}) => {
  const { user, role, studentId, teacherName, avatarUrl, updateAvatarUrl } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetSelection();
    onOpenChange(nextOpen);
  };

  const handleFileChange = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file (PNG, JPG, WEBP).');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!user?.id || !selectedFile) return;
    setSaving(true);
    try {
      const url = await uploadUserAvatar({
        file: selectedFile,
        userId: user.id,
        role,
        studentId,
        teacherName,
      });
      updateAvatarUrl(url);
      toast.success('Profile picture updated!');
      handleClose(false);
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      toast.error(err?.message || 'Failed to upload profile picture');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await removeUserAvatar({
        userId: user.id,
        role,
        studentId,
        teacherName,
      });
      updateAvatarUrl(null);
      toast.success('Profile picture removed');
      handleClose(false);
    } catch (err: any) {
      console.error('Error removing avatar:', err);
      toast.error('Failed to remove profile picture');
    } finally {
      setSaving(false);
    }
  };

  const activeSrc = previewUrl || avatarUrl;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-sky-600" />
            Profile Picture
          </DialogTitle>
          <DialogDescription>
            Upload a photo for {displayName}. It is automatically resized and compressed to save storage.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileChange(e.dataTransfer.files?.[0]);
            }}
            className="relative group cursor-pointer"
          >
            <UserAvatar
              src={activeSrc}
              initials={initials}
              alt={displayName}
              className="w-28 h-28 rounded-full border-2 border-sky-400/40 shadow-md"
              textClassName="text-2xl"
            />
            <div className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              <Camera className="w-6 h-6" />
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0])}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
            className="gap-1.5 rounded-xl"
          >
            <Upload className="w-4 h-4" />
            {selectedFile ? 'Choose Another Photo' : 'Choose Photo'}
          </Button>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {avatarUrl && !selectedFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={saving}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!selectedFile || saving}
              className="gap-1.5"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Photo'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
