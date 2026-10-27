import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Zap,
  Sparkles,
  Mic,
  ArrowRight,
  BookOpen,
  Award,
  Trophy,
  X,
  CheckCircle2,
} from 'lucide-react';
import { ChapterNodeData } from './DuolingoPathNode';

interface DuolingoChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterData: ChapterNodeData | null;
  book: string;
  skillMode: 'mix' | 'grammar' | 'speaking';
  onSkillModeChange: (mode: 'mix' | 'grammar' | 'speaking') => void;
  onStartRound: (chapter: string) => void;
  onOpenGuidebook: (chapter: string) => void;
  onOpenMedal: (chapter: string) => void;
}

export const DuolingoChapterModal: React.FC<DuolingoChapterModalProps> = ({
  isOpen,
  onClose,
  chapterData,
  book,
  skillMode,
  onSkillModeChange,
  onStartRound,
  onOpenGuidebook,
  onOpenMedal,
}) => {
  if (!chapterData) return null;

  const isCompleted = chapterData.completionPercent >= 100;
  const hasPlayed = chapterData.personalBest > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-2 border-[#2B2F8F]/25 bg-white dark:bg-[#0E1428] shadow-2xl">
        {/* Header in Brand Colors (Azul-marinho & Azul claro) */}
        <div className="relative bg-gradient-to-r from-[#2B2F8F] via-[#353AA6] to-[#2B2F8F] text-white p-5 text-center">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>

          <span className="inline-block px-3 py-0.5 rounded-full bg-[#4FC3E8]/20 text-[#4FC3E8] border border-[#4FC3E8]/40 text-[10px] font-black uppercase tracking-wider mb-1">
            {book} • Chapter {chapterData.chapter}
          </span>
          <h2 className="text-xl font-black text-white leading-snug">
            {chapterData.title}
          </h2>
          <p className="text-xs text-white/80 font-medium max-w-xs mx-auto line-clamp-1 mt-0.5">
            {chapterData.grammarFocus}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Progress & Personal Best Card */}
          <div className="rounded-2xl bg-[#E6EEFA]/60 dark:bg-[#141C38] p-3.5 space-y-2 border border-[#BAC9E2]/50 dark:border-transparent">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground">Progress:</span>
              <span className="font-extrabold text-[#2B2F8F] dark:text-[#4FC3E8]">
                {chapterData.completionPercent}% Mastered
              </span>
            </div>

            {/* Circular or linear progress */}
            <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-[#1F2B52] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4FC3E8] to-[#2B2F8F] rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${chapterData.completionPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>Personal Best:</span>
              <span className="font-extrabold text-foreground">
                {hasPlayed ? `${chapterData.personalBest.toLocaleString()} pts` : 'Not played yet'}
              </span>
            </div>
          </div>

          {/* Quest Practice Mode Selector Pills */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block text-center">
              Select Practice Mode
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-muted/60 dark:bg-[#141C38] border border-border/50">
              <button
                type="button"
                onClick={() => onSkillModeChange('mix')}
                className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all flex flex-col items-center gap-1 ${
                  skillMode === 'mix'
                    ? 'bg-[#2B2F8F] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-[#4FC3E8]" />
                <span>Full Mix</span>
              </button>

              <button
                type="button"
                onClick={() => onSkillModeChange('grammar')}
                className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all flex flex-col items-center gap-1 ${
                  skillMode === 'grammar'
                    ? 'bg-[#2B2F8F] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#4FC3E8]" />
                <span>Grammar</span>
              </button>

              <button
                type="button"
                onClick={() => onSkillModeChange('speaking')}
                className={`py-2 px-2 rounded-xl text-[11px] font-black transition-all flex flex-col items-center gap-1 ${
                  skillMode === 'speaking'
                    ? 'bg-[#2B2F8F] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mic className="w-3.5 h-3.5 text-[#4FC3E8]" />
                <span>Speaking</span>
              </button>
            </div>
          </div>

          {/* Primary Action Button (Brand Azul claro 3D Button) */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartRound(chapterData.chapter);
              }}
              className="w-full h-12 rounded-2xl native-btn-accent font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_5px_0_#289FCE] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
            >
              <span>START QUEST</span>
              <span className="text-white/80">•</span>
              <span>+10 XP</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            {/* View Chapter Medal Button (If completed or has score) */}
            {hasPlayed && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMedal(chapterData.chapter);
                }}
                className="w-full h-10 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/50 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                <Award className="w-4 h-4 text-amber-500" />
                <span>View Chapter Completion Medal</span>
              </button>
            )}

            {/* Guidebook button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGuidebook(chapterData.chapter);
              }}
              className="w-full py-2 text-xs font-extrabold text-muted-foreground hover:text-[#2B2F8F] dark:hover:text-[#4FC3E8] flex items-center justify-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Review Chapter Rules & Audio Notes</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
