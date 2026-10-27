import React from 'react';
import { GrammarBookLevel } from '@/lib/supabase';
import { Flame, Heart, Zap, Volume2, VolumeX, ChevronDown, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DuolingoTopBarProps {
  selectedBook: GrammarBookLevel;
  onSelectBook: (book: GrammarBookLevel) => void;
  streakCount: number;
  gemsCount: number;
  heartsCount: number;
  maxHearts?: number;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

const BOOK_CONFIGS: Record<
  GrammarBookLevel,
  { label: string; cefr: string; flag: string; flagCode: string }
> = {
  Beginner: {
    label: 'Beginner',
    cefr: 'A1 / A2',
    flag: '🇺🇸',
    flagCode: 'US',
  },
  Intermediate: {
    label: 'Intermediate',
    cefr: 'B1 / B2',
    flag: '🇬🇧',
    flagCode: 'UK',
  },
  Advanced: {
    label: 'Advanced',
    cefr: 'B2 / C1',
    flag: '🌎',
    flagCode: 'INT',
  },
};

export const DuolingoTopBar: React.FC<DuolingoTopBarProps> = ({
  selectedBook,
  onSelectBook,
  streakCount,
  gemsCount,
  heartsCount,
  maxHearts = 5,
  soundEnabled = true,
  onToggleSound,
}) => {
  const currentConfig = BOOK_CONFIGS[selectedBook] || BOOK_CONFIGS.Beginner;

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/90 dark:bg-[#131f24]/95 border-b border-border/60 dark:border-[#283b45] transition-colors py-2.5 px-3 sm:px-6 shadow-xs">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Book / Course Selector Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-transparent hover:border-border dark:hover:border-[#37464f] hover:bg-muted/50 dark:hover:bg-[#1a2930] transition-all font-black text-xs sm:text-sm text-foreground active:scale-95 group focus:outline-none"
            >
              <span className="text-xl leading-none">{currentConfig.flag}</span>
              <span className="font-extrabold hidden xs:inline">{currentConfig.label}</span>
              <span className="text-[11px] font-bold text-muted-foreground hidden sm:inline">
                ({currentConfig.cefr})
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-transform" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 p-1.5 rounded-2xl dark:bg-[#18272f] dark:border-[#37464f]">
            {(Object.keys(BOOK_CONFIGS) as GrammarBookLevel[]).map((book) => {
              const cfg = BOOK_CONFIGS[book];
              const isSelected = book === selectedBook;
              return (
                <DropdownMenuItem
                  key={book}
                  onClick={() => onSelectBook(book)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300 font-extrabold'
                      : 'hover:bg-muted/60 dark:hover:bg-[#20323c] text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none">{cfg.flag}</span>
                    <div>
                      <p className="font-black text-sm">{cfg.label}</p>
                      <p className="text-[10px] text-muted-foreground">{cfg.cefr} Stages</p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Center / Right Stats: Streak 🔥, Gems 💎, Hearts ❤️ */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Streak Flame */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs sm:text-sm font-black text-amber-500 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-default"
            title={`${streakCount} day streak`}
          >
            <Flame className="w-5 h-5 fill-amber-500 text-amber-500 animate-pulse" />
            <span>{streakCount}</span>
          </div>

          {/* Blue Gems / Diamonds */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs sm:text-sm font-black text-sky-500 dark:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-default"
            title={`${gemsCount.toLocaleString()} total quest points / gems`}
          >
            {/* 3D Duolingo Diamond SVG */}
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 drop-shadow-xs">
              <path
                d="M12 2L3 8L12 22L21 8L12 2Z"
                fill="#1cb0f6"
                stroke="#1899d6"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M3 8H21" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.6" />
              <path d="M12 2L8 8L12 22L16 8L12 2Z" fill="#2bd3ff" />
            </svg>
            <span>{gemsCount > 9999 ? `${(gemsCount / 1000).toFixed(1)}k` : gemsCount.toLocaleString()}</span>
          </div>

          {/* Hearts / Lives */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs sm:text-sm font-black text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-default"
            title={`${heartsCount}/${maxHearts} hearts available`}
          >
            <Heart className="w-5 h-5 fill-rose-500 text-rose-500 animate-pulse" />
            <span>{heartsCount}</span>
          </div>

          {/* Sound Toggle */}
          {onToggleSound && (
            <button
              type="button"
              onClick={onToggleSound}
              className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-[#1a2930] transition-colors"
              title={soundEnabled ? 'Mute sound' : 'Enable sound'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
