import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GrammarBookLevel } from '@/lib/supabase';
import { SPEAKING_BOOKS } from '@/data/speakingCurriculum';
import { playNativeSpeech } from '@/utils/speechEvaluator';
import { Volume2, Sparkles, BookOpen, Check, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DuolingoGuidebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: GrammarBookLevel;
  chapterNumber: string;
}

export const DuolingoGuidebookModal: React.FC<DuolingoGuidebookModalProps> = ({
  isOpen,
  onClose,
  book,
  chapterNumber,
}) => {
  const [playingSentenceId, setPlayingSentenceId] = useState<string | null>(null);
  const cancelSpeechRef = useRef<(() => void) | null>(null);

  // Clean up audio on unmount or dialog close
  useEffect(() => {
    return () => {
      if (cancelSpeechRef.current) {
        cancelSpeechRef.current();
        cancelSpeechRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (cancelSpeechRef.current) {
        cancelSpeechRef.current();
        cancelSpeechRef.current = null;
      }
      setPlayingSentenceId(null);
    }
  }, [isOpen]);

  // Find book and chapter data
  const bookData = SPEAKING_BOOKS.find((b) =>
    book === 'Advanced' ? b.level === 'Advanced' : b.level === book
  );

  const chapterData = bookData?.chapters.find(
    (c) => String(c.chapterNumber) === String(chapterNumber)
  ) || bookData?.chapters[0];

  const handlePlayAudio = (id: string, text: string) => {
    if (playingSentenceId === id) {
      if (cancelSpeechRef.current) {
        cancelSpeechRef.current();
        cancelSpeechRef.current = null;
      }
      setPlayingSentenceId(null);
      return;
    }

    if (cancelSpeechRef.current) {
      cancelSpeechRef.current();
    }

    setPlayingSentenceId(id);
    cancelSpeechRef.current = playNativeSpeech(
      text,
      1.0,
      () => setPlayingSentenceId(id),
      () => {
        setPlayingSentenceId((curr) => (curr === id ? null : curr));
        cancelSpeechRef.current = null;
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-3xl border-2 border-slate-200 dark:border-[#37464f] bg-white dark:bg-[#18272f]">
        {/* Brand Native English Navy Header Banner (#2B2F8F) */}
        <div className="bg-gradient-to-r from-[#2B2F8F] via-[#353AA6] to-[#2B2F8F] text-white p-5 shadow-[0_4px_0_#1C2068] border-b-2 border-[#4FC3E8]">
          <div className="flex items-center gap-2 text-[#4FC3E8] text-xs font-black uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Unit Guidebook • {book} Stage</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black text-white">
            Chapter {chapterData?.chapterNumber}: {chapterData?.title}
          </DialogTitle>
          <p className="text-xs font-semibold text-white/85 mt-1">
            {chapterData?.grammarFocus}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[68vh] overflow-y-auto">
          {/* Key Grammar Rule Card */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300">
              <Lightbulb className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Key Concept</span>
            </div>
            <p className="text-xs sm:text-sm text-foreground font-semibold leading-relaxed">
              {chapterData?.grammarFocus}
            </p>
          </div>

          {/* Key Phrases & Pronunciation Audio */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>Key Examples & Native Pronunciation</span>
            </h4>

            <div className="space-y-2">
              {(chapterData?.sentences || []).slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-[#283b45] bg-muted/30 dark:bg-[#131f24] hover:border-sky-400/50 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-black text-foreground">
                      "{s.sentence}"
                    </p>
                    {s.grammarTip && (
                      <p className="text-xs text-muted-foreground font-medium">
                        💡 {s.grammarTip}
                      </p>
                    )}
                    {s.phoneticFocus && (
                      <p className="text-[11px] text-sky-600 dark:text-sky-400 font-bold">
                        🎙️ {s.phoneticFocus}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePlayAudio(s.id, s.sentence)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer ${
                      playingSentenceId === s.id
                        ? 'bg-[#2B2F8F] text-white shadow-xs animate-pulse ring-2 ring-[#4FC3E8]'
                        : 'bg-[#4FC3E8] text-white shadow-[0_3px_0_#289FCE]'
                    }`}
                    title="Listen to native voice"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Done Button in Brand Azul claro */}
        <div className="p-4 border-t border-slate-200 dark:border-[#283b45] bg-[#E6EEFA]/30 dark:bg-[#141C38]">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-2xl native-btn-accent font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_0_#289FCE] active:translate-y-1 active:shadow-none cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Got It, Let's Quest!</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
