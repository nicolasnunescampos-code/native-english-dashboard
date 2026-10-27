import React from 'react';
import { GrammarBookLevel } from '@/lib/supabase';
import { NativeQuestLeaderboardCard } from './NativeQuestLeaderboardCard';
import { Badge } from '@/components/ui/badge';
import { Trophy, Shield, Sparkles } from 'lucide-react';

interface DuolingoLeaderboardViewProps {
  book: GrammarBookLevel;
  onStartRound: () => void;
}

export const DuolingoLeaderboardView: React.FC<DuolingoLeaderboardViewProps> = ({
  book,
  onStartRound,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 pb-28 pt-2 animate-in fade-in duration-300">
      {/* Duolingo League Tier Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 text-white shadow-[0_6px_0_#b45309] text-center space-y-2 select-none">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-xs font-black uppercase tracking-wider backdrop-blur-xs">
          <Trophy className="w-4 h-4 text-amber-200 fill-amber-200" />
          <span>Diamond League • Week 42</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
          Native Quest Champions
        </h2>
        <p className="text-xs sm:text-sm font-semibold text-white/90 max-w-md mx-auto">
          Top 3 players receive the weekly crown 👑 and get featured on our official student hall of fame!
        </p>
      </div>

      {/* Main Weekly Podium & Ranking Card */}
      <NativeQuestLeaderboardCard
        defaultBook="ALL"
        defaultTimeframe="week"
        showPlayButton={true}
        showSocialMediaButton={true}
        title="Weekly Native Quest League"
        subtitle="Complete lessons daily to earn XP and stay in the promotion zone!"
      />
    </div>
  );
};
