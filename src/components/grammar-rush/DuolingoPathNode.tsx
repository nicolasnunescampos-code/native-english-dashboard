import React from 'react';
import {
  Star,
  Headphones,
  Dumbbell,
  BookOpen,
  Trophy,
  Shield,
  Lock,
} from 'lucide-react';

export interface ChapterNodeData {
  chapter: string;
  chapterNumber: number;
  title: string;
  grammarFocus: string;
  isUnlocked: boolean;
  isActive: boolean;
  isStudied: boolean;
  completionPercent: number; // 0 to 100
  personalBest: number;
  accuracy: number;
  questionsCount: number;
}

interface DuolingoPathNodeProps {
  data: ChapterNodeData;
  xOffset: number; // in pixels (-70 to +70)
  isSelected: boolean;
  onSelect: () => void;
}

// Iconic icon selection for Duolingo chapters
function getNodeIcon(chapterNumber: number) {
  switch (chapterNumber % 6) {
    case 1:
      return <Star className="w-8 h-8 fill-white text-white drop-shadow-xs" />;
    case 2:
      return <Headphones className="w-8 h-8 text-white stroke-[2.75] drop-shadow-xs" />;
    case 3:
      return <Star className="w-8 h-8 fill-white text-white drop-shadow-xs" />;
    case 4:
      return <Dumbbell className="w-8 h-8 text-white stroke-[2.75] drop-shadow-xs" />;
    case 5:
      return <BookOpen className="w-8 h-8 text-white stroke-[2.75] drop-shadow-xs" />;
    case 0:
      return <Trophy className="w-8 h-8 fill-white/25 text-white stroke-[2.75] drop-shadow-xs" />;
    default:
      return <Star className="w-8 h-8 fill-white text-white drop-shadow-xs" />;
  }
}

export const DuolingoPathNode: React.FC<DuolingoPathNodeProps> = ({
  data,
  xOffset,
  isSelected,
  onSelect,
}) => {
  // SVG Circular Progress Bar metrics (104x104 container, r=44, inner button 74x74)
  const radius = 44;
  const circumference = 2 * Math.PI * radius; // ~276.46
  const strokeOffset =
    circumference -
    (Math.min(100, Math.max(0, data.completionPercent)) / 100) * circumference;

  const isCompleted = data.completionPercent >= 100;

  // Star counts beneath circle (1, 2, or 3)
  const filledStars =
    data.completionPercent >= 100 ? 3 : data.completionPercent >= 60 ? 2 : data.completionPercent >= 20 ? 1 : 0;

  // Color scheme based on state in brand colors:
  // Active/Unlocked: Azul claro #4FC3E8
  // 100% Mastered: Gold #FFC800
  // Locked: Azul gelo / muted
  const nodeColorClass = !data.isUnlocked
    ? 'duo-node-locked text-muted-foreground'
    : isCompleted
      ? 'duo-node-gold text-[#784900]'
      : data.isActive
        ? 'duo-node-blue text-white ring-4 ring-[#4FC3E8]/40'
        : 'duo-node-blue text-white';

  return (
    <div
      className="relative flex flex-col items-center my-2 transition-transform duration-300 select-none"
      style={{ transform: `translateX(${xOffset}px)` }}
    >
      {/* Floating Animated "START" Speech Bubble in Brand Navy #2B2F8F */}
      {data.isActive && (
        <div className="absolute -top-10 z-20 animate-duo-float pointer-events-none">
          <div className="bg-[#2B2F8F] text-white font-black text-[11px] px-3.5 py-1 rounded-2xl shadow-[0_3px_0_#1C2068] flex items-center gap-1 uppercase tracking-wider relative border border-[#4FC3E8]/40">
            <span>START</span>
            <span className="text-[#4FC3E8]">⚡</span>
            {/* Downward triangle arrow */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#2B2F8F]" />
          </div>
        </div>
      )}

      {/* Main Circle Node & Outer SVG Circular Progress Bar Container */}
      <div className="relative w-26 h-26 flex items-center justify-center">
        {/* SVG Circular Progress Bar ("bars around those circles to show them the amount they have completed of that chapter") */}
        <svg
          className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
          viewBox="0 0 104 104"
        >
          {/* Background Track Circle */}
          <circle
            cx="52"
            cy="52"
            r={radius}
            fill="none"
            className="stroke-[#E6EEFA] dark:stroke-[#1A2340]"
            strokeWidth="5.5"
          />

          {/* Active Colored Progress Bar Arc */}
          {data.isUnlocked && data.completionPercent > 0 && (
            <circle
              cx="52"
              cy="52"
              r={radius}
              fill="none"
              stroke={
                isCompleted
                  ? '#FFC800' // Gold when 100% completed!
                  : '#4FC3E8' // Brand Azul claro
              }
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>

        {/* 3D Tactile Pushable Button (Duolingo Style in Brand Colors!) */}
        <button
          type="button"
          onClick={onSelect}
          disabled={!data.isUnlocked}
          className={`w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all select-none focus:outline-none z-10 active:scale-95 cursor-pointer ${nodeColorClass}`}
          title={`Chapter ${data.chapter}: ${data.title} (${data.completionPercent}% completed)`}
        >
          {!data.isUnlocked ? (
            <Lock className="w-6 h-6 text-[#7F90B2] dark:text-[#52656d]" />
          ) : (
            getNodeIcon(data.chapterNumber)
          )}
        </button>

        {/* Crown badge when 100% mastered */}
        {isCompleted && (
          <div className="absolute top-0.5 right-0.5 z-20 w-6 h-6 rounded-full bg-amber-400 border-2 border-white dark:border-[#0E1428] flex items-center justify-center text-amber-950 font-black text-xs shadow-xs">
            👑
          </div>
        )}
      </div>

      {/* 3 Mastery Stars beneath the circle (Matches image 2!) */}
      {data.isUnlocked && (
        <div className="flex items-center gap-1 mt-1 select-none">
          {[1, 2, 3].map((starNum) => (
            <Star
              key={starNum}
              className={`w-3.5 h-3.5 ${
                starNum <= filledStars
                  ? isCompleted
                    ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                    : 'fill-[#4FC3E8] text-[#4FC3E8]'
                  : 'fill-slate-300 dark:fill-[#1A2340] text-slate-300 dark:text-[#1A2340]'
              }`}
            />
          ))}
        </div>
      )}

      {/* Chapter Label / Title beneath stars */}
      <p className="text-[11px] font-extrabold text-foreground text-center mt-0.5 max-w-[120px] line-clamp-1 opacity-90">
        Ch. {data.chapter}: {data.title}
      </p>
    </div>
  );
};
