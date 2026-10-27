import React from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Trophy, Award, Printer, CheckCircle2, X, Sparkles, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';

interface FullCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  book: string;
  cefr: string;
  totalScore: number;
  completedChaptersCount: number;
}

export const FullCertificateModal: React.FC<FullCertificateModalProps> = ({
  isOpen,
  onClose,
  studentName,
  book,
  cefr,
  totalScore,
  completedChaptersCount,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const certificateId = `NE-${book.slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border-4 border-[#2B2F8F] bg-white dark:bg-[#0E1428] shadow-2xl">
        {/* Decorative Top Banner */}
        <div className="relative bg-gradient-to-r from-[#2B2F8F] via-[#373BB0] to-[#2B2F8F] text-white p-6 sm:p-8 text-center border-b-4 border-[#4FC3E8]">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Golden Seal & Header */}
          <div className="w-16 h-16 rounded-full bg-[#FFC800] border-4 border-white mx-auto mb-3 flex items-center justify-center shadow-lg">
            <Trophy className="w-8 h-8 text-[#784900] fill-[#784900]" />
          </div>

          <p className="text-xs font-black tracking-widest uppercase text-[#4FC3E8]">
            NATIVE ENGLISH • OFFICIAL CERTIFICATION
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 text-white uppercase">
            Certificate of Mastery
          </h1>
          <p className="text-xs sm:text-sm text-white/90 font-medium max-w-md mx-auto mt-1">
            Native Quest {book} English Curriculum • CEFR {cefr}
          </p>
        </div>

        {/* Certificate Body */}
        <div className="p-6 sm:p-10 space-y-6 text-center bg-radial from-white via-white to-[#E6EEFA]/30 dark:from-[#0E1428] dark:to-[#141C38]">
          <div className="space-y-2">
            <p className="text-xs uppercase font-extrabold text-muted-foreground tracking-widest">
              This is proudly presented to
            </p>
            <h2 className="text-2xl sm:text-4xl font-black text-[#2B2F8F] dark:text-[#4FC3E8] tracking-tight border-b-2 border-[#4FC3E8]/40 pb-2 inline-block px-8">
              {studentName || 'Student'}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto pt-2 leading-relaxed">
              for successfully completing all <span className="font-bold text-foreground">{completedChaptersCount} chapters</span> of the Native English {book} Quest curriculum, demonstrating comprehensive proficiency in grammar structures, vocabulary synthesis, and conversational spoken pronunciation.
            </p>
          </div>

          {/* Certificate Credentials Grid */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto py-2">
            <div className="p-3 rounded-2xl bg-[#E6EEFA] dark:bg-[#161F3B] border border-[#BAC9E2]/60 dark:border-transparent text-center">
              <span className="text-[10px] font-black uppercase text-[#2B2F8F] dark:text-[#4FC3E8] block">
                CEFR Level
              </span>
              <span className="text-sm sm:text-base font-black text-foreground">
                {cefr}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#E6EEFA] dark:bg-[#161F3B] border border-[#BAC9E2]/60 dark:border-transparent text-center">
              <span className="text-[10px] font-black uppercase text-[#2B2F8F] dark:text-[#4FC3E8] block">
                Total Quest XP
              </span>
              <span className="text-sm sm:text-base font-black text-foreground">
                {totalScore.toLocaleString()}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#E6EEFA] dark:bg-[#161F3B] border border-[#BAC9E2]/60 dark:border-transparent text-center">
              <span className="text-[10px] font-black uppercase text-[#2B2F8F] dark:text-[#4FC3E8] block">
                Issue Date
              </span>
              <span className="text-sm sm:text-base font-black text-foreground">
                {format(new Date(), 'MMM yyyy')}
              </span>
            </div>
          </div>

          {/* Signatures & Seal Row */}
          <div className="flex items-center justify-between pt-6 border-t-2 border-slate-200 dark:border-[#1E294B] max-w-lg mx-auto text-left">
            <div className="space-y-1">
              <div className="h-0.5 w-32 bg-[#2B2F8F] dark:bg-[#4FC3E8]" />
              <p className="text-xs font-black text-foreground">Native English</p>
              <p className="text-[10px] text-muted-foreground">Academic Coordination</p>
            </div>

            {/* Official Digital Seal */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#E6EEFA] dark:bg-[#161F3B] text-[10px] font-black text-[#2B2F8F] dark:text-[#4FC3E8] border border-[#BAC9E2]">
              <ShieldCheck className="w-4 h-4 text-[#4FC3E8]" />
              <span>ID: {certificateId}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 h-12 rounded-2xl native-btn-primary font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_5px_0_#1C2068]"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download Certificate</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="h-12 px-5 rounded-2xl native-btn-ice font-black text-xs uppercase tracking-wider shadow-[0_4px_0_#BAC9E2]"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
