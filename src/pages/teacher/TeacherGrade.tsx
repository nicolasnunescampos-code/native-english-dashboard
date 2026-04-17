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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CLASS_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced 1',
  'Advanced 2',
]


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
  const [grammarGrade, setGrammarGrade] = useState<string>('');
  const [readingGrade, setReadingGrade] = useState<string>('');
  const [classChapter, setClassChapter] = useState<string>('');
  const [classType, setClassType] = useState<string>('');
  const [noChapter, setNoChapter] = useState(false);
  const [isAbsent, setIsAbsent] = useState(false);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    const fetchClasses = async () => {
      if (!teacherName) return;

      try {
        // 1. (Skipped get teacher_id logic to avoid 400 errors)

        let listQuery = supabase
          .from('classes')
          .select('*')
          .ilike('title', `%${teacherName}%`)
          .order('date', { ascending: false })
          .limit(50);

        // 3. If valid classId, fetch it specifically
        let specificClassQuery;
        if (classId) {
          let query = supabase
            .from('classes')
            .select('*')
            .eq('id', classId)
            .ilike('title', `%${teacherName}%`);

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
    setClassGrade(cls.class_grade?.toString() || '');
    setSpeakingGrade(cls.speaking_grade?.toString() || '');
    setGrammarGrade(cls.grammar_grade?.toString() || '');
    setReadingGrade(cls.reading_grade?.toString() || '');
    setClassChapter(cls.class_chapter || '');
    setClassType(cls.class_type || '');
    setClassLevel(cls.class_level || '');
    setNoChapter(false);
    setIsAbsent(cls.is_absent || false);
    setNotes(cls.notes || '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass?.id) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .update({
          class_grade: classGrade ? parseInt(classGrade) : null,
          speaking_grade: speakingGrade ? parseInt(speakingGrade) : null,
          grammar_grade: grammarGrade ? parseInt(grammarGrade) : null,
          reading_grade: readingGrade ? parseInt(readingGrade) : null,
          class_chapter: noChapter ? null : classChapter || null,
          class_type: isAbsent ? null : classType || null,
          class_level: isAbsent ? null : classLevel || null,
          is_absent: isAbsent,
          notes: notes || null,
        })
        .eq('id', selectedClass.id)
        .select('*');

      if (error) {
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
            <form onSubmit={handleSubmit} className="space-y-6">
              
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                  <Label htmlFor="classGrade">Class Grade (0-10)</Label>
                  <Input
                    id="classGrade"
                    type="number"
                    min="0"
                    max="10"
                    value={classGrade}
                    onChange={(e) => setClassGrade(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="speakingGrade">Speaking (0-10)</Label>
                  <Input
                    id="speakingGrade"
                    type="number"
                    min="0"
                    max="10"
                    value={speakingGrade}
                    onChange={(e) => setSpeakingGrade(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grammarGrade">Grammar (0-10)</Label>
                  <Input
                    id="grammarGrade"
                    type="number"
                    min="0"
                    max="10"
                    value={grammarGrade}
                    onChange={(e) => setGrammarGrade(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="readingGrade">Reading (0-10)</Label>
                  <Input
                    id="readingGrade"
                    type="number"
                    min="0"
                    max="10"
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
                    <SelectItem value="Entertainment">Entertainment</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
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
              </>
              )}

              {/* Notes for the student */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes for the student (optional)</Label>
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
