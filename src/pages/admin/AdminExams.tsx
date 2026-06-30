import React, { useEffect, useState } from 'react';
import { supabase, Exam, Question } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, ArrowLeft, Loader2, Save } from 'lucide-react';

export default function AdminExams() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  // Exam Dialog State
  const [isExamDialogOpen, setIsExamDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Partial<Exam> | null>(null);

  // Selected Exam for Questions View
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Question Dialog State
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);

  useEffect(() => {
    fetchExams();
  }, []);

  async function fetchExams() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('level')
        .order('chapter_number');
      if (error) throw error;
      setExams(data || []);
    } catch (err: any) {
      toast.error('Failed to load exams: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuestions(examId: string) {
    setQuestionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at');
      if (error) throw error;
      setQuestions(data || []);
    } catch (err: any) {
      toast.error('Failed to load questions: ' + err.message);
    } finally {
      setQuestionsLoading(false);
    }
  }

  const handleSelectExam = (exam: Exam) => {
    setSelectedExam(exam);
    fetchQuestions(exam.id);
  };

  // --- Exam CRUD ---
  const handleSaveExam = async () => {
    if (!editingExam?.title || !editingExam?.level || !editingExam?.chapter_number) {
      toast.error('Please fill in all exam fields.');
      return;
    }

    try {
      if (editingExam.id) {
        const { error } = await supabase
          .from('exams')
          .update(editingExam)
          .eq('id', editingExam.id);
        if (error) throw error;
        toast.success('Exam updated successfully');
      } else {
        const { error } = await supabase
          .from('exams')
          .insert(editingExam);
        if (error) throw error;
        toast.success('Exam created successfully');
      }
      setIsExamDialogOpen(false);
      fetchExams();
    } catch (err: any) {
      toast.error('Error saving exam: ' + err.message);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this exam? All questions and submissions will be lost!')) return;
    try {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
      toast.success('Exam deleted');
      fetchExams();
    } catch (err: any) {
      toast.error('Error deleting exam: ' + err.message);
    }
  };

  // --- Question CRUD ---
  const handleSaveQuestion = async () => {
    if (!editingQuestion?.question_text || !editingQuestion?.correct_answer || !selectedExam) {
      toast.error('Please fill in question text and correct answer.');
      return;
    }

    try {
      const payload = {
        ...editingQuestion,
        exam_id: selectedExam.id,
        type: editingQuestion.type || 'fill-in-the-blank',
        points: editingQuestion.points || 10
      };

      if (editingQuestion.id) {
        const { error } = await supabase
          .from('questions')
          .update(payload)
          .eq('id', editingQuestion.id);
        if (error) throw error;
        toast.success('Question updated');
      } else {
        const { error } = await supabase
          .from('questions')
          .insert(payload);
        if (error) throw error;
        toast.success('Question added');
      }
      setIsQuestionDialogOpen(false);
      fetchQuestions(selectedExam.id);
    } catch (err: any) {
      toast.error('Error saving question: ' + err.message);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Question deleted');
      fetchQuestions(selectedExam!.id);
    } catch (err: any) {
      toast.error('Error deleting question: ' + err.message);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // --- VIEW: Questions for Selected Exam ---
  if (selectedExam) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedExam(null)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Exams
          </Button>
          <h2 className="text-2xl font-bold flex-1">{selectedExam.level} - Chapter {selectedExam.chapter_number}: {selectedExam.title}</h2>
          <Button onClick={() => { setEditingQuestion({ type: 'fill-in-the-blank', points: 10 }); setIsQuestionDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Question
          </Button>
        </div>

        {questionsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : questions.length === 0 ? (
          <Card className="bg-muted/30 border-dashed"><CardContent className="p-8 text-center text-muted-foreground">No questions found. Add some questions to get started.</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {questions.map((q, idx) => (
              <Card key={q.id}>
                <CardHeader className="py-4 flex flex-row items-start justify-between bg-muted/20 border-b">
                  <div className="flex gap-4 items-center">
                    <span className="font-bold text-muted-foreground text-lg">Q{idx + 1}.</span>
                    <div>
                      {q.topic && <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-sm mb-1 inline-block">{q.topic}</span>}
                      <p className="font-medium text-lg leading-relaxed">{q.question_text}</p>
                      <div className="mt-2 flex gap-2">
                        <span className="text-sm px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded font-mono border border-green-200 dark:border-green-800">
                          {q.correct_answer}
                        </span>
                        <span className="text-sm px-2 py-1 bg-secondary text-secondary-foreground rounded">{q.points} points</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingQuestion(q); setIsQuestionDialogOpen(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* Question Dialog */}
        <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingQuestion?.id ? 'Edit Question' : 'Add Question'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Question Text</Label>
                <p className="text-xs text-muted-foreground mb-2">Use <code className="bg-muted px-1 rounded">___</code> (three underscores) where the blank should be.</p>
                <Input 
                  value={editingQuestion?.question_text || ''} 
                  onChange={e => setEditingQuestion(prev => ({ ...prev, question_text: e.target.value }))}
                  placeholder="The cat ___ on the mat."
                />
              </div>
              <div className="space-y-2">
                <Label>Topic / Activity Name</Label>
                <Input 
                  value={editingQuestion?.topic || ''} 
                  onChange={e => setEditingQuestion(prev => ({ ...prev, topic: e.target.value }))}
                  placeholder="e.g. Chapter 1: Verb To Be"
                />
              </div>
              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Input 
                  value={editingQuestion?.correct_answer || ''} 
                  onChange={e => setEditingQuestion(prev => ({ ...prev, correct_answer: e.target.value }))}
                  placeholder="is"
                />
              </div>
              <div className="space-y-2">
                <Label>Points</Label>
                <Input 
                  type="number"
                  value={editingQuestion?.points || 10} 
                  onChange={e => setEditingQuestion(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveQuestion}>Save Question</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // --- VIEW: All Exams ---
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          📝 Manage Exams
        </h2>
        <Button onClick={() => { setEditingExam({ level: 'Beginner' }); setIsExamDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Create Exam
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map(exam => (
          <Card key={exam.id} className="hover:shadow-md transition-shadow flex flex-col">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="text-sm font-medium text-primary mb-1">{exam.level}</div>
                  <CardTitle className="text-lg leading-tight">{exam.chapter_number ? `Exam ${exam.chapter_number}: ` : ''}{exam.title}</CardTitle>
                </div>
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingExam(exam); setIsExamDialogOpen(true); }}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteExam(exam.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 flex-1">
              <p className="text-sm text-muted-foreground">Manage questions and details for this exam.</p>
            </CardContent>
            <CardFooter className="p-4 pt-0">
              <Button variant="secondary" className="w-full" onClick={() => handleSelectExam(exam)}>
                Manage Questions
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {exams.length === 0 && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="p-12 text-center text-muted-foreground">
            No exams found. Click "Create Exam" to add one, or run the SQL script to insert the starter exams.
          </CardContent>
        </Card>
      )}

      {/* Exam Dialog */}
      <Dialog open={isExamDialogOpen} onOpenChange={setIsExamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExam?.id ? 'Edit Exam' : 'Create Exam'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select 
                value={editingExam?.level || 'Beginner'} 
                onValueChange={val => setEditingExam(prev => ({ ...prev, level: val }))}
              >
                <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="Advanced 2">Advanced 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Chapter Number</Label>
              <Input 
                type="number" 
                value={editingExam?.chapter_number || ''} 
                onChange={e => setEditingExam(prev => ({ ...prev, chapter_number: parseInt(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Title (e.g. "Verb To Be")</Label>
              <Input 
                value={editingExam?.title || ''} 
                onChange={e => setEditingExam(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveExam}>
              <Save className="w-4 h-4 mr-2" /> Save Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
