import React from 'react';
import { Trophy, Dumbbell, Award, BookOpen, Sparkles } from 'lucide-react';

export type DuolingoTab = 'learn' | 'leaderboard' | 'practice' | 'quests' | 'guidebook';

interface DuolingoBottomNavProps {
  activeTab: DuolingoTab;
  onTabChange: (tab: DuolingoTab) => void;
  hasQuestNotification?: boolean;
}

export const DuolingoBottomNav: React.FC<DuolingoBottomNavProps> = ({
  activeTab,
  onTabChange,
  hasQuestNotification = true,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-background/95 dark:bg-[#131f24]/95 border-t border-border/80 dark:border-[#283b45] py-2 px-3 sm:px-6 transition-colors shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {/* Tab 1: Learn / Map (Signature Duo House) */}
        <button
          type="button"
          onClick={() => onTabChange('learn')}
          className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all focus:outline-none ${
            activeTab === 'learn'
              ? 'text-sky-500 scale-105'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Learn Map"
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
              activeTab === 'learn'
                ? 'bg-[#1cb0f6]/20 border-2 border-[#1cb0f6] shadow-xs'
                : 'hover:bg-muted/50 dark:hover:bg-[#1e2e38]'
            }`}
          >
            {/* Duolingo House Icon */}
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path
                d="M3 10.5L12 3L21 10.5V20C21 20.5523 20.5523 21 20 21H15V15H9V21H4C3.44772 21 3 20.5523 3 20V10.5Z"
                fill={activeTab === 'learn' ? '#ffc800' : 'currentColor'}
                stroke={activeTab === 'learn' ? '#e5a500' : 'currentColor'}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="11" r="1.5" fill={activeTab === 'learn' ? '#e5a500' : 'currentColor'} />
            </svg>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">
            Learn
          </span>
        </button>

        {/* Tab 2: Leaderboard (Trophy / League) */}
        <button
          type="button"
          onClick={() => onTabChange('leaderboard')}
          className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all focus:outline-none ${
            activeTab === 'leaderboard'
              ? 'text-amber-500 scale-105'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Weekly Leaderboard & Leagues"
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-amber-500/20 border-2 border-amber-500 shadow-xs'
                : 'hover:bg-muted/50 dark:hover:bg-[#1e2e38]'
            }`}
          >
            <Trophy
              className={`w-5 h-5 ${
                activeTab === 'leaderboard'
                  ? 'text-amber-500 fill-amber-500'
                  : 'text-muted-foreground'
              }`}
            />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">
            Leagues
          </span>
        </button>

        {/* Tab 3: Practice (Dumbbell) */}
        <button
          type="button"
          onClick={() => onTabChange('practice')}
          className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all focus:outline-none ${
            activeTab === 'practice'
              ? 'text-sky-500 scale-105'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Practice Hub"
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
              activeTab === 'practice'
                ? 'bg-sky-500/20 border-2 border-sky-500 shadow-xs'
                : 'hover:bg-muted/50 dark:hover:bg-[#1e2e38]'
            }`}
          >
            <Dumbbell
              className={`w-5 h-5 ${
                activeTab === 'practice' ? 'text-sky-500' : 'text-muted-foreground'
              }`}
            />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">
            Practice
          </span>
        </button>

        {/* Tab 4: Quests & Badges (Chest) */}
        <button
          type="button"
          onClick={() => onTabChange('quests')}
          className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all relative focus:outline-none ${
            activeTab === 'quests'
              ? 'text-purple-500 scale-105'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Daily Quests & Badges"
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
              activeTab === 'quests'
                ? 'bg-purple-500/20 border-2 border-purple-500 shadow-xs'
                : 'hover:bg-muted/50 dark:hover:bg-[#1e2e38]'
            }`}
          >
            {/* Duolingo Chest Icon */}
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
              <path
                d="M3 9C3 7.89543 3.89543 7 5 7H19C20.1046 7 21 7.89543 21 9V11H3V9Z"
                fill={activeTab === 'quests' ? '#ffc800' : 'currentColor'}
                stroke={activeTab === 'quests' ? '#e5a500' : 'currentColor'}
                strokeWidth="1.5"
              />
              <path
                d="M3 11H21V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V11Z"
                fill={activeTab === 'quests' ? '#fbbf24' : 'currentColor'}
                stroke={activeTab === 'quests' ? '#d97706' : 'currentColor'}
                strokeWidth="1.5"
              />
              <circle cx="12" cy="13" r="1.5" fill="#78350f" />
            </svg>
            {hasQuestNotification && (
              <span className="absolute top-2 right-4 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white dark:border-[#131f24]" />
            )}
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">
            Quests
          </span>
        </button>

        {/* Tab 5: Guidebook (Book) */}
        <button
          type="button"
          onClick={() => onTabChange('guidebook')}
          className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all focus:outline-none ${
            activeTab === 'guidebook'
              ? 'text-emerald-500 scale-105'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Curriculum Guidebook"
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
              activeTab === 'guidebook'
                ? 'bg-emerald-500/20 border-2 border-emerald-500 shadow-xs'
                : 'hover:bg-muted/50 dark:hover:bg-[#1e2e38]'
            }`}
          >
            <BookOpen
              className={`w-5 h-5 ${
                activeTab === 'guidebook' ? 'text-emerald-500' : 'text-muted-foreground'
              }`}
            />
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">
            Guidebook
          </span>
        </button>
      </div>
    </nav>
  );
};
