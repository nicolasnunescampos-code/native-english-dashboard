import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import TeacherSpeakingTracker from '../teacher/TeacherSpeakingTracker';
import AdminGrammarRushTracker from './AdminGrammarRushTracker';
import { Mic, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminPracticeTracker() {
  const location = useLocation();
  const initialIsGrammar = location.pathname.includes('grammar-rush');
  const [activeTab, setActiveTab] = useState<'speaking' | 'grammar'>(
    initialIsGrammar ? 'grammar' : 'speaking'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center sm:justify-start">
        <div className="liquid-glass-pill p-1.5 rounded-2xl inline-flex items-center gap-1.5 border border-white/60 dark:border-white/10 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('speaking')}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200',
              activeTab === 'speaking'
                ? 'liquid-btn-primary text-white shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/[0.06]'
            )}
          >
            <Mic className="w-4 h-4" />
            <span>Speaking Activity</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('grammar')}
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

      {activeTab === 'grammar' ? <AdminGrammarRushTracker /> : <TeacherSpeakingTracker />}
    </div>
  );
}
