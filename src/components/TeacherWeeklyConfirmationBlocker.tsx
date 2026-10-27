import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Phone,
  LogOut,
  ChevronDown,
  ChevronUp,
  Loader2,
  Calendar,
  Clock,
  Sparkles,
  Send,
} from 'lucide-react';

interface ClassSession {
  id: number;
  title: string;
  student_name: string;
  date: string;
  time: string;
  class_type?: string;
  class_chapter?: string;
  is_graded: boolean;
}

interface TargetWeek {
  weekStartStr: string;
  weekEndStr: string;
  label: string;
}

export const TeacherWeeklyConfirmationBlocker: React.FC = () => {
  const { role, teacherName, user, signOut } = useAuth();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [targetWeek, setTargetWeek] = useState<TargetWeek | null>(null);
  const [teacherDbId, setTeacherDbId] = useState<string | null>(null);

  const [classesList, setClassesList] = useState<ClassSession[]>([]);
  const [weekClassCount, setWeekClassCount] = useState(0);

  const [confirming, setConfirming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showClassDetails, setShowClassDetails] = useState(false);

  // Message Admin Modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [adminMessageText, setAdminMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Helper to determine the week to confirm:
  // - Classes are taught Monday through Friday.
  // - During Mon-Thu, and Friday before 9:00 PM (21:00), the current week's classes are still ongoing.
  //   Therefore, the primary target week is the PREVIOUS week (Mon-Sun).
  // - Starting Friday at 9:00 PM (21:00) through Sunday night, all weekly classes have finished.
  //   Therefore, the primary target week becomes the CURRENT week (Mon-Sun).
  const getTargetWeeks = (): TargetWeek[] => {
    const today = new Date();

    // Check school timezone (America/Sao_Paulo) as well as local time
    let schoolNow = today;
    try {
      schoolNow = new Date(today.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    } catch {
      schoolNow = today;
    }

    const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
    const currentMonday = new Date(today);
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentMonday.setDate(currentMonday.getDate() - diffToMonday);
    currentMonday.setHours(0, 0, 0, 0);

    const primaryTarget = new Date(currentMonday);

    // Current week confirmation should only appear once all Friday classes finish (at or after 9:00 PM / 21:00)
    const isFridayBeforeNight =
      (dayOfWeek === 5 && today.getHours() < 21) ||
      (schoolNow.getDay() === 5 && schoolNow.getHours() < 21);

    const isBeforeFridayNight =
      (dayOfWeek >= 1 && dayOfWeek <= 4) || isFridayBeforeNight;

    if (isBeforeFridayNight) {
      primaryTarget.setDate(primaryTarget.getDate() - 7);
    }

    // Check up to 2 target weeks (the primary target and the week before it, in case an older one was missed)
    const weeks: TargetWeek[] = [];

    // Older week first so teacher confirms oldest pending first
    const olderMonday = new Date(primaryTarget);
    olderMonday.setDate(olderMonday.getDate() - 7);
    const olderSunday = addDays(olderMonday, 6);

    weeks.push({
      weekStartStr: format(olderMonday, 'yyyy-MM-dd'),
      weekEndStr: format(olderSunday, 'yyyy-MM-dd'),
      label: `${format(olderMonday, 'MMM d')} – ${format(olderSunday, 'MMM d, yyyy')}`,
    });

    const primarySunday = addDays(primaryTarget, 6);
    weeks.push({
      weekStartStr: format(primaryTarget, 'yyyy-MM-dd'),
      weekEndStr: format(primarySunday, 'yyyy-MM-dd'),
      label: `${format(primaryTarget, 'MMM d')} – ${format(primarySunday, 'MMM d, yyyy')}`,
    });

    return weeks;
  };

  const checkPendingConfirmation = useCallback(async () => {
    if (role !== 'teacher' || !teacherName) {
      setLoading(false);
      setNeedsConfirmation(false);
      return;
    }

    try {
      // 1. Fetch teacher record id
      const { data: teacherRecord } = await supabase
        .from('teachers')
        .select('id, name')
        .ilike('name', teacherName)
        .maybeSingle();

      const tId = teacherRecord?.id || null;
      setTeacherDbId(tId);

      if (!tId) {
        setLoading(false);
        setNeedsConfirmation(false);
        return;
      }

      // 2. Evaluate target weeks (from oldest to newest)
      const weeks = getTargetWeeks();

      for (const week of weeks) {
        // Check if confirmation already exists in teacher_weekly_confirmations
        const { data: existingConfirmation } = await supabase
          .from('teacher_weekly_confirmations')
          .select('id')
          .eq('teacher_id', tId)
          .eq('week_start_date', week.weekStartStr)
          .maybeSingle();

        if (!existingConfirmation) {
          // Check if this teacher had any classes in this week
          const { data: weekClassesRaw } = await supabase
            .from('classes')
            .select('id, title, student_name, date, time, class_grade, is_absent, class_type, class_chapter')
            .gte('date', week.weekStartStr)
            .lte('date', week.weekEndStr)
            .or(`title.eq.${teacherName},title.ilike.%- ${teacherName}%`);

          if (weekClassesRaw && weekClassesRaw.length > 0) {
            const sessionsMap: Record<string, ClassSession> = {};

            for (const cls of weekClassesRaw) {
              const title = cls.title || '';
              const parts = title.split(' - ');
              const teacherNameFromTitle = parts.length > 1 ? parts[1].trim().toLowerCase() : title.toLowerCase();

              if (!teacherNameFromTitle.includes(teacherName.toLowerCase())) {
                continue;
              }

              const key = `${cls.date}_${cls.time}_${cls.title || cls.student_name}`;
              if (!sessionsMap[key]) {
                sessionsMap[key] = {
                  id: cls.id,
                  title: cls.title,
                  student_name: cls.student_name,
                  date: cls.date,
                  time: cls.time,
                  class_type: cls.class_type,
                  class_chapter: cls.class_chapter,
                  is_graded: cls.class_grade !== null,
                };
              } else if (cls.class_grade !== null) {
                sessionsMap[key].is_graded = true;
              }
            }

            const sessions = Object.values(sessionsMap);
            // Count graded sessions
            const gradedSessions = sessions.filter((s) => s.is_graded);

            if (gradedSessions.length > 0) {
              setTargetWeek(week);
              setClassesList(sessions);
              setWeekClassCount(gradedSessions.length);
              setNeedsConfirmation(true);
              setLoading(false);
              return; // Stop at the first (oldest) unconfirmed week
            }
          }
        }
      }

      // If we reach here, all weeks are confirmed!
      setNeedsConfirmation(false);
    } catch (err) {
      console.error('Error checking teacher weekly confirmation:', err);
    } finally {
      setLoading(false);
    }
  }, [role, teacherName]);

  useEffect(() => {
    checkPendingConfirmation();

    // Check periodically (every 5 minutes) in case the 9:00 PM Friday threshold is reached while open
    const interval = setInterval(() => {
      checkPendingConfirmation();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkPendingConfirmation, location.pathname]);

  // Handler to confirm classes
  const handleConfirm = async () => {
    if (!teacherDbId || !targetWeek) return;
    setConfirming(true);

    try {
      const { error } = await supabase.from('teacher_weekly_confirmations').insert({
        teacher_id: teacherDbId,
        week_start_date: targetWeek.weekStartStr,
        classes_count: weekClassCount,
      });

      if (error) throw error;

      toast.success('Classes confirmed successfully! You can now use the dashboard.');
      // Re-check in case another week is pending, or unblock
      await checkPendingConfirmation();
    } catch (err) {
      console.error('Error confirming classes:', err);
      toast.error('Failed to confirm classes. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  // Handler to refresh class count in real-time
  const handleRefresh = async () => {
    setRefreshing(true);
    await checkPendingConfirmation();
    setRefreshing(false);
    toast.success('Class count refreshed!');
  };

  // Handler to send a message to admins in the platform
  const handleSendMessageToAdmin = async () => {
    if (!adminMessageText.trim() || !user?.id) return;
    setSendingMessage(true);

    try {
      // Find all admins to deliver the message
      const { data: admins } = await supabase.from('admins').select('id, name');

      if (!admins || admins.length === 0) {
        toast.error('No admins found in system.');
        return;
      }

      const fullContent = `[Weekly Confirmation Issue - ${targetWeek?.label}]\nTeacher: ${teacherName}\nCurrent Count: ${weekClassCount} classes\n\nMessage:\n${adminMessageText.trim()}`;

      // Insert message for each admin
      const insertPromises = admins.map((admin) =>
        supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: admin.id,
          content: fullContent,
        })
      );

      await Promise.all(insertPromises);

      toast.success('Message sent to admins! They will review and adjust your classes.');
      setShowMessageModal(false);
      setAdminMessageText('');
    } catch (err) {
      console.error('Error sending message to admins:', err);
      toast.error('Failed to send message. Please try WhatsApp instead.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Pre-fill WhatsApp message text
  const whatsappMessage = encodeURIComponent(
    `Hello! I am reviewing my weekly class confirmation for ${teacherName} (${targetWeek?.label}). My dashboard currently shows ${weekClassCount} completed classes, but I noticed an issue. Could you please check and adjust it for me?`
  );

  // If not a teacher, or currently loading, or doesn't need confirmation: render nothing (unblocked)
  if (role !== 'teacher' || loading || !needsConfirmation) {
    return null;
  }

  // Full-Screen Non-Dismissible Blocking Modal
  return (
    <>
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
        <div className="w-full max-w-2xl my-auto space-y-6">
          {/* Main Confirmation Card */}
          <Card className="rounded-3xl border shadow-2xl bg-card overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 sm:p-8 relative">
              <div className="flex items-center justify-between gap-4">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-medium px-3 py-1">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                  Action Required
                </Badge>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-white/80 hover:text-white hover:bg-white/10 text-xs"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Logout
                </Button>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-4">
                Weekly Class Confirmation
              </h2>
              <p className="text-blue-100 text-sm sm:text-base mt-1.5 leading-relaxed max-w-xl">
                Please review and confirm your completed classes for the week of{' '}
                <strong className="text-white underline decoration-white/50">{targetWeek?.label}</strong>.
                You must confirm this count before you can continue using the dashboard.
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Highlight Count Box */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                <div className="text-center sm:text-left">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Completed Classes to Confirm
                  </span>
                  <div className="flex items-baseline gap-2 mt-1 justify-center sm:justify-start">
                    <span className="text-4xl sm:text-5xl font-extrabold text-foreground">
                      {weekClassCount}
                    </span>
                    <span className="text-muted-foreground font-medium text-lg">classes</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="w-full sm:w-auto rounded-xl border-blue-200 dark:border-blue-800 hover:bg-blue-100/50"
                    title="Refresh count after admin adjustment"
                  >
                    <RefreshCw className={`w-4 h-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh Count'}
                  </Button>
                </div>
              </div>

              {/* Class Breakdown Dropdown */}
              <div className="border rounded-2xl overflow-hidden bg-muted/20">
                <button
                  type="button"
                  onClick={() => setShowClassDetails(!showClassDetails)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-left text-sm font-semibold hover:bg-muted/40 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    View counted classes ({classesList.length})
                  </span>
                  {showClassDetails ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>

                {showClassDetails && (
                  <div className="p-4 border-t max-h-60 overflow-y-auto space-y-2 text-xs divide-y divide-border/60">
                    {classesList.map((cls, idx) => (
                      <div key={cls.id || idx} className="pt-2 first:pt-0 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground text-sm">
                            {cls.student_name || cls.title}
                          </p>
                          <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {format(new Date(cls.date + 'T00:00:00'), 'EEE, MMM d')} • {cls.time}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {cls.class_type && <Badge variant="outline">{cls.class_type}</Badge>}
                          {cls.is_graded ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Graded</Badge>
                          ) : (
                            <Badge variant="secondary">Ungraded</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Primary Confirmation Button */}
              <Button
                size="lg"
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full text-base font-bold py-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25 transition-all"
              >
                {confirming ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Confirming Classes...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Confirm Classes ({weekClassCount})
                  </>
                )}
              </Button>

              {/* Discrepancy Section */}
              <div className="p-5 rounded-2xl bg-muted/40 border border-dashed border-border space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Is this class count incorrect?
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      If you have missing classes or extra classes listed by accident, <strong>do not confirm</strong>. Contact the admins below so they can correct the records. Once updated, click <strong>"Refresh Count"</strong> above and confirm to unlock your platform.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowMessageModal(true)}
                    className="w-full rounded-xl text-xs font-semibold h-10 border-slate-300 dark:border-slate-700"
                  >
                    <MessageSquare className="w-4 h-4 mr-2 text-primary" />
                    Message Admins in Platform
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    asChild
                    className="w-full rounded-xl text-xs font-semibold h-10 border-emerald-300 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                  >
                    <a
                      href={`https://api.whatsapp.com/send?text=${whatsappMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Contact via WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Message Admin Dialog */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Report Issue to Admins
            </DialogTitle>
            <DialogDescription>
              Explain which classes are missing or incorrect for the week of {targetWeek?.label}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="issue-notes" className="text-xs font-semibold">
                Details of the issue
              </Label>
              <Textarea
                id="issue-notes"
                placeholder="Example: I taught 2 additional classes with Bruno on Tuesday 15:00 and 16:00 that aren't showing up..."
                value={adminMessageText}
                onChange={(e) => setAdminMessageText(e.target.value)}
                rows={4}
                className="rounded-xl resize-none text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowMessageModal(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSendMessageToAdmin}
              disabled={sendingMessage || !adminMessageText.trim()}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {sendingMessage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send to Admins
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
