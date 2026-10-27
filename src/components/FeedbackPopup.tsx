import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, FeedbackRequest } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Star, Sparkles, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FeedbackPopup: React.FC = () => {
  const { role, studentId } = useAuth();
  const [activeRequest, setActiveRequest] = useState<FeedbackRequest | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const [scores, setScores] = useState({
    classes: 5,
    teachers: 5,
    lessons: 5,
    schedule: 5,
  });
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchActiveFeedback = async () => {
      if (role !== 'student' || !studentId) return;

      try {
        // Find active feedback requests
        const { data: requests, error: requestsError } = await supabase
          .from('feedback_requests')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: true });

        if (requestsError) throw requestsError;
        
        if (!requests || requests.length === 0) {
          setActiveRequest(null);
          setIsOpen(false);
          return;
        }

        // Check if student has already responded to any of these
        let foundUnanswered = false;
        for (const req of requests) {
          const { data: feedback, error: feedbackError } = await supabase
            .from('student_feedbacks')
            .select('id')
            .eq('request_id', req.id)
            .eq('student_id', studentId)
            .maybeSingle();

          if (feedbackError) throw feedbackError;

          // If no feedback found for this request, show the popup
          if (!feedback) {
            setActiveRequest(req);
            setIsOpen(true);
            foundUnanswered = true;
            break; // Show only one at a time
          }
        }
        if (!foundUnanswered) {
          setActiveRequest(null);
          setIsOpen(false);
        }
      } catch (err) {
        console.error('Error fetching feedback requests:', err);
      }
    };

    fetchActiveFeedback();

    const channel = supabase
      .channel('student_feedback_requests_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feedback_requests' },
        () => {
          fetchActiveFeedback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, studentId]);

  const handleSubmit = async () => {
    if (!activeRequest || !studentId) return;
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from('student_feedbacks').insert({
        request_id: activeRequest.id,
        student_id: studentId,
        classes_score: scores.classes,
        teachers_score: scores.teachers,
        lessons_score: scores.lessons,
        schedule_score: scores.schedule,
        comments: comments.trim() || null,
      });

      if (error) throw error;

      setIsOpen(false);
      toast({
        title: "Feedback submitted",
        description: "Thank you for rating your experience!",
      });
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScoreChange = (field: keyof typeof scores, value: number) => {
    setScores(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[480px] rounded-3xl p-6 sm:p-7 shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <DialogTitle className="text-xl font-bold">Rate Your Experience</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Please tap the stars from 1 to 5 to rate your classes, teachers, lessons, and schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          <StarRating
            label="Classes"
            value={scores.classes}
            onChange={(val) => handleScoreChange('classes', val)}
          />
          <StarRating
            label="Teachers"
            value={scores.teachers}
            onChange={(val) => handleScoreChange('teachers', val)}
          />
          <StarRating
            label="Lessons"
            value={scores.lessons}
            onChange={(val) => handleScoreChange('lessons', val)}
          />
          <StarRating
            label="Schedule"
            value={scores.schedule}
            onChange={(val) => handleScoreChange('schedule', val)}
          />

          <div className="flex flex-col gap-2 pt-2">
            <Label htmlFor="comments" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Additional Comments (Optional)
            </Label>
            <Textarea
              id="comments"
              placeholder="Tell us what you loved or how we can make your classes even better..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="rounded-xl resize-none text-sm min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            size="lg"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="w-full rounded-2xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 py-5 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RATING_LABELS: Record<number, string> = {
  5: 'Outstanding',
  4: 'Very Good',
  3: 'Good',
  2: 'Fair',
  1: 'Needs Work',
};

const StarRating = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
}) => {
  const [hoverVal, setHoverVal] = useState<number | null>(null);

  const displayVal = hoverVal !== null ? hoverVal : value;

  return (
    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 transition-colors">
      <div className="flex flex-col">
        <span className="text-sm font-bold text-foreground">{label}</span>
        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
          {RATING_LABELS[displayVal] || `${displayVal} Stars`}
        </span>
      </div>

      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHoverVal(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayVal;
          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoverVal(star)}
              className="p-1 rounded-lg transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              title={`${star} star${star > 1 ? 's' : ''}`}
            >
              <Star
                className={cn(
                  "w-6 h-6 sm:w-7 sm:h-7 transition-all duration-150",
                  isFilled
                    ? "fill-amber-400 text-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.35)]"
                    : "fill-transparent text-slate-300 dark:text-slate-700 hover:text-amber-300"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
