import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, ExternalLink, Download, Clock } from 'lucide-react';
import { addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import { WHITEBOARD_RETENTION_DAYS } from '@/lib/whiteboardUtils';

interface WhiteboardViewerProps {
  url: string;
  subtitle?: string;
  classDate?: string;
  compact?: boolean;
}

/**
 * Displays a clickable whiteboard thumbnail/button that opens a full-size
 * lightbox modal with a 14-day expiration notice and a Save/Download button.
 */
export const WhiteboardViewer: React.FC<WhiteboardViewerProps> = ({
  url,
  subtitle,
  classDate,
  compact = false,
}) => {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  let daysLeft: number | null = null;
  if (classDate) {
    try {
      const expiresAt = addDays(parseISO(classDate), WHITEBOARD_RETENTION_DAYS);
      daysLeft = Math.max(0, differenceInCalendarDays(expiresAt, new Date()));
    } catch {
      daysLeft = null;
    }
  }

  const expiryText =
    daysLeft === null
      ? `Available for ${WHITEBOARD_RETENTION_DAYS} days — save to study!`
      : daysLeft === 0
      ? 'Expires today — save it now!'
      : daysLeft === 1
      ? 'Expires in 1 day — save it to study!'
      : `Available for ${daysLeft} days — save to study!`;

  const isUrgent = daysLeft !== null && daysLeft <= 3;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `whiteboard-${classDate || 'class'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {compact ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="h-7 px-2.5 text-xs gap-1.5 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          Whiteboard
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group mt-3 w-full text-left rounded-xl border border-indigo-200/80 dark:border-indigo-800/50 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 transition-colors p-2.5 flex items-center gap-3 cursor-pointer"
        >
          <div className="w-16 h-11 rounded-lg overflow-hidden border bg-white dark:bg-slate-900 shrink-0">
            <img
              src={url}
              alt="Class whiteboard screenshot"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                Class Whiteboard Screenshot
              </p>
              <Badge
                variant="outline"
                className={
                  isUrgent
                    ? 'text-[10px] py-0 px-1.5 border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 gap-1'
                    : 'text-[10px] py-0 px-1.5 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 gap-1'
                }
              >
                <Clock className="w-2.5 h-2.5" />
                {daysLeft !== null
                  ? daysLeft === 0
                    ? 'Expires today'
                    : `${daysLeft}d left`
                  : `${WHITEBOARD_RETENTION_DAYS}d limit`}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {expiryText}
            </p>
          </div>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between gap-4 pr-6 flex-wrap">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Grammar Class Whiteboard
              </DialogTitle>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
                className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Download className="w-3.5 h-3.5" />
                {downloading ? 'Saving...' : 'Save Screenshot'}
              </Button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline px-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open
              </a>
            </div>
          </DialogHeader>

          <div
            className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 border ${
              isUrgent
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                : 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200/70 dark:border-indigo-800/50 text-indigo-800 dark:text-indigo-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>
              <strong>{expiryText}</strong> Whiteboard screenshots are automatically deleted after {WHITEBOARD_RETENTION_DAYS} days.
            </span>
          </div>

          <div className="mt-1 overflow-auto rounded-xl border bg-white dark:bg-slate-950 flex items-center justify-center p-2">
            <img
              src={url}
              alt="Class whiteboard screenshot"
              className="max-w-full max-h-[68vh] object-contain rounded-lg"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
