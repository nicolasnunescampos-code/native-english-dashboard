import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Award, CheckCircle2, Share2, Printer, X, Sparkles } from 'lucide-react';
import { format } from 'date-fns';

interface ChapterMedalModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  book: string;
  chapterNumber: string;
  chapterTitle: string;
  grammarFocus: string;
  score: number;
  accuracy: number;
  stars: number; // 1, 2, or 3
}

export const ChapterMedalModal: React.FC<ChapterMedalModalProps> = ({
  isOpen,
  onClose,
  studentName,
  book,
  chapterNumber,
  chapterTitle,
  grammarFocus,
  score,
  accuracy,
  stars,
}) => {
  const medalColor =
    stars >= 3
      ? { title: 'Gold Mastery Medal', bg: 'from-amber-400 to-amber-600', ring: 'ring-amber-400', badge: 'bg-amber-500', icon: '🥇' }
      : stars >= 2
        ? { title: 'Silver Proficiency Medal', bg: 'from-slate-300 to-slate-500', ring: 'ring-slate-300', badge: 'bg-slate-500', icon: '🥈' }
        : { title: 'Bronze Achievement Medal', bg: 'from-amber-700 to-amber-900', ring: 'ring-amber-700', badge: 'bg-amber-800', icon: '🥉' };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-2 border-[#2B2F8F]/30 bg-white dark:bg-[#0E1428] shadow-2xl">
        {/* Certificate / Medal Header */}
        <div className="relative bg-gradient-to-br from-[#2B2F8F] via-[#212470] to-[#161952] text-white p-6 text-center overflow-hidden">
          {/* Decorative Corner Seals */}
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-[#4FC3E8]/20 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-[#4FC3E8]/15 blur-xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>

          {/* 3D Medal Emblem with Ribbon */}
          <div className="relative mx-auto w-24 h-24 mb-3 flex items-center justify-center">
            {/* Ribbon tails in brand colors */}
            <div className="absolute -top-1 left-4 w-5 h-16 bg-[#2B2F8F] shadow-sm transform -rotate-12 rounded-b-sm border-t border-[#4FC3E8]" />
            <div className="absolute -top-1 right-4 w-5 h-16 bg-[#4FC3E8] shadow-sm transform rotate-12 rounded-b-sm border-t border-white" />

            {/* Glowing Medal Disc */}
            <div className={`relative z-10 w-20 h-20 rounded-full bg-gradient-to-br ${medalColor.bg} border-4 border-white dark:border-[#0E1428] shadow-xl flex items-center justify-center ring-4 ${medalColor.ring}/50 animate-pulse`}>
              <span className="text-3xl select-none">{medalColor.icon}</span>
            </div>
          </div>

          <span className="inline-block px-3 py-0.5 rounded-full bg-[#4FC3E8]/20 text-[#4FC3E8] border border-[#4FC3E8]/40 text-[10px] font-black uppercase tracking-wider mb-1">
            Native English Mini-Certificate
          </span>
          <h2 className="text-xl font-black tracking-tight text-white">
            {medalColor.title}
          </h2>
          <p className="text-xs text-white/80 font-medium">
            Chapter {chapterNumber}: {chapterTitle}
          </p>
        </div>

        {/* Certificate Body */}
        <div className="p-6 space-y-4 text-center">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
              Awarded to
            </p>
            <p className="text-xl font-black text-[#2B2F8F] dark:text-[#4FC3E8]">
              {studentName || 'Student'}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              for demonstrating excellence and mastery in <span className="font-bold text-foreground">{grammarFocus}</span>
            </p>
          </div>

          {/* KPI Snapshot Pills */}
          <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto pt-1">
            <div className="p-2.5 rounded-2xl bg-[#E6EEFA] dark:bg-[#161F3B] text-center border border-[#BAC9E2]/50 dark:border-transparent">
              <span className="text-[10px] font-black uppercase text-[#2B2F8F] dark:text-[#4FC3E8] block">
                Score
              </span>
              <span className="text-sm font-black text-foreground">
                {score > 0 ? score.toLocaleString() : '500+'}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#E6EEFA] dark:bg-[#161F3B] text-center border border-[#BAC9E2]/50 dark:border-transparent">
              <span className="text-[10px] font-black uppercase text-[#2B2F8F] dark:text-[#4FC3E8] block">
                Accuracy
              </span>
              <span className="text-sm font-black text-foreground">
                {accuracy > 0 ? `${accuracy}%` : '90%+'}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#E6EEFA] dark:bg-[#161F3B] text-center border border-[#BAC9E2]/50 dark:border-transparent">
              <span className="text-[10px] font-black uppercase text-[#2B2F8F] dark:text-[#4FC3E8] block">
                Level
              </span>
              <span className="text-sm font-black text-foreground">
                {book}
              </span>
            </div>
          </div>

          {/* Official Verification Seal */}
          <div className="flex items-center justify-center gap-2 pt-2 text-[11px] font-bold text-muted-foreground border-t border-slate-200 dark:border-[#1E294B]">
            <CheckCircle2 className="w-4 h-4 text-[#4FC3E8]" />
            <span>Verified by Native English Quest Mastery System • {format(new Date(), 'MMM yyyy')}</span>
          </div>

          {/* Action Buttons in Brand Colors (Azul claro / Azul marinho) */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 h-11 rounded-2xl native-btn-accent font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_0_#289FCE]"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save Mini-Certificate</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-2xl native-btn-ice font-black text-xs uppercase tracking-wider shadow-[0_4px_0_#BAC9E2]"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
