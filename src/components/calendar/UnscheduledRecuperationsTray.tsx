import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, CalendarPlus, ChevronDown, ChevronUp, Check, AlertCircle, Clock } from 'lucide-react';
import { PendingRecuperationItem } from '@/utils/recuperationSync';

interface Props {
  pendingRecuperations: PendingRecuperationItem[];
  loading?: boolean;
  onSchedule: (item: PendingRecuperationItem) => void;
  onDismiss?: (item: PendingRecuperationItem) => void;
  onRefresh?: () => void;
}

export const UnscheduledRecuperationsTray: React.FC<Props> = ({
  pendingRecuperations,
  loading = false,
  onSchedule,
  onDismiss,
  onRefresh,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (pendingRecuperations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 backdrop-blur-md p-4 shadow-sm transition-all animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-sm">
            <RotateCcw className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                Unscheduled Recuperations
              </h3>
              <Badge className="bg-amber-500 text-white font-extrabold px-2 py-0.5 text-xs shadow-sm hover:bg-amber-600">
                {pendingRecuperations.length} {pendingRecuperations.length === 1 ? 'student waiting' : 'students waiting'}
              </Badge>
            </div>
            <p className="text-xs text-amber-900/70 dark:text-amber-300/70 mt-0.5">
              These students rescheduled or were granted courtesy makeups. Click below to slot their extra class.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="text-xs text-amber-900/70 hover:text-amber-950 hover:bg-amber-500/15"
            >
              Refresh
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-amber-900/70 hover:text-amber-950 hover:bg-amber-500/15 flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                Hide <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                View List <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3.5 pt-3 border-t border-amber-200/60 dark:border-amber-500/20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pendingRecuperations.map((recup) => {
            const cleanNote = recup.notes 
              ? recup.notes.replace(/\[Courtesy Credit\]/g, '').replace(/\[Scheduled:[^\]]+\]/g, '').trim()
              : 'Pending scheduling';

            return (
              <Card
                key={recup.id}
                className="bg-white/80 dark:bg-slate-900/80 border-amber-200/70 dark:border-amber-500/30 shadow-none hover:shadow-md transition-shadow"
              >
                <CardContent className="p-3.5 flex flex-col justify-between h-full space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm text-foreground truncate">
                        {recup.student_name}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 px-2 py-0.5 rounded-full shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        Needs Slot
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                      {cleanNote}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      size="sm"
                      onClick={() => onSchedule(recup)}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs h-8 shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Schedule Extra Class
                    </Button>

                    {onDismiss && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDismiss(recup)}
                        className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                        title="Mark as completed or dismiss"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
