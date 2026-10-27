import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import StudentSpeakingLab from './StudentSpeakingLab';
import StudentGrammarRush from './StudentGrammarRush';
import { Mic, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentPracticeHub() {
  const location = useLocation();
  const navigate = useNavigate();

  const isGrammarTab =
    location.pathname.includes('grammar-rush') ||
    new URLSearchParams(location.search).get('tab') === 'grammar';

  const activeTab: 'speaking' | 'grammar' = isGrammarTab ? 'grammar' : 'speaking';

  const handleSelectTab = (tab: 'speaking' | 'grammar') => {
    if (tab === 'grammar') {
      navigate('/student/grammar-rush', { replace: true });
    } else {
      navigate('/student/speaking', { replace: true });
    }
  };

  return (
    <div className="space-y-6">
      {/* Unified Liquid Glass Tab Switcher */}
      <div className="flex items-center justify-center sm:justify-start">
        <div className="liquid-glass-pill p-1.5 rounded-2xl inline-flex items-center gap-1.5 border border-white/60 dark:border-white/10 shadow-sm">
          <button
            type="button"
            onClick={() => handleSelectTab('speaking')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200',
              activeTab === 'speaking'
                ? 'liquid-btn-primary text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/[0.06]'
            )}
          >
            <Mic className="w-4 h-4" />
            <span>Speaking Lab</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectTab('grammar')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200',
              activeTab === 'grammar'
                ? 'liquid-btn-primary text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/[0.06]'
            )}
          >
            <Zap className="w-4 h-4" />
            <span>Native Quest</span>
          </button>
        </div>
      </div>

      {/* Active Module Content */}
      {activeTab === 'grammar' ? <StudentGrammarRush /> : <StudentSpeakingLab />}
    </div>
  );
}
