import React from 'react';
import { GrammarBookLevel } from '@/lib/supabase';
import { Dumbbell, Mic, Zap, RotateCcw, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ChapterNodeData } from './DuolingoPathNode';

interface DuolingoPracticeViewProps {
  book: GrammarBookLevel;
  chapters: ChapterNodeData[];
  onStartRound: (chapter: string) => void;
  skillMode: 'mix' | 'grammar' | 'speaking';
  onSkillModeChange: (mode: 'mix' | 'grammar' | 'speaking') => void;
  recentMistakesCount?: number;
}

export const DuolingoPracticeView: React.FC<DuolingoPracticeViewProps> = ({
  book,
  chapters,
  onStartRound,
  skillMode,
  onSkillModeChange,
  recentMistakesCount = 0,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto space-y-6 pb-28 pt-2 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-1">
        <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30 text-xs font-black uppercase tracking-wider">
          Practice Hub • The Grammar Gym
        </Badge>
        <h2 className="text-2xl font-black text-foreground">
          Targeted Skill Training
        </h2>
        <p className="text-xs text-muted-foreground font-medium">
          Sharpen your grammar reflexes and practice pronunciation without losing hearts!
        </p>
      </div>

      {/* 3 Training Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Card 1: Full Mix Speed Drill */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#18272f] border-2 border-slate-200 dark:border-[#283b45] shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-500 flex items-center justify-center">
              <Zap className="w-6 h-6 fill-sky-500" />
            </div>
            <h3 className="font-black text-base text-foreground">Full Quest Mix</h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Fast-paced combination of error spotting, gap filling, word ordering, and speaking aloud.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSkillModeChange('mix');
              onStartRound(chapters[0]?.chapter || '1');
            }}
            className="w-full h-11 rounded-2xl duo-btn-blue font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <span>Start Mix Drill</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 2: Speaking Only Voice Gym */}
        <div className="p-5 rounded-3xl bg-white dark:bg-[#18272f] border-2 border-slate-200 dark:border-[#283b45] shadow-xs space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-500 flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="font-black text-base text-foreground">Speaking Pronunciation</h3>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Train your accent and intonation with real-time AI pronunciation feedback.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSkillModeChange('speaking');
              onStartRound(chapters[0]?.chapter || '1');
            }}
            className="w-full h-11 rounded-2xl duo-btn-purple font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
          >
            <span>Start Voice Gym</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chapter Selection Quick List */}
      <div className="space-y-3 pt-2">
        <h3 className="font-black text-base text-foreground flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-sky-500" />
          <span>Quick Chapter Practice ({book})</span>
        </h3>

        <div className="space-y-2">
          {chapters.map((ch) => (
            <div
              key={ch.chapter}
              onClick={() => onStartRound(ch.chapter)}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#18272f] border border-slate-200 dark:border-[#283b45] hover:border-sky-400/60 dark:hover:border-sky-400/40 transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-muted/60 dark:bg-[#131f24] font-black text-xs flex items-center justify-center text-foreground shrink-0">
                  {ch.chapter}
                </span>
                <div className="min-w-0">
                  <p className="font-black text-sm text-foreground truncate group-hover:text-sky-500 transition-colors">
                    {ch.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {ch.grammarFocus}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className="text-[10px] font-black border-slate-200 dark:border-[#37464f]"
                >
                  {ch.completionPercent}% Mastered
                </Badge>
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#203038] group-hover:bg-[#4FC3E8] group-hover:text-white transition-colors flex items-center justify-center">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
