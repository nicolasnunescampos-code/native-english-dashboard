import React from 'react';
import { GrammarBookLevel } from '@/lib/supabase';
import { BookOpen, Sparkles, NotebookText } from 'lucide-react';
import { DuolingoWitch } from './DuolingoMascots';

interface DuolingoUnitBannerProps {
  book: GrammarBookLevel;
  chapterNumber: string;
  chapterTitle: string;
  grammarFocus: string;
  onOpenGuidebook: () => void;
  dailyQuestProgress?: {
    current: number;
    target: number;
    title: string;
  };
}

export const DuolingoUnitBanner: React.FC<DuolingoUnitBannerProps> = ({
  book,
  chapterNumber,
  chapterTitle,
  grammarFocus,
  onOpenGuidebook,
  dailyQuestProgress = { current: 1, target: 2, title: 'Complete 2 Quest Rounds' },
}) => {
  const sectionNumber = book === 'Beginner' ? 1 : book === 'Intermediate' ? 2 : 3;

  return (
    <div className="w-full max-w-lg mx-auto space-y-3 select-none">
      {/* Brand Native English Navy Banner (#2B2F8F) */}
      <div className="rounded-3xl bg-gradient-to-r from-[#2B2F8F] via-[#353AA6] to-[#2B2F8F] text-white p-5 shadow-[0_6px_0_#1C2068] relative overflow-hidden transition-all border border-[#4FC3E8]/30">
        {/* Subtle decorative glow in Azul claro */}
        <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#4FC3E8]/20 blur-xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#4FC3E8]/20 text-[#4FC3E8] border border-[#4FC3E8]/40 text-[10px] font-black uppercase tracking-wider">
              SECTION {sectionNumber}, UNIT {chapterNumber}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight text-white">
              {chapterTitle}
            </h2>
            <p className="text-xs font-semibold text-white/85 line-clamp-1">
              {grammarFocus}
            </p>
          </div>

          {/* Guidebook / Notebook Button in Brand Azul claro (#4FC3E8) */}
          <button
            type="button"
            onClick={onOpenGuidebook}
            className="w-12 h-12 rounded-2xl bg-[#4FC3E8] hover:bg-[#3dbfe8] border-2 border-white/40 shadow-[0_4px_0_#289FCE] flex items-center justify-center text-white shrink-0 active:translate-y-1 active:shadow-none transition-all group focus:outline-none cursor-pointer"
            title="Open Unit Guidebook & Grammar Rules"
          >
            {/* Custom Guidebook Notebook Icon */}
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 group-hover:scale-110 transition-transform">
              <rect x="5" y="3" width="15" height="18" rx="2.5" fill="#ffffff" />
              <path d="M5 6H8M5 10H8M5 14H8M5 18H8" stroke="#2B2F8F" strokeWidth="2" strokeLinecap="round" />
              <path d="M10 7H17M10 11H17M10 15H15" stroke="#2B2F8F" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mini Quest / Event Callout */}
      <div className="rounded-2xl bg-[#E6EEFA]/80 dark:bg-[#141C38] border border-[#BAC9E2]/60 dark:border-[#202E5A] p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <DuolingoWitch className="w-8 h-8 sm:w-9 sm:h-9" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#4FC3E8] border-2 border-white dark:border-[#141C38]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-foreground truncate">
              {dailyQuestProgress.title}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-24 sm:w-32 h-2 rounded-full bg-slate-200 dark:bg-[#1F2B52] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#4FC3E8] to-[#2B2F8F] rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (dailyQuestProgress.current / dailyQuestProgress.target) * 100
                    )}%`,
                  }}
                />
              </div>
              <span className="text-[10px] font-black text-muted-foreground">
                {dailyQuestProgress.current}/{dailyQuestProgress.target}
              </span>
            </div>
          </div>
        </div>

        <span className="text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-xl bg-[#2B2F8F]/15 dark:bg-[#4FC3E8]/15 text-[#2B2F8F] dark:text-[#4FC3E8] shrink-0">
          Daily Quest
        </span>
      </div>
    </div>
  );
};
