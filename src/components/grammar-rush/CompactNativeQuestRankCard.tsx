import React from 'react';
import { Link } from 'react-router-dom';
import { useGrammarLeaderboard } from '@/hooks/useGrammarRush';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, Crown, Medal, ArrowRight, Sparkles, Loader2, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactNativeQuestRankCardProps {
  className?: string;
  showPlayButton?: boolean;
}

export const CompactNativeQuestRankCard: React.FC<CompactNativeQuestRankCardProps> = ({
  className,
  showPlayButton = true,
}) => {
  const { data: leaderboard = [], isLoading } = useGrammarLeaderboard('ALL', 'all', 'week');

  const topThree = [
    leaderboard.find((e) => e.rank === 1) || leaderboard[0],
    leaderboard.find((e) => e.rank === 2) || leaderboard[1],
    leaderboard.find((e) => e.rank === 3) || leaderboard[2],
  ].filter(Boolean);

  const currentUserEntry = leaderboard.find((e) => e.is_current_user);
  const isCurrentUserInTop3 = currentUserEntry && currentUserEntry.rank <= 3;

  return (
    <Card className={cn('flex flex-col justify-between overflow-hidden border border-[#2B2F8F]/25 dark:border-[#202E5A] bg-card/90 shadow-sm', className)}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-[#E6EEFA] dark:bg-[#161F3B] border border-[#4FC3E8]/30 flex items-center justify-center text-[#2B2F8F] dark:text-[#4FC3E8] shadow-xs">
            <Trophy className="w-5 h-5 text-amber-500 fill-amber-500" />
          </div>
          <div>
            <CardTitle className="text-base font-black text-foreground">
              Native Quest Ranking
            </CardTitle>
            <p className="text-[11px] text-muted-foreground font-semibold">
              Weekly Live League
            </p>
          </div>
        </div>

        <Link
          to="/student/grammar-rush"
          className="text-xs font-black text-[#2B2F8F] dark:text-[#4FC3E8] hover:underline inline-flex items-center gap-1 transition-all"
        >
          <span>Full Board</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="space-y-3.5 pt-0">
        {isLoading ? (
          <div className="py-8 text-center space-y-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#4FC3E8] mx-auto" />
            <p className="text-xs text-muted-foreground font-semibold">Loading weekly rank...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="py-6 text-center space-y-2 rounded-2xl bg-[#E6EEFA]/40 dark:bg-[#141C38] p-4">
            <Sparkles className="w-6 h-6 text-amber-500 mx-auto" />
            <p className="text-xs font-black text-foreground">No scores yet this week!</p>
            <p className="text-[11px] text-muted-foreground">Play a quest now to claim 1st place! 🥇</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Top 3 Compact Rows */}
            {topThree.map((entry) => {
              const isFirst = entry.rank === 1;
              const isSecond = entry.rank === 2;
              const isThird = entry.rank === 3;

              return (
                <div
                  key={`${entry.first_name}-${entry.rank}`}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-2xl border transition-all text-xs',
                    entry.is_current_user
                      ? 'bg-[#E6EEFA] dark:bg-[#161F3B] border-[#4FC3E8] font-black'
                      : isFirst
                        ? 'bg-amber-500/10 border-amber-400/40'
                        : 'bg-muted/30 dark:bg-[#141C38] border-border/50'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0',
                        isFirst
                          ? 'bg-amber-400 text-amber-950 shadow-xs'
                          : isSecond
                            ? 'bg-slate-300 text-slate-900'
                            : isThird
                              ? 'bg-amber-700 text-white'
                              : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isFirst ? '🥇' : isSecond ? '🥈' : '🥉'}
                    </span>

                    <div className="min-w-0">
                      <p className="font-extrabold text-foreground truncate max-w-[130px]">
                        {entry.first_name} {entry.is_current_user && '(You)'}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                        <span>{entry.games_played || 1} quest{entry.games_played === 1 ? '' : 's'}</span>
                        {entry.best_combo > 0 && (
                          <span className="text-amber-500 font-bold">
                            • {entry.best_combo}🔥
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-black text-[#2B2F8F] dark:text-[#4FC3E8]">
                      {entry.score.toLocaleString()} <span className="text-[10px]">pts</span>
                    </p>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                      {Math.round(entry.accuracy)}%
                    </Badge>
                  </div>
                </div>
              );
            })}

            {/* Current Student Pinned Row (if outside top 3) */}
            {currentUserEntry && !isCurrentUserInTop3 && (
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#E6EEFA] dark:bg-[#161F3B] border-2 border-[#4FC3E8] text-xs font-black">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded-full bg-[#2B2F8F] text-white text-[10px]">
                    #{currentUserEntry.rank}
                  </span>
                  <span>{currentUserEntry.first_name} (You)</span>
                </div>
                <div className="text-right">
                  <span className="text-[#2B2F8F] dark:text-[#4FC3E8]">
                    {currentUserEntry.score.toLocaleString()} pts
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Play Native Quest CTA Button */}
        {showPlayButton && (
          <div className="pt-1">
            <Button
              asChild
              size="sm"
              className="w-full h-10 font-black rounded-xl native-btn-accent text-white gap-2 shadow-[0_3px_0_#289FCE]"
            >
              <Link to="/student/grammar-rush">
                <Zap className="w-4 h-4 fill-current" />
                <span>Play Native Quest</span>
                <span className="text-white/80">• +10 XP</span>
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
