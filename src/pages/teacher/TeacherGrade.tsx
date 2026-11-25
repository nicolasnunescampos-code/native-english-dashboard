import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase, Class } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Sparkles, Loader2, Image as ImageIcon, Upload, X } from 'lucide-react';
import {
  extractWhiteboardUrl,
  stripWhiteboardTag,
  appendWhiteboardTag,
  uploadWhiteboardScreenshot,
  cleanupExpiredWhiteboards,
} from '@/lib/whiteboardUtils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { CLASS_LEVELS } from '@/lib/courseUtils';


const TeacherGrade: React.FC = () => {
  const { teacherName } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const classId = searchParams.get('class');

  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [classLevel, setClassLevel] = useState<string>('')
  const [classGrade, setClassGrade] = useState<string>('');
  const [speakingGrade, setSpeakingGrade] = useState<string>('');
  const [listeningGrade, setListeningGrade] = useState<string>('');
  const [grammarGrade, setGrammarGrade] = useState<string>('');
  const [readingGrade, setReadingGrade] = useState<string>('');
  const [classChapter, setClassChapter] = useState<string>('');
  const [classType, setClassType] = useState<string>('');
  const [noChapter, setNoChapter] = useState(false);
  const [isAbsent, setIsAbsent] = useState(false);
  const [notes, setNotes] = useState<string>('');
  const [improvingFeedback, setImprovingFeedback] = useState(false);
  const [whiteboardFile, setWhiteboardFile] = useState<File | null>(null);
  const [whiteboardPreview, setWhiteboardPreview] = useState<string | null>(null);
  const [existingWhiteboardUrl, setExistingWhiteboardUrl] = useState<string | null>(null);

  const handleSelectWhiteboardFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }
    if (whiteboardPreview && whiteboardPreview.startsWith('blob:')) {
      URL.revokeObjectURL(whiteboardPreview);
    }
    setWhiteboardFile(file);
    setWhiteboardPreview(URL.createObjectURL(file));
  };

  const handleRemoveWhiteboard = () => {
    if (whiteboardPreview && whiteboardPreview.startsWith('blob:')) {
      URL.revokeObjectURL(whiteboardPreview);
    }
    setWhiteboardFile(null);
    setWhiteboardPreview(null);
    setExistingWhiteboardUrl(null);
  };

  const handlePasteWhiteboard = (e: React.ClipboardEvent) => {
    if (isAbsent || classType !== 'Grammar') return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleSelectWhiteboardFile(file);
          toast.success('Whiteboard screenshot pasted!');
          break;
        }
      }
    }
  };

  const handleImproveFeedback = async () => {
    if (!notes.trim()) {
      toast.error('Please write some notes first before improving them.');
      return;
    }

    setImprovingFeedback(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-feedback', {
        body: { feedback: notes }
      });

      if (error) throw error;
      if (data?.improvedFeedback) {
        setNotes(data.improvedFeedback);
        toast.success('Feedback improved successfully!');
      } else {
        throw new Error('No improved feedback returned');
      }
    } catch (err: any) {
      console.error('Error improving feedback:', err);
      toast.error('Failed to improve feedback. Please try again.');
    } finally {
      setImprovingFeedback(false);
    }
  };

  useEffect(() => {
    const fetchClasses = async () => {
      if (!teacherName) return;

      try {
        // 1. (Skipped get teacher_id logic to avoid 400 errors)

        let listQuery = supabase
          .from('classes')
          .select('*')
          .or(`title.eq.${teacherName},title.ilike.%- ${teacherName}%`)
          .order('date', { ascending: false })
          .limit(50);

        // 3. If valid classId, fetch it specifically
        let specificClassQuery;
        if (classId) {
          let query = supabase
            .from('classes')
            .select('*')
            .eq('id', classId)
            .or(`title.eq.${teacherName},title.ilike.%- ${teacherName}%`);

          specificClassQuery = query.maybeSingle();
        }

        const [listRes, specificRes] = await Promise.all([
          listQuery,
          specificClassQuery ? specificClassQuery : Promise.resolve({ data: null, error: null })
        ]);

        if (listRes.error) throw listRes.error;
        let allData = listRes.data || [];

        // 3. Merge specific class if found
        if (specificRes?.data) {
          // Check if already in list
          if (!allData.find(c => c.id === specificRes.data.id)) {
            allData = [specificRes.data, ...allData];
          }
        }

        setClasses(allData);

        // 4. Select the class
        if (classId) {
          const cls = allData.find((c) => c.id?.toString() === classId);
          if (cls) {
            setSelectedClass(cls);
            loadClassData(cls);
          }
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [teacherName, classId]);

  // Load draft from localStorage
  useEffect(() => {
    if (selectedClass?.id) {
      const draft = localStorage.getItem(`grade_draft_${selectedClass.id}`);
      if (draft) {
        const data = JSON.parse(draft);
        setClassGrade(data.classGrade || '');
        setSpeakingGrade(data.speakingGrade || '');
        setListeningGrade(data.listeningGrade || '');
        setGrammarGrade(data.grammarGrade || '');
        setReadingGrade(data.readingGrade || '');
        setClassChapter(data.classChapter || '');
        setClassType(data.classType || '');
        setClassLevel(data.classLevel || '');
        setNoChapter(data.noChapter || false);
        setIsAbsent(data.isAbsent || false);
      }
    }
  }, [selectedClass]);

  const loadClassData = (cls: Class) => {
    setClassGrade(cls.class_grade !== undefined && cls.class_grade !== null ? cls.class_grade.toString() : '');
    setSpeakingGrade(cls.speaking_grade !== undefined && cls.speaking_grade !== null ? cls.speaking_grade.toString() : '');
    setListeningGrade(cls.listening_grade !== undefined && cls.listening_grade !== null ? cls.listening_grade.toString() : '');
    setGrammarGrade(cls.grammar_grade !== undefined && cls.grammar_grade !== null ? cls.grammar_grade.toString() : '');
    setReadingGrade(cls.reading_grade !== undefined && cls.reading_grade !== null ? cls.reading_grade.toString() : '');
    setClassChapter(cls.class_chapter || '');
    setClassType(cls.class_type || '');
    setClassLevel(cls.class_level || '');
    setNoChapter(false);
    setIsAbsent(cls.is_absent || false);
    setNotes(stripWhiteboardTag(cls.notes));
    const existingWb = extractWhiteboardUrl(cls);
    setExistingWhiteboardUrl(existingWb);
    setWhiteboardPreview(existingWb);
    setWhiteboardFile(null);
  };

  const handleClassSelect = (classIdStr: string) => {
    const cls = classes.find((c) => c.id?.toString() === classIdStr);
    if (cls) {
      setSelectedClass(cls);
      loadClassData(cls);
    }
  };

  // Save draft to localStorage
  const saveDraft = () => {
    if (selectedClass?.id) {
      const draft = {
        classGrade,
        speakingGrade,
        listeningGrade,
        grammarGrade,
        readingGrade,
        classChapter,
        classType,
        classLevel,
        noChapter,
        isAbsent,
      };
      localStorage.setItem(`grade_draft_${selectedClass.id}`, JSON.stringify(draft));
      toast.success('Draft saved');
    }
  };

  const parseGrade = (val: string) => {
    if (!val || val.trim() === '') return null;
    const num = parseFloat(val.replace(',', '.'));
    return isNaN(num) ? null : num;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass?.id) return;

    if (!isAbsent && classType === 'Grammar' && !whiteboardFile && !existingWhiteboardUrl) {
      toast.error('Please upload or paste a whiteboard screenshot for Grammar classes.');
      return;
    }

    setSaving(true);
    try {
      let finalWhiteboardUrl: string | null = null;
      if (!isAbsent && classType === 'Grammar') {
        if (whiteboardFile) {
          finalWhiteboardUrl = await uploadWhiteboardScreenshot(whiteboardFile, selectedClass.id);
          cleanupExpiredWhiteboards();
        } else if (existingWhiteboardUrl) {
          finalWhiteboardUrl = existingWhiteboardUrl;
        }
      }

      const cleanNotes = stripWhiteboardTag(notes);
      const payload: any = {
        class_grade: parseGrade(classGrade),
        speaking_grade: parseGrade(speakingGrade),
        listening_grade: parseGrade(listeningGrade),
        grammar_grade: parseGrade(grammarGrade),
        reading_grade: parseGrade(readingGrade),
        class_chapter: noChapter ? null : classChapter || null,
        class_type: isAbsent ? null : classType || null,
        class_level: isAbsent ? null : classLevel || null,
        is_absent: isAbsent,
        notes: cleanNotes || null,
        whiteboard_url: finalWhiteboardUrl,
      };

      let { data, error } = await supabase
        .from('classes')
        .update(payload)
        .eq('id', selectedClass.id)
        .select('*');

      if (error && (error.code === '42703' || error.message?.includes('listening_grade') || error.message?.includes('whiteboard_url'))) {
        if (error.message?.includes('listening_grade')) {
          delete payload.listening_grade;
        }
        if (error.message?.includes('whiteboard_url') || error.code === '42703') {
          delete payload.whiteboard_url;
          if (finalWhiteboardUrl) {
            payload.notes = appendWhiteboardTag(cleanNotes, finalWhiteboardUrl);
          }
        }
        const retry = await supabase
          .from('classes')
          .update(payload)
          .eq('id', selectedClass.id)
          .select('*');
        if (retry.error) {
          if (retry.error.code === '42703' && 'listening_grade' in payload) {
            delete payload.listening_grade;
            const retry2 = await supabase
              .from('classes')
              .update(payload)
              .eq('id', selectedClass.id)
              .select('*');
            if (retry2.error) throw retry2.error;
            data = retry2.data;
          } else {
            throw retry.error;
          }
        } else {
          data = retry.data;
        }
      } else if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }

      if (!data || data.length === 0) {
        toast.error('The update was rejected by the database (0 rows changed). Check schema/RLS.');
        setSaving(false);
        return;
      }

      // Clear draft
      localStorage.removeItem(`grade_draft_${selectedClass.id}`);
      window.dispatchEvent(new CustomEvent('class-graded', { detail: { classId: selectedClass.id } }));
      toast.success('Grades saved successfully!');
      navigate('/teacher/schedule');
    } catch (error) {
      console.error('Error saving grades:', error);
      toast.error('Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-48 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        📝 Grade Classes
      </h2>

      <Card>
        <CardHeader>
          <CardTitle>Select a Class to Grade</CardTitle>
        </CardHeader>
        <CardContent>
          <Select onValueChange={handleClassSelect} value={selectedClass?.id?.toString()}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a class..." />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id?.toString() || ''}>
                  {cls.student_name} - {cls.date} at {cls.time}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle>
              Grading: {selectedClass.student_name} ({selectedClass.date})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} onPaste={handlePasteWhiteboard} className="space-y-6">
              
              {/* Absent Toggle */}
              <div className="flex items-center space-x-2 bg-red-50 p-4 rounded-md border border-red-100">
                <Checkbox
                  id="isAbsent"
                  checked={isAbsent}
                  onCheckedChange={(checked) => setIsAbsent(checked as boolean)}
                />
                <Label htmlFor="isAbsent" className="text-red-900 font-semibold cursor-pointer">
                  Student was Absent
                </Label>
              </div>

              {/* Grades Grid - Hide if absent */}
              {!isAbsent && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="classGrade" className="text-xs font-semibold">Class Grade (0-10)</Label>
                       <Input
                         id="classGrade"
                         type="number"
                         min="0"
                         max="10"
                         step="0.5"
                         value={classGrade}
                         onChange={(e) => setClassGrade(e.target.value)}
                         onWheel={(e) => e.currentTarget.blur()}
                       />
                     </div>
                     <div className="space-y-1.5">
                       <Label htmlFor="speakingGrade" className="text-xs font-semibold">Speaking (0-10)</Label>
                       <Input
                         id="speakingGrade"
                         type="number"
                         min="0"
                         max="10"
                         step="0.5"
                         value={speakingGrade}
                         onChange={(e) => setSpeakingGrade(e.target.value)}
                         onWheel={(e) => e.currentTarget.blur()}
                       />
                     </div>
                     <div className="space-y-1.5">
                       <Label htmlFor="listeningGrade" className="text-xs font-semibold">Listening (0-10)</Label>
                       <Input
                         id="listeningGrade"
                         type="number"
                         min="0"
                         max="10"
                         step="0.5"
                         value={listeningGrade}
                         onChange={(e) => setListeningGrade(e.target.value)}
                         onWheel={(e) => e.currentTarget.blur()}
                       />
                     </div>
                     <div className="space-y-1.5">
                       <Label htmlFor="grammarGrade" className="text-xs font-semibold">Grammar (0-10)</Label>
                       <Input
                         id="grammarGrade"
                         type="number"
                         min="0"
                         max="10"
                         step="0.5"
                         value={grammarGrade}
                         onChange={(e) => setGrammarGrade(e.target.value)}
                         onWheel={(e) => e.currentTarget.blur()}
                       />
                     </div>
                     <div className="space-y-1.5">
                       <Label htmlFor="readingGrade" className="text-xs font-semibold">Reading (0-10)</Label>
                       <Input
                         id="readingGrade"
                         type="number"
                         min="0"
                         max="10"
                         step="0.5"
                         value={readingGrade}
                         onChange={(e) => setReadingGrade(e.target.value)}
                         onWheel={(e) => e.currentTarget.blur()}
                       />
                     </div>
                   </div>

              {/* Class Type */}
              <div className="space-y-2">
                <Label htmlFor="classType">Class Type</Label>
                <Select value={classType} onValueChange={setClassType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Grammar">Grammar</SelectItem>
                    <SelectItem value="Club">Club</SelectItem>
                    <SelectItem value="Reading">Reading</SelectItem>
                    <SelectItem value="Listening">Listening</SelectItem>
                    <SelectItem value="Club (Reading)">Club (Reading)</SelectItem>
                    <SelectItem value="Club (Listening)">Club (Listening)</SelectItem>
                    <SelectItem value="Exam">Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Class Level
                </label>

                <select
                  value={classLevel}
                  onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">Select level</option>

                  {CLASS_LEVELS.map(level => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>


              {/* Chapter */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="noChapter"
                    checked={noChapter}
                    onCheckedChange={(checked) => setNoChapter(checked as boolean)}
                  />
                  <Label htmlFor="noChapter">No Chapter (conversation-only class)</Label>
                </div>
                {!noChapter && (
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 5"
                    value={classChapter}
                    onChange={(e) => setClassChapter(e.target.value)}
                  />
                )}
              </div>

              {/* Grammar Whiteboard Screenshot */}
              {classType === 'Grammar' && (
                <div className="space-y-2 rounded-xl border border-indigo-200/80 dark:border-indigo-800/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-semibold flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
                      <ImageIcon className="w-4 h-4 text-indigo-600" />
                      Whiteboard Screenshot (Grammar Class)
                      <span className="text-[11px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        Required
                      </span>
                    </Label>
                    {whiteboardPreview && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveWhiteboard}
                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload or paste (<kbd className="px-1 py-0.5 bg-background border rounded text-[10px]">Cmd/Ctrl + V</kbd>) a screenshot of the whiteboard. Visible to the student, teachers, and admins for 10 days before automatic deletion.
                  </p>

                  {whiteboardPreview ? (
                    <div className="mt-2 rounded-lg overflow-hidden border bg-white dark:bg-slate-950">
                      <img
                        src={whiteboardPreview}
                        alt="Whiteboard preview"
                        className="max-h-64 w-full object-contain"
                      />
                    </div>
                  ) : (
                    <label
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleSelectWhiteboardFile(e.dataTransfer.files?.[0]);
                      }}
                      className="mt-2 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-300 dark:border-indigo-700 bg-background/70 hover:bg-background p-6 cursor-pointer transition-colors"
                    >
                      <Upload className="w-6 h-6 text-indigo-500" />
                      <span className="text-xs font-medium text-foreground">
                        Click to upload, drag & drop, or paste screenshot
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        PNG, JPG, or WEBP
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleSelectWhiteboardFile(e.target.files?.[0])}
                      />
                    </label>
                  )}
                </div>
              )}
              </>
              )}

              {/* Notes for the student */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="notes">Notes for the student (optional)</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleImproveFeedback}
                    disabled={improvingFeedback || !notes.trim()}
                    className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  >
                    {improvingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {improvingFeedback ? 'Improving...' : 'Improve with AI'}
                  </Button>
                </div>
                <Textarea
                  id="notes"
                  placeholder="Write feedback or observations for the student..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>


              {/* Actions */}
              <div className="flex gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Grades'}
                </Button>
                <Button type="button" variant="outline" onClick={saveDraft}>
                  Save Draft
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeacherGrade;
