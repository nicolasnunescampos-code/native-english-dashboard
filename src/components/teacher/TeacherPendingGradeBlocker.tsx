import React, { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { toLocalDate } from '@/lib/dateUtils';
import { cleanStudentName, CLASS_LEVELS } from '@/lib/courseUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  GraduationCap,
  UserX,
  Clock,
  Calendar,
  LogOut,
  RefreshCw,
  Sparkles,
  Loader2,
  ExternalLink,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react';

export interface PendingClass {
  id: number;
  date: string;
  time: string;
  start_time?: string | null;
  end_time?: string | null;
  timezone?: string | null;
  title: string;
  student_name: string;
  class_grade?: number | null;
  is_absent?: boolean | null;
  class_type?: string | null;
  class_chapter?: string | null;
  class_level?: string | null;
  notes?: string | null;
  teacher_id?: string | null;
}

/**
 * Determines whether today's class scheduled session has ended ("past the time of class").
 * Strictly checks classes for today; ignores past and future days.
 */
export const isClassPast = (cls: {
  date: string;
  time?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  timezone?: string | null;
}): boolean => {
  if (!cls.date) return false;

  const now = new Date();

  // Determine today in school timezone (America/Sao_Paulo)
  let todayInSchoolTz = format(now, 'yyyy-MM-dd');
  try {
    const schoolNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    todayInSchoolTz = format(schoolNow, 'yyyy-MM-dd');
  } catch {
    // fallback to local date
  }

  // Only check classes for today (not past or future days)
  if (cls.date !== todayInSchoolTz) {
    return false;
  }

  // Class is TODAY. Compare class end time to current time
  const timeSource = cls.end_time || cls.start_time || cls.time;
  if (!timeSource) {
    return false;
  }

  try {
    const tz = cls.timezone || 'America/Sao_Paulo';

    if (cls.end_time) {
      let cleanEnd = cls.end_time.trim();
      if (cleanEnd.includes('T')) {
        cleanEnd = cleanEnd.split('T')[1];
      }
      cleanEnd = cleanEnd.substring(0, 5);

      const classEndDate = toLocalDate(cls.date, cleanEnd, tz);
      return now.getTime() >= classEndDate.getTime();
    } else {
      // If end_time is not explicitly set, calculate end time as start time + 50 minutes (standard class duration)
      const startStr = cls.start_time || cls.time || '00:00';
      let cleanStart = startStr.trim();
      if (cleanStart.includes('T')) {
        cleanStart = cleanStart.split('T')[1];
      }
      cleanStart = cleanStart.substring(0, 5);

      const classStartDate = toLocalDate(cls.date, cleanStart, tz);
      const classEndDate = new Date(classStartDate.getTime() + 50 * 60 * 1000);
      return now.getTime() >= classEndDate.getTime();
    }
  } catch (err) {
    console.error('Error determining if class is past:', err);
    return false;
  }
};

export const TeacherPendingGradeBlocker: React.FC = () => {
  const { role, teacherName, user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingClasses, setPendingClasses] = useState<PendingClass[]>([]);
  const [teacherDbId, setTeacherDbId] = useState<string | null>(null);

  // Absence State (inline confirmation per class id)
  const [confirmingAbsenceId, setConfirmingAbsenceId] = useState<number | null>(null);
  const [submittingAbsenceId, setSubmittingAbsenceId] = useState<number | null>(null);

  // Quick Grade State (inline expansion per class id)
  const [gradingClassId, setGradingClassId] = useState<number | null>(null);
  const [overallGrade, setOverallGrade] = useState('');
  const [speakingGrade, setSpeakingGrade] = useState('');
  const [listeningGrade, setListeningGrade] = useState('');
  const [grammarGrade, setGrammarGrade] = useState('');
  const [readingGrade, setReadingGrade] = useState('');
  const [classChapter, setClassChapter] = useState('');
  const [classType, setClassType] = useState<string>('Grammar');
  const [classLevel, setClassLevel] = useState<string>('Beginner');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [showDetailedGrades, setShowDetailedGrades] = useState(false);
  const [savingGradeId, setSavingGradeId] = useState<number | null>(null);
  const [improvingFeedback, setImprovingFeedback] = useState(false);

  // Fetch teacher database ID
  useEffect(() => {
    if (role !== 'teacher' || !teacherName) {
      setLoading(false);
      return;
    }

    const fetchTeacherId = async () => {
      try {
        const { data: teacherRecord } = await supabase
          .from('teachers')
          .select('id, name')
          .ilike('name', teacherName)
          .maybeSingle();

        setTeacherDbId(teacherRecord?.id || null);
      } catch (err) {
        console.error('Error fetching teacher ID:', err);
      }
    };

    fetchTeacherId();
  }, [role, teacherName]);

  // Main check function to find today's past classes that are neither graded nor marked absent
  const checkPendingGrades = useCallback(async () => {
    if (role !== 'teacher' || !teacherName) {
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      let todayStr = format(now, 'yyyy-MM-dd');
      try {
        const schoolNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        todayStr = format(schoolNow, 'yyyy-MM-dd');
      } catch {}

      // Only check classes scheduled for TODAY (not past days)
      let query = supabase
        .from('classes')
        .select('id, date, time, start_time, end_time, timezone, title, student_name, class_grade, is_absent, class_type, class_chapter, class_level, notes, teacher_id')
        .eq('date', todayStr)
        .is('class_grade', null)
        .or('is_absent.is.null,is_absent.eq.false')
        .order('date', { ascending: false });

      if (teacherDbId) {
        query = query.or(`teacher_id.eq.${teacherDbId},title.eq.${teacherName},title.ilike.%- ${teacherName}%`);
      } else {
        query = query.or(`title.eq.${teacherName},title.ilike.%- ${teacherName}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error checking pending grades:', error);
        return;
      }

      if (!data || data.length === 0) {
        setPendingClasses([]);
        return;
      }

      // Filter on client side to ensure strict teacher ownership & strictly past scheduled time today
      const overdue: PendingClass[] = [];

      for (const cls of data) {
        // Skip drafts if draft status exists
        if ((cls as any).status === 'draft') continue;

        // Skip if already graded or marked absent
        if (cls.class_grade !== null && cls.class_grade !== undefined) continue;
        if (cls.is_absent === true) continue;

        // Verify teacher title match to prevent substring mismatches
        const title = cls.title || '';
        const parts = title.split(' - ');
        const teacherNameFromTitle = parts.length > 1 ? parts[1].trim().toLowerCase() : title.toLowerCase();

        const isAssigned =
          (teacherDbId && cls.teacher_id === teacherDbId) ||
          teacherNameFromTitle.includes(teacherName.toLowerCase());

        if (!isAssigned) continue;

        // Check if class time has already elapsed today
        if (isClassPast(cls)) {
          overdue.push(cls);
        }
      }

      setPendingClasses(overdue);
    } catch (err) {
      console.error('Error evaluating pending classes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role, teacherName, teacherDbId]);

  // Run check on mount, route changes, or teacher ID load
  useEffect(() => {
    checkPendingGrades();

    // Check periodically every 60 seconds (so as soon as an in-progress class ends, it triggers)
    const interval = setInterval(() => {
      checkPendingGrades();
    }, 60 * 1000);

    // Listen to custom 'class-graded' event dispatched by TeacherGrade
    const handleClassGraded = (event: any) => {
      const gradedId = event?.detail?.classId;
      if (gradedId) {
        setPendingClasses((prev) => prev.filter((c) => c.id !== gradedId));
      }
      checkPendingGrades();
    };

    window.addEventListener('class-graded', handleClassGraded);
    window.addEventListener('focus', checkPendingGrades);

    return () => {
      clearInterval(interval);
      window.removeEventListener('class-graded', handleClassGraded);
      window.removeEventListener('focus', checkPendingGrades);
    };
  }, [checkPendingGrades, location.pathname]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkPendingGrades();
    toast.success('Classes refreshed');
  };

  // Helper to parse grades
  const parseGradeValue = (val: string) => {
    if (!val || val.trim() === '') return null;
    const num = parseFloat(val.replace(',', '.'));
    return isNaN(num) ? null : num;
  };

  // Handle Mark as Absent (Direct inline execution)
  const handleConfirmAbsence = async (cls: PendingClass) => {
    setSubmittingAbsenceId(cls.id);

    try {
      const { data, error } = await supabase
        .from('classes')
        .update({
          is_absent: true,
          class_grade: null,
        })
        .eq('id', cls.id)
        .select('*');

      if (error) throw error;

      const studentNameClean = cleanStudentName(cls.student_name);
      toast.success(`Marked ${studentNameClean} as absent.`);

      // Dispatch event to inform other schedule/calendar views
      window.dispatchEvent(new CustomEvent('class-graded', { detail: { classId: cls.id } }));

      const updated = pendingClasses.filter((c) => c.id !== cls.id);
      setPendingClasses(updated);
      setConfirmingAbsenceId(null);

      if (updated.length === 0) {
        toast.success('🎉 All pending classes resolved! Platform unlocked.');
      }
    } catch (err: any) {
      console.error('Error marking absent:', err);
      toast.error('Failed to mark student as absent. Please try again.');
    } finally {
      setSubmittingAbsenceId(null);
    }
  };

  // Toggle inline grading
  const handleToggleGradeInline = (cls: PendingClass) => {
    if (gradingClassId === cls.id) {
      setGradingClassId(null);
      return;
    }
    setGradingClassId(cls.id);
    setOverallGrade('');
    setSpeakingGrade('');
    setListeningGrade('');
    setGrammarGrade('');
    setReadingGrade('');
    setClassChapter(cls.class_chapter || '');
    setClassType(cls.class_type || 'Grammar');
    setClassLevel(cls.class_level || 'Beginner');
    setFeedbackNotes(cls.notes || '');
    setShowDetailedGrades(false);
  };

  // Handle AI feedback enhancement
  const handleImproveFeedback = async () => {
    if (!feedbackNotes.trim()) {
      toast.error('Please enter some notes first before improving them.');
      return;
    }

    setImprovingFeedback(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-feedback', {
        body: { feedback: feedbackNotes },
      });

      if (error) throw error;
      if (data?.improvedFeedback) {
        setFeedbackNotes(data.improvedFeedback);
        toast.success('Feedback improved by AI!');
      } else {
        throw new Error('No improved feedback returned');
      }
    } catch (err) {
      console.error('Error improving feedback:', err);
      toast.error('Failed to improve feedback. Please try again.');
    } finally {
      setImprovingFeedback(false);
    }
  };

  // Handle Save Quick Grade
  const handleSaveGrade = async (e: React.FormEvent, cls: PendingClass) => {
    e.preventDefault();

    const parsedGrade = parseGradeValue(overallGrade);
    if (parsedGrade === null) {
      toast.error('Please enter a valid overall grade (0 - 10).');
      return;
    }

    setSavingGradeId(cls.id);
    try {
      const payload: any = {
        class_grade: parsedGrade,
        speaking_grade: parseGradeValue(speakingGrade),
        listening_grade: parseGradeValue(listeningGrade),
        grammar_grade: parseGradeValue(grammarGrade),
        reading_grade: parseGradeValue(readingGrade),
        class_chapter: classChapter.trim() || null,
        class_type: classType || null,
        class_level: classLevel || null,
        is_absent: false,
        notes: feedbackNotes.trim() || null,
      };

      let { data, error } = await supabase
        .from('classes')
        .update(payload)
        .eq('id', cls.id)
        .select('*');

      // Retry without listening_grade if column does not exist on schema
      if (error && (error.code === '42703' || error.message?.includes('listening_grade'))) {
        delete payload.listening_grade;
        const retry = await supabase
          .from('classes')
          .update(payload)
          .eq('id', cls.id)
          .select('*');
        if (retry.error) throw retry.error;
        data = retry.data;
      } else if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        toast.error('The update was rejected by the database. Check permissions.');
        setSavingGradeId(null);
        return;
      }

      const studentNameClean = cleanStudentName(cls.student_name);
      toast.success(`Grades saved for ${studentNameClean}!`);

      // Dispatch event to inform other components
      window.dispatchEvent(new CustomEvent('class-graded', { detail: { classId: cls.id } }));

      const updated = pendingClasses.filter((c) => c.id !== cls.id);
      setPendingClasses(updated);
      setGradingClassId(null);

      if (updated.length === 0) {
        toast.success('🎉 All pending classes resolved! Platform unlocked.');
      }
    } catch (err: any) {
      console.error('Error saving grades:', err);
      toast.error('Failed to save grades. Please try again.');
    } finally {
      setSavingGradeId(null);
    }
  };

  // Only teachers are subject to this requirement
  if (role !== 'teacher' || loading) {
    return null;
  }

  // If there are no pending classes, nothing to block
  if (pendingClasses.length === 0) {
    return null;
  }

  const isOnGradePage = location.pathname === '/teacher/grade';

  // ─────────────────────────────────────────────────────────────
  // RENDER: Overdue Classes List with Inline Actions
  // ─────────────────────────────────────────────────────────────

  const renderOverdueClassesList = () => (
    <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
      {pendingClasses.map((cls) => {
        const studentClean = cleanStudentName(cls.student_name);
        const isConfirmingAbsence = confirmingAbsenceId === cls.id;
        const isSubmittingAbsence = submittingAbsenceId === cls.id;
        const isGradingInline = gradingClassId === cls.id;
        const isSavingGrade = savingGradeId === cls.id;

        return (
          <div
            key={cls.id}
            className="p-4 rounded-2xl border border-border/80 bg-background/80 hover:bg-background transition-all shadow-xs"
          >
            {/* Top row: Student info and action buttons */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base text-foreground tracking-tight">
                    {studentClean}
                  </span>
                  {cls.class_level && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                      {cls.class_level}
                    </Badge>
                  )}
                  {cls.class_type && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                      {cls.class_type}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Today
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    {cls.time}
                  </span>
                  <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-semibold">
                    Awaiting Action
                  </Badge>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
                {isConfirmingAbsence ? (
                  <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 p-1 rounded-xl border border-red-200 dark:border-red-900/50">
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 px-1.5">
                      Confirm absence?
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleConfirmAbsence(cls)}
                      disabled={isSubmittingAbsence}
                      className="rounded-lg text-xs h-8 px-2.5 shadow-xs"
                    >
                      {isSubmittingAbsence ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        'Yes, Confirm'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmingAbsenceId(null)}
                      disabled={isSubmittingAbsence}
                      className="rounded-lg text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setConfirmingAbsenceId(cls.id);
                        if (gradingClassId === cls.id) setGradingClassId(null);
                      }}
                      className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40 rounded-xl text-xs h-9"
                    >
                      <UserX className="w-3.5 h-3.5 mr-1.5" />
                      Mark Absent
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleToggleGradeInline(cls)}
                      className={`flex-1 sm:flex-none rounded-xl text-xs h-9 shadow-xs ${
                        isGradingInline
                          ? 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                      {isGradingInline ? 'Close Form' : 'Grade Class'}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Inline Quick Grade Form (Expands seamlessly inside this card) */}
            {isGradingInline && (
              <form
                onSubmit={(e) => handleSaveGrade(e, cls)}
                className="mt-4 pt-4 border-t border-border/70 space-y-3.5 animate-fade-in"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      Class Grade (0 - 10) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      placeholder="e.g. 8.5"
                      value={overallGrade}
                      onChange={(e) => setOverallGrade(e.target.value)}
                      required
                      autoFocus
                      className="rounded-xl h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Level</Label>
                    <Select value={classLevel} onValueChange={setClassLevel}>
                      <SelectTrigger className="rounded-xl h-10 text-xs">
                        <SelectValue placeholder="Level" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASS_LEVELS.map((lvl) => (
                          <SelectItem key={lvl} value={lvl} className="text-xs">
                            {lvl}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Type</Label>
                    <Select value={classType} onValueChange={setClassType}>
                      <SelectTrigger className="rounded-xl h-10 text-xs">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {['Grammar', 'Reading', 'Listening', 'Club', 'Exam'].map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Chapter & Optional details toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="w-full sm:w-44">
                    <Input
                      placeholder="Chapter (e.g. 5)"
                      value={classChapter}
                      onChange={(e) => setClassChapter(e.target.value)}
                      className="rounded-xl h-9 text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDetailedGrades(!showDetailedGrades)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium"
                  >
                    <span>{showDetailedGrades ? 'Hide' : 'Add'} skill grades</span>
                    {showDetailedGrades ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Optional skills breakdown */}
                {showDetailedGrades && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Speaking</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        placeholder="0 - 10"
                        value={speakingGrade}
                        onChange={(e) => setSpeakingGrade(e.target.value)}
                        className="rounded-lg h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Grammar</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        placeholder="0 - 10"
                        value={grammarGrade}
                        onChange={(e) => setGrammarGrade(e.target.value)}
                        className="rounded-lg h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Listening</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        placeholder="0 - 10"
                        value={listeningGrade}
                        onChange={(e) => setListeningGrade(e.target.value)}
                        className="rounded-lg h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Reading</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        placeholder="0 - 10"
                        value={readingGrade}
                        onChange={(e) => setReadingGrade(e.target.value)}
                        className="rounded-lg h-8 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Notes / Feedback */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Feedback Notes</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleImproveFeedback}
                      disabled={improvingFeedback || !feedbackNotes.trim()}
                      className="h-6 text-[11px] text-primary hover:text-primary px-2 rounded-lg"
                    >
                      <Sparkles className={`w-3 h-3 mr-1 ${improvingFeedback ? 'animate-spin' : ''}`} />
                      {improvingFeedback ? 'Improving...' : 'AI Improve'}
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Write feedback for student..."
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    rows={2}
                    className="rounded-xl text-xs resize-none"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/teacher/grade?class=${cls.id}`)}
                    className="text-xs text-muted-foreground hover:text-foreground h-9 px-2.5 rounded-xl"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open Full Grade Page
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setGradingClassId(null)}
                      disabled={isSavingGrade}
                      className="rounded-xl text-xs h-9"
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSavingGrade || !overallGrade}
                      className="rounded-xl text-xs h-9 shadow-xs"
                    >
                      {isSavingGrade ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Grade'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          CASE 1: Teacher is on /teacher/grade
          Do NOT block whole screen with backdrop so they can grade,
          instead show sticky urgent top banner.
      ───────────────────────────────────────────────────────────── */}
      {isOnGradePage && (
        <div className="sticky top-0 z-40 mb-6 rounded-2xl bg-destructive/10 border-2 border-destructive/30 p-4 shadow-sm backdrop-blur-md animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">
                  Platform Locked: {pendingClasses.length} class{pendingClasses.length > 1 ? 'es' : ''} from today awaiting grades or absence record
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete grading on this page or record absences. Other dashboard pages remain locked until resolved.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs rounded-xl border-destructive/30 hover:bg-destructive/10 text-destructive dark:text-red-400 self-end sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CASE 2: Teacher is on any OTHER route
          Show full-screen non-dismissible blocker modal.
      ───────────────────────────────────────────────────────────── */}
      {!isOnGradePage && (
        <div className="fixed inset-0 z-40 bg-background/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <Card className="max-w-2xl w-full my-auto rounded-3xl shadow-2xl border border-destructive/20 bg-card text-card-foreground overflow-hidden">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold tracking-wide uppercase">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Action Required
                </div>

                <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs">
                  {pendingClasses.length} Today's Overdue Class{pendingClasses.length > 1 ? 'es' : ''}
                </Badge>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-4">
                Today's Class Resolution Required
              </h2>
              <p className="text-red-50 text-sm sm:text-base mt-1.5 leading-relaxed max-w-xl">
                Classes scheduled for today must be graded or marked as absent once the class time has ended.
                Please resolve each class below to continue using the platform.
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Summary Bar */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-destructive/5 border border-destructive/15">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-destructive dark:text-red-400">
                    Awaiting Your Feedback
                  </span>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {pendingClasses.length} class{pendingClasses.length > 1 ? 'es' : ''} past scheduled time today
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="rounded-xl text-xs h-9"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>

              {/* Class list */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                  Select an action for each class:
                </p>
                {renderOverdueClassesList()}
              </div>

              {/* Footer info & Logout */}
              <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                <p className="text-center sm:text-left">
                  Recording grades & absences immediately ensures accurate student records and eliminates payroll delays.
                </p>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0 rounded-xl"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Log Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default TeacherPendingGradeBlocker;
