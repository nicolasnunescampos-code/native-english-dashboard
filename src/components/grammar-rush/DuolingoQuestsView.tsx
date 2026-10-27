import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Trophy, Flame, Heart, Zap, CheckCircle2, Award } from 'lucide-react';
import { DuolingoChest } from './DuolingoMascots';

interface DuolingoQuestsViewProps {
  totalScore: number;
  gamesPlayedCount: number;
  bestComboEver: number;
}

export const DuolingoQuestsView: React.FC<DuolingoQuestsViewProps> = ({
  totalScore,
  gamesPlayedCount,
  bestComboEver,
}) => {
  const quests = [
    {
      id: 'quest-1',
      title: 'Earn 300 Quest Points',
      description: 'Play Native Quest and score 300+ points across any chapters',
      current: Math.min(300, totalScore),
      target: 300,
      reward: 30,
      icon: <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />,
    },
    {
      id: 'quest-2',
      title: 'Complete 2 Quests Today',
      description: 'Finish at least two full game rounds',
      current: Math.min(2, gamesPlayedCount),
      target: 2,
      reward: 40,
      icon: <Trophy className="w-5 h-5 text-sky-500" />,
    },
    {
      id: 'quest-3',
      title: 'Reach a x3 Combo Streak',
      description: 'Answer consecutive questions correctly without making a mistake',
      current: Math.min(3, bestComboEver),
      target: 3,
      reward: 50,
      icon: <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />,
    },
  ];

  const badges = [
    {
      title: 'First Flight',
      desc: 'Completed your first Native Quest',
      unlocked: gamesPlayedCount >= 1,
      icon: '🐣',
    },
    {
      title: 'Combo Prodigy',
      desc: 'Achieved a x4 combo multiplier',
      unlocked: bestComboEver >= 10,
      icon: '⚡',
    },
    {
      title: 'Grammar Titan',
      desc: 'Scored 1,000+ total quest points',
      unlocked: totalScore >= 1000,
      icon: '🛡️',
    },
    {
      title: 'Duolingo Champion',
      desc: 'Played 5 or more quests',
      unlocked: gamesPlayedCount >= 5,
      icon: '👑',
    },
  ];

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 pb-28 pt-2 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center space-y-1">
        <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30 text-xs font-black uppercase tracking-wider">
          Daily Quests & Achievements
        </Badge>
        <h2 className="text-2xl font-black text-foreground">
          Earn Gems & Unlock Badges
        </h2>
        <p className="text-xs text-muted-foreground font-medium">
          Complete daily challenges to climb the leaderboard and unlock exclusive mastery crowns!
        </p>
      </div>

      {/* Quests List */}
      <div className="space-y-3">
        {quests.map((q) => {
          const isDone = q.current >= q.target;
          const percent = Math.min(100, Math.round((q.current / q.target) * 100));

          return (
            <div
              key={q.id}
              className={`p-4 rounded-3xl border-2 transition-all ${
                isDone
                  ? 'bg-[#E6EEFA]/70 border-[#4FC3E8]/60 dark:bg-[#141C38]'
                  : 'bg-white dark:bg-[#141C38] border-[#BAC9E2]/50 dark:border-[#202E5A]'
              } shadow-xs flex items-center justify-between gap-3.5`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-[#E6EEFA] dark:bg-[#0E1428] flex items-center justify-center shrink-0">
                  {q.icon}
                </div>
                <div className="min-w-0 space-y-1">
                  <h4 className="font-black text-sm text-foreground leading-tight">
                    {q.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {q.description}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="w-32 h-2.5 rounded-full bg-slate-200 dark:bg-[#1F2B52] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDone ? 'bg-[#4FC3E8]' : 'bg-amber-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-black text-muted-foreground">
                      {q.current}/{q.target}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gem Reward Pill */}
              <div className="shrink-0 text-right">
                {isDone ? (
                  <Badge className="bg-[#2B2F8F] text-white font-black text-xs gap-1 px-2.5 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4FC3E8]" />
                    <span>Done</span>
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="font-black text-xs border-[#4FC3E8] text-[#2B2F8F] dark:text-[#4FC3E8] bg-[#4FC3E8]/10 gap-1 px-2.5 py-1"
                  >
                    <span>+{q.reward}</span>
                    <span>💎</span>
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Badges Collection */}
      <div className="space-y-3 pt-2">
        <h3 className="font-black text-base text-foreground flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          <span>Mastery Badges ({badges.filter((b) => b.unlocked).length}/{badges.length})</span>
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {badges.map((b) => (
            <div
              key={b.title}
              className={`p-3.5 rounded-2xl border-2 text-center space-y-1.5 transition-all ${
                b.unlocked
                  ? 'bg-white dark:bg-[#18272f] border-amber-400/50 shadow-xs'
                  : 'bg-muted/30 dark:bg-[#131f24] border-slate-200 dark:border-[#203038] opacity-60'
              }`}
            >
              <div className="text-3xl filter select-none">{b.icon}</div>
              <p className="font-black text-xs text-foreground">{b.title}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {b.desc}
              </p>
              {b.unlocked ? (
                <span className="inline-block text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                  Unlocked ✓
                </span>
              ) : (
                <span className="inline-block text-[10px] font-bold text-muted-foreground uppercase">
                  Locked 🔒
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
