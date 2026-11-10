import React, { useState } from 'react';
import { GrammarBookLevel } from '@/lib/supabase';
import {
  DuolingoPathNode,
  ChapterNodeData,
} from './DuolingoPathNode';
import { DuolingoUnitBanner } from './DuolingoUnitBanner';
import {
  FoxMascot,
  DuolingoTeacher,
  DuolingoChest,
} from './DuolingoMascots';
import { toast } from 'sonner';
import { playChime } from '@/utils/speechEvaluator';
import { Trophy, Award, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface DuolingoMapProps {
  book: GrammarBookLevel;
  chaptersData: ChapterNodeData[];
  selectedChapter: string;
  onSelectChapter: (chapter: string) => void;
  onOpenGuidebook: (chapter?: string) => void;
  onOpenFullCertificate: () => void;
  onAdvanceLevel?: (nextBook: GrammarBookLevel) => void;
  dailyQuestProgress?: {
    current: number;
    target: number;
    title: string;
  };
}

// Sinusoidal offsets for 10 chapters to create authentic Duolingo serpentine S-curve
const S_CURVE_OFFSETS = [0, 42, 68, 42, 0, -42, -68, -42, 0, 0];

export const DuolingoMap: React.FC<DuolingoMapProps> = ({
  book,
  chaptersData,
  selectedChapter,
  onSelectChapter,
  onOpenGuidebook,
  onOpenFullCertificate,
  onAdvanceLevel,
  dailyQuestProgress,
}) => {
  const [chestOpened, setChestOpened] = useState(false);

  const activeChapterData =
    chaptersData.find((c) => c.chapter === selectedChapter) ||
    chaptersData[0] || {
      chapter: '1',
      title: 'Verb To Be',
      grammarFocus: 'Am, is, are & simple contractions',
    };

  const completedCount = chaptersData.filter((c) => c.completionPercent >= 100).length;
  const isChapter10Completed = (chaptersData.find((c) => c.chapter === '10')?.personalBest || 0) > 0;
  const isLevelFullyCompleted = completedCount >= 10;
  const hasClearedLevel = isLevelFullyCompleted || isChapter10Completed;
  const nextBookLevel: GrammarBookLevel | null =
    book === 'Beginner' ? 'Intermediate' : book === 'Intermediate' ? 'Advanced' : null;

  const handleOpenChest = () => {
    if (chestOpened) {
      toast.info('You already opened this milestone chest! Keep advancing to unlock more.');
      return;
    }
    setChestOpened(true);
    playChime('celebrate');
    toast.success('🎉 Milestone Chest Opened! +50 Quest Gems 💎 awarded!');
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 pb-28 pt-1 select-none overflow-x-hidden">
      {/* 1. Duolingo Unit Header Banner */}
      <DuolingoUnitBanner
        book={book}
        chapterNumber={activeChapterData.chapter}
        chapterTitle={activeChapterData.title}
        grammarFocus={activeChapterData.grammarFocus}
        onOpenGuidebook={() => onOpenGuidebook(activeChapterData.chapter)}
        dailyQuestProgress={dailyQuestProgress}
      />

      {/* 2. The Duolingo Descending Winding Path */}
      <div className="relative flex flex-col items-center pt-1">
        {chaptersData.map((nodeData, index) => {
          const xOffset = S_CURVE_OFFSETS[index % S_CURVE_OFFSETS.length];
          const isSelected = selectedChapter === nodeData.chapter;

          return (
            <React.Fragment key={nodeData.chapter}>
              {/* Mascot decoration 1: Mustache teacher beside chapter 2/3 (placed safely to the left) */}
              {index === 2 && (
                <div className="w-full flex items-center justify-start my-1 px-2 pointer-events-none">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <DuolingoTeacher className="w-16 h-16 sm:w-24 sm:h-24 drop-shadow-md" />
                    <div className="bg-white dark:bg-[#141C38] border border-[#BAC9E2] dark:border-[#202E5A] p-1.5 sm:p-2 rounded-2xl shadow-sm text-[10px] sm:text-[11px] font-black text-foreground max-w-[100px] sm:max-w-[120px] leading-snug">
                      "Keep speaking aloud! 🎙️"
                    </div>
                  </div>
                </div>
              )}

              {/* Milestone Divider between Unit halves (between Ch 5 and Ch 6) */}
              {index === 5 && (
                <div className="w-full my-6 space-y-3 text-center">
                  <div className="relative flex items-center justify-center">
                    <div className="border-t-2 border-[#E6EEFA] dark:border-[#1E294B] w-full" />
                    <span className="bg-background dark:bg-[#0E1428] px-4 text-[10px] font-black uppercase tracking-wider text-[#2B2F8F] dark:text-[#4FC3E8] whitespace-nowrap">
                      Unit Milestone • Checkpoint
                    </span>
                    <div className="border-t-2 border-[#E6EEFA] dark:border-[#1E294B] w-full" />
                  </div>

                  {/* Treasure Chest */}
                  <div className="flex flex-col items-center justify-center gap-1">
                    <DuolingoChest isOpen={chestOpened} onClick={handleOpenChest} />
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-wider">
                      {chestOpened ? 'Reward Claimed! 💎' : 'Tap to claim checkpoint bonus!'}
                    </p>
                  </div>
                </div>
              )}

              {/* Mascot decoration 2: Cheering Duo Owl beside chapter 7 (placed safely to the right) */}
              {index === 7 && (
                <div className="w-full flex items-center justify-end my-1 px-2 pointer-events-none">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="bg-white dark:bg-[#141C38] border border-[#BAC9E2] dark:border-[#202E5A] p-1.5 sm:p-2 rounded-2xl shadow-sm text-[10px] sm:text-[11px] font-black text-foreground max-w-[100px] sm:max-w-[120px] leading-snug">
                      "Almost at the Certificate! 🎓"
                    </div>
                    <FoxMascot mood="cheering" className="w-14 h-14 sm:w-20 sm:h-20 drop-shadow-md animate-duo-wiggle" />
                  </div>
                </div>
              )}

              {/* Individual Duolingo Path Node (Circle with Circular Progress Bar around it!) */}
              <DuolingoPathNode
                data={nodeData}
                xOffset={xOffset}
                isSelected={isSelected}
                onSelect={() => onSelectChapter(nodeData.chapter)}
              />

              {/* Connecting path stepping stones between consecutive nodes */}
              {index < chaptersData.length - 1 && index !== 4 && (
                <div className="flex flex-col items-center gap-1.5 my-0.5 pointer-events-none select-none">
                  {[1, 2, 3].map((step) => {
                    const nextOffset = S_CURVE_OFFSETS[(index + 1) % S_CURVE_OFFSETS.length];
                    const interpX = xOffset + ((nextOffset - xOffset) * step) / 4;
                    return (
                      <span
                        key={step}
                        className="w-2 h-2 rounded-full bg-[#BAC9E2]/60 dark:bg-[#1A2340] transition-transform duration-300"
                        style={{ transform: `translateX(${interpX}px)` }}
                      />
                    );
                  })}
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Certificate Section at Bottom of 10 Chapters */}
        <div className="mt-8 text-center space-y-3 w-full max-w-sm px-4">
          <div
            onClick={onOpenFullCertificate}
            className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-white cursor-pointer transition-transform hover:scale-105 active:scale-95 ${
              isLevelFullyCompleted
                ? 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 shadow-[0_6px_0_#d97706] ring-4 ring-amber-400/40 animate-pulse'
                : 'bg-gradient-to-b from-[#2B2F8F] to-[#1C2068] shadow-[0_6px_0_#121545]'
            }`}
          >
            <Trophy className="w-10 h-10 fill-white text-white drop-shadow-md" />
          </div>

          <div className="space-y-1">
            <h4 className="font-black text-sm uppercase tracking-wider text-foreground">
              {book} Level Certificate
            </h4>
            <p className="text-xs text-muted-foreground font-semibold">
              {isLevelFullyCompleted
                ? '🎉 All 10 chapters mastered! Claim your official certificate!'
                : `${completedCount} of 10 chapters completed (${Math.round(
                    (completedCount / 10) * 100
                  )}%)`}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenFullCertificate}
            className={`w-full h-11 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isLevelFullyCompleted
                ? 'native-btn-gold shadow-[0_4px_0_#E5A500]'
                : 'native-btn-ice shadow-[0_4px_0_#BAC9E2]'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>{isLevelFullyCompleted ? 'Claim Full Certificate 🎓' : 'Preview Certificate 📜'}</span>
          </button>
        </div>

        {/* Advance to Next Level Card (when current book is completed) */}
        {hasClearedLevel && nextBookLevel && onAdvanceLevel && (
          <div className="mt-5 w-full max-w-sm px-4">
            <div className="p-5 rounded-3xl bg-gradient-to-br from-[#2B2F8F] via-[#353AA6] to-[#1C2068] text-white border-2 border-[#4FC3E8] shadow-xl text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4FC3E8]/20 text-[#4FC3E8] border border-[#4FC3E8]/40 text-[10px] font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{book} Module Cleared!</span>
              </div>

              <div>
                <h4 className="font-black text-lg text-white">
                  Advance to {nextBookLevel} Level 🚀
                </h4>
                <p className="text-xs text-white/80 leading-snug mt-1">
                  You've completed the {book} module! Step up to Level {nextBookLevel === 'Intermediate' ? '2' : '3'} ({nextBookLevel}) to continue your quest.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onAdvanceLevel(nextBookLevel)}
                className="w-full h-12 rounded-2xl native-btn-accent font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_0_#289FCE] active:translate-y-1 active:shadow-none cursor-pointer"
              >
                <span>Continue to {nextBookLevel} Level</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
