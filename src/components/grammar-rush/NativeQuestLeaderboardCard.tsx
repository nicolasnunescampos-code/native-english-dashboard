import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { GrammarBookLevel } from '@/lib/supabase';
import { useGrammarLeaderboard } from '@/hooks/useGrammarRush';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Trophy,
  Flame,
  Zap,
  Crown,
  Medal,
  Camera,
  Sparkles,
  Calendar,
  ArrowRight,
  Target,
  Award,
} from 'lucide-react';

interface NativeQuestLeaderboardCardProps {
  defaultBook?: GrammarBookLevel | 'ALL';
  defaultTimeframe?: 'week' | 'all_time';
  chapter?: string;
  showPlayButton?: boolean;
  showSocialMediaButton?: boolean;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

export const NativeQuestLeaderboardCard: React.FC<NativeQuestLeaderboardCardProps> = ({
  defaultBook = 'ALL',
  defaultTimeframe = 'week',
  chapter = 'all',
  showPlayButton = false,
  showSocialMediaButton = true,
  compact = false,
  title = 'Native Quest Weekly Ranking',
  subtitle = "Tap 'Social Media Rank Card' to open a clean weekly championship poster ready to screenshot and post!",
}) => {
  const { studentName } = useAuth();
  const [selectedBook, setSelectedBook] = useState<GrammarBookLevel | 'ALL'>(defaultBook);
  const [timeframe, setTimeframe] = useState<'week' | 'all_time'>(defaultTimeframe);
  const [socialModalOpen, setSocialModalOpen] = useState(false);

  const { data: leaderboard = [], isLoading } = useGrammarLeaderboard(
    selectedBook,
    chapter,
    timeframe
  );

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekRangeLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  const topThree = [
    leaderboard.find((e) => e.rank === 1) || leaderboard[0],
    leaderboard.find((e) => e.rank === 2) || leaderboard[1],
    leaderboard.find((e) => e.rank === 3) || leaderboard[2],
  ];

  const topTen = leaderboard.slice(0, 10);
  const runnersUp = topTen.slice(3);
  const myEntry = leaderboard.find((e) => e.is_current_user);

  const getDisplayName = (entry?: (typeof leaderboard)[0] | null) => {
    if (!entry) return '';
    if (entry.is_current_user && studentName) return studentName;
    return entry.first_name || 'Student';
  };

  const formatPodiumName = (entry?: (typeof leaderboard)[0] | null) => {
    if (!entry) return '';
    const name = getDisplayName(entry);
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return parts[0];
  };

  const renderPodium = (isSocialPoster = false) => {
    if (leaderboard.length === 0) return null;

    const first = topThree[0];
    const second = topThree[1];
    const third = topThree[2];

    return (
      <div
        className={`grid grid-cols-3 gap-1.5 sm:gap-4 items-end pt-5 sm:pt-6 pb-2 ${
          isSocialPoster ? 'px-1 sm:px-4' : ''
        }`}
      >
        {/* 2nd Place (Left) */}
        <div className="flex flex-col items-center">
          {second ? (
            <div
              className={`w-full rounded-2xl border p-2 sm:p-4 text-center transition-all relative ${
                second.is_current_user
                  ? 'bg-gradient-to-b from-slate-700/80 to-indigo-950/90 border-indigo-400/60 ring-2 ring-indigo-400/30'
                  : 'bg-gradient-to-b from-slate-800/90 to-slate-900/95 border-slate-500/40'
              } shadow-lg`}
            >
              <div className="mx-auto -mt-6 sm:-mt-7 mb-1 sm:mb-2 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-slate-200 via-slate-300 to-slate-500 flex items-center justify-center shadow-md border-2 border-slate-100">
                <span className="text-base sm:text-xl" role="img" aria-label="2nd place">
                  🥈
                </span>
              </div>
              <Badge className="bg-slate-400/20 text-slate-200 border-slate-400/40 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 mb-1 max-w-full truncate font-bold">
                #2 SILVER
              </Badge>
              <p
                className="font-bold text-white text-[11px] sm:text-sm truncate w-full block leading-snug"
                title={getDisplayName(second)}
              >
                {formatPodiumName(second)}
                {second.is_current_user && !isSocialPoster ? ' (You)' : ''}
              </p>
              <p className="text-xs sm:text-xl font-black text-slate-100 mt-0.5 sm:mt-1 leading-tight">
                {second.score.toLocaleString()}
                <span className="text-[9px] sm:text-[10px] font-normal text-slate-400 ml-0.5">pts</span>
              </p>
              <div className="flex items-center justify-center gap-1 sm:gap-2 mt-1 sm:mt-1.5 text-[9px] sm:text-[10px] text-slate-300">
                <span className="inline-flex items-center gap-0.5 text-orange-300 font-semibold">
                  <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {second.best_combo}x
                </span>
                <span>•</span>
                <span className="text-emerald-300 font-semibold">{second.accuracy}%</span>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-2xl border border-dashed border-white/20 bg-white/[0.04] p-2.5 sm:p-4 text-center">
              <Medal className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400/70 mx-auto mb-1" />
              <p className="text-[11px] sm:text-xs text-slate-400 font-bold">#2 Open</p>
            </div>
          )}
        </div>

        {/* 1st Place (Center, Elevated) */}
        <div className="flex flex-col items-center -mt-3 sm:-mt-4">
          {first ? (
            <div
              className={`w-full rounded-2xl border-2 p-2.5 sm:p-5 text-center transition-all relative ${
                first.is_current_user
                  ? 'bg-gradient-to-b from-amber-500/30 via-yellow-600/20 to-indigo-950/95 border-amber-400 ring-2 ring-amber-400/40'
                  : 'bg-gradient-to-b from-amber-500/25 via-amber-600/15 to-slate-900/95 border-amber-400/80'
              } shadow-[0_0_30px_rgba(245,158,11,0.28)]`}
            >
              <div className="mx-auto -mt-7 sm:-mt-9 mb-1 sm:mb-2 w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.6)] border-2 border-yellow-100">
                <Crown className="h-5 w-5 sm:h-7 sm:w-7 text-amber-950 fill-amber-950" />
              </div>
              <Badge className="bg-amber-400/25 text-amber-200 border-amber-300/50 text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2.5 py-0.5 mb-1 max-w-full truncate">
                <span className="hidden sm:inline">👑 #1 CHAMPION</span>
                <span className="sm:hidden">👑 #1 CHAMP</span>
              </Badge>
              <p
                className="font-extrabold text-white text-xs sm:text-base truncate w-full block leading-snug"
                title={getDisplayName(first)}
              >
                {formatPodiumName(first)}
                {first.is_current_user && !isSocialPoster ? ' (You)' : ''}
              </p>
              <p className="text-sm sm:text-2xl font-black text-amber-300 mt-0.5 sm:mt-1 drop-shadow leading-tight">
                {first.score.toLocaleString()}
                <span className="text-[9px] sm:text-[10px] font-normal text-amber-200/80 ml-0.5">pts</span>
              </p>
              <div className="flex items-center justify-center gap-1 sm:gap-2 mt-1 sm:mt-1.5 text-[9px] sm:text-[11px]">
                <span className="inline-flex items-center gap-0.5 text-orange-300 font-bold">
                  <Flame className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" /> {first.best_combo}x
                </span>
                <span className="text-amber-300/50">•</span>
                <span className="text-emerald-300 font-bold">{first.accuracy}%</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* 3rd Place (Right) */}
        <div className="flex flex-col items-center">
          {third ? (
            <div
              className={`w-full rounded-2xl border p-2 sm:p-4 text-center transition-all relative ${
                third.is_current_user
                  ? 'bg-gradient-to-b from-amber-900/50 to-indigo-950/90 border-indigo-400/60 ring-2 ring-indigo-400/30'
                  : 'bg-gradient-to-b from-amber-950/60 to-slate-900/95 border-amber-700/50'
              } shadow-lg`}
            >
              <div className="mx-auto -mt-6 sm:-mt-7 mb-1 sm:mb-2 w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-amber-500 via-orange-600 to-amber-800 flex items-center justify-center shadow-md border-2 border-amber-200">
                <span className="text-base sm:text-xl" role="img" aria-label="3rd place">
                  🥉
                </span>
              </div>
              <Badge className="bg-amber-700/30 text-amber-200 border-amber-600/40 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 mb-1 max-w-full truncate font-bold">
                #3 BRONZE
              </Badge>
              <p
                className="font-bold text-white text-[11px] sm:text-sm truncate w-full block leading-snug"
                title={getDisplayName(third)}
              >
                {formatPodiumName(third)}
                {third.is_current_user && !isSocialPoster ? ' (You)' : ''}
              </p>
              <p className="text-xs sm:text-xl font-black text-amber-100 mt-0.5 sm:mt-1 leading-tight">
                {third.score.toLocaleString()}
                <span className="text-[9px] sm:text-[10px] font-normal text-amber-300/70 ml-0.5">pts</span>
              </p>
              <div className="flex items-center justify-center gap-1 sm:gap-2 mt-1 sm:mt-1.5 text-[9px] sm:text-[10px] text-slate-300">
                <span className="inline-flex items-center gap-0.5 text-orange-300 font-semibold">
                  <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {third.best_combo}x
                </span>
                <span>•</span>
                <span className="text-emerald-300 font-semibold">{third.accuracy}%</span>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-2xl border border-dashed border-white/20 bg-white/[0.04] p-2.5 sm:p-4 text-center">
              <Medal className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500/60 mx-auto mb-1" />
              <p className="text-[11px] sm:text-xs text-slate-400 font-bold">#3 Open</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card className="border-amber-500/30 bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-900 shadow-[0_10px_40px_rgba(245,158,11,0.12)] overflow-hidden relative">
        {/* Decorative top accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-indigo-500" />

        <CardHeader className="p-3.5 sm:p-6 pb-2 sm:pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5">
                  <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-amber-400" />
                  LIVE COMPETITION
                </Badge>
                {timeframe === 'week' ? (
                  <Badge
                    variant="outline"
                    className="bg-white/5 text-slate-300 border-white/15 text-[10px] sm:text-[11px] px-2 sm:px-2.5 py-0.5"
                  >
                    <Calendar className="h-3 w-3 mr-1 text-indigo-400" />
                    Week of {weekRangeLabel}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-purple-500/15 text-purple-200 border-purple-500/30 text-[10px] sm:text-[11px]"
                  >
                    <Sparkles className="h-3 w-3 mr-1 text-purple-300" />
                    All-Time Hall of Fame
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
                {title}
              </CardTitle>
              {!compact && (
                <CardDescription className="text-slate-300 text-xs sm:text-sm mt-0.5 line-clamp-2 sm:line-clamp-none">
                  {subtitle}
                </CardDescription>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {showSocialMediaButton && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setSocialModalOpen(true)}
                  className="w-full sm:w-auto justify-center bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border-amber-500/40 font-semibold text-xs gap-1.5 cursor-pointer"
                >
                  <Camera className="h-3.5 w-3.5 text-amber-300" />
                  Social Media Rank Card
                </Button>
              )}
              {showPlayButton && (
                <Button
                  asChild
                  size="sm"
                  className="w-full sm:w-auto justify-center bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20"
                >
                  <Link to="/student/grammar-rush">
                    <Zap className="h-3.5 w-3.5 mr-1 fill-slate-950" />
                    Play Native Quest
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Filter Bar: Level & Timeframe */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 mt-2 border-t border-white/10">
            {/* Horizontally scrollable level pills on mobile */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 shrink-0">
              {(['ALL', 'Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedBook(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 whitespace-nowrap cursor-pointer ${
                    selectedBook === lvl
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-extrabold'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {lvl === 'ALL' ? '🌎 All Levels' : lvl}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-white/10 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setTimeframe('week')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  timeframe === 'week'
                    ? 'bg-indigo-600 text-white shadow font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔥 This Week
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('all_time')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  timeframe === 'all_time'
                    ? 'bg-indigo-600 text-white shadow font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏆 All-Time
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-6 pt-0 space-y-4">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-400 animate-pulse">
              Loading live Native Quest ranking...
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="py-8 sm:py-10 text-center space-y-3 bg-white/[0.02] rounded-2xl border border-dashed border-white/10 p-4 sm:p-6">
              <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-amber-400/50 mx-auto" />
              <div>
                <p className="text-sm sm:text-base font-bold text-white">
                  The {timeframe === 'week' ? 'Weekly' : 'All-Time'} Podium is Wide Open!
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  No scores recorded yet for {selectedBook === 'ALL' ? 'any level' : selectedBook}{' '}
                  {timeframe === 'week' ? 'this week' : ''}. Be the first to play and claim the #1
                  Champion spot!
                </p>
              </div>
              {showPlayButton && (
                <Button
                  asChild
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  <Link to="/student/grammar-rush">
                    <Zap className="h-4 w-4 mr-1.5" /> Start First Quest Now
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Podium for Top 3 */}
              {renderPodium(false)}

              {/* Runners-Up (#4 - #10) */}
              {runnersUp.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 sm:px-3 pb-1">
                    <span>Rank & Student</span>
                    <span>Stats & Total Points</span>
                  </div>
                  {runnersUp.map((entry) => (
                    <div
                      key={`${entry.rank}-${entry.first_name}`}
                      className={`flex items-center justify-between px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl border transition-all ${
                        entry.is_current_user
                          ? 'bg-indigo-600/25 border-indigo-400/50 text-white shadow-sm'
                          : 'bg-slate-900/75 border-white/10 text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] sm:text-xs font-extrabold text-slate-300 shrink-0">
                          #{entry.rank}
                        </span>
                        <div className="min-w-0">
                          <p
                            className="text-xs sm:text-sm font-bold truncate flex items-center gap-1 sm:gap-1.5"
                            title={getDisplayName(entry)}
                          >
                            <span className="truncate">{getDisplayName(entry)}</span>
                            {entry.is_current_user && (
                              <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40 text-[9px] sm:text-[10px] py-0 shrink-0">
                                You
                              </Badge>
                            )}
                          </p>
                          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                            {entry.games_played} quest{entry.games_played === 1 ? '' : 's'}
                            <span className="sm:hidden text-slate-400 font-semibold"> • 🔥{entry.best_combo}x • {entry.accuracy}%</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300">
                          <span className="inline-flex items-center gap-0.5 text-orange-300 font-semibold">
                            <Flame className="h-3.5 w-3.5" /> {entry.best_combo}x
                          </span>
                          <span className="text-slate-600">•</span>
                          <span className="text-emerald-300 font-semibold">{entry.accuracy}%</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs sm:text-base font-extrabold text-amber-300">
                            {entry.score.toLocaleString()}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-slate-400 ml-0.5 sm:ml-1">pts</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Current Student Rank Banner if outside Top 10 (or quick summary) */}
              {myEntry && myEntry.rank > 10 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-indigo-300 font-semibold mb-1.5">
                    Your Current Position
                  </p>
                  <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-indigo-600/25 border border-indigo-400/50 text-white">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-500/30 border border-indigo-300/40 flex items-center justify-center text-xs font-black shrink-0">
                        #{myEntry.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold truncate" title={getDisplayName(myEntry)}>
                          {getDisplayName(myEntry)} (You)
                        </p>
                        <p className="text-[10px] sm:text-xs text-indigo-200">
                          Accuracy {myEntry.accuracy}% • Best Combo {myEntry.best_combo}x
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm sm:text-base font-black text-amber-300">
                        {myEntry.score.toLocaleString()} pts
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Social Media Screenshot-Ready Modal */}
      <Dialog open={socialModalOpen} onOpenChange={setSocialModalOpen}>
        <DialogContent className="max-w-2xl w-[94vw] sm:w-full bg-slate-950 border-amber-500/40 text-white p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2 border-b border-white/10 flex flex-row items-center justify-between shrink-0">
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-amber-300 flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Social Media Screenshot Mode
              </DialogTitle>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Take a screenshot of the card below to share on Instagram, WhatsApp, or community
                channels!
              </p>
            </div>
          </DialogHeader>

          {/* Clean Poster Frame for Screenshot */}
          <div className="p-2.5 sm:p-6 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 relative overflow-y-auto flex-1">
            {/* Ambient Glows */}
            <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl" />

            <div className="rounded-2xl sm:rounded-3xl border-2 border-amber-400/50 bg-slate-900/90 p-3 sm:p-7 shadow-[0_0_50px_rgba(245,158,11,0.2)] relative z-10 space-y-3 sm:space-y-5">
              {/* Poster Header */}
              <div className="text-center space-y-1 sm:space-y-1.5 border-b border-white/10 pb-3 sm:pb-4">
                <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] sm:text-xs font-extrabold tracking-wider uppercase">
                  <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-400" />
                  {timeframe === 'week' ? `WEEKLY RANKING • ${weekRangeLabel}` : 'ALL-TIME RANKING'}
                </div>
                <h2 className="text-xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-orange-400">
                  NATIVE QUEST CHAMPIONS
                </h2>
                <p className="text-[11px] sm:text-sm text-slate-300 font-medium">
                  {selectedBook === 'ALL'
                    ? 'All CEFR Levels Combined'
                    : `${selectedBook} Level Division`}{' '}
                  • Grammar & Speaking Mastery
                </p>
              </div>

              {/* Podium */}
              {leaderboard.length > 0 ? (
                <>
                  {renderPodium(true)}

                  {/* Top 4 - 8 compact list */}
                  {runnersUp.slice(0, 5).length > 0 && (
                    <div className="space-y-1 sm:space-y-1.5 pt-1 sm:pt-2">
                      {runnersUp.slice(0, 5).map((entry) => (
                        <div
                          key={`poster-${entry.rank}-${entry.first_name}`}
                          className="flex items-center justify-between px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/[0.04] border border-white/10 text-slate-200"
                        >
                          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 mr-2">
                            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-white/10 flex items-center justify-center text-[11px] sm:text-xs font-black text-amber-300 shrink-0">
                              #{entry.rank}
                            </span>
                            <span
                              className="text-xs sm:text-sm font-bold text-white truncate max-w-[140px] sm:max-w-[200px]"
                              title={getDisplayName(entry)}
                            >
                              {getDisplayName(entry)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs shrink-0">
                            <span className="text-orange-300 font-semibold flex items-center gap-0.5">
                              <Flame className="h-3 w-3" /> {entry.best_combo}x
                            </span>
                            <span className="text-emerald-300 font-semibold">
                              {entry.accuracy}%
                            </span>
                            <span className="text-xs sm:text-sm font-black text-amber-300">
                              {entry.score.toLocaleString()} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="py-6 sm:py-8 text-center text-slate-400 text-xs sm:text-sm">
                  No games recorded for this filter yet.
                </div>
              )}

              {/* Poster Footer */}
              <div className="pt-2 sm:pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black text-xs shrink-0">
                    NQ
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs font-extrabold text-white">
                      Want your name on next week&apos;s podium?
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-slate-400">
                      Play Native Quest daily in the Student Portal to climb the leaderboard!
                    </p>
                  </div>
                </div>
                <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 text-[10px] sm:text-[11px] font-bold shrink-0">
                  <Award className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-amber-400" />
                  Weekly Crown Challenge
                </Badge>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
