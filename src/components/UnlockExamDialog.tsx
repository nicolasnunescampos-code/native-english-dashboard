import React, { useState, useEffect } from 'react';
import { supabase, Exam } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface UnlockExamDialogProps {
    studentName: string;
    variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
}

export function UnlockExamDialog({ studentName, variant = "default", size = "default", className }: UnlockExamDialogProps) {
    const { user } = useAuth();
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [unlocking, setUnlocking] = useState(false);
    const [canceling, setCanceling] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        if (isDialogOpen) {
            fetchExamsAndSelect();
        }
    }, [isDialogOpen]);

    async function fetchExamsAndSelect() {
        const { data } = await supabase.from('exams').select('*').order('level').order('chapter_number');
        if (data && data.length > 0) {
            setExams(data);

            // Try to auto-select matching exam for student based on recent grammar class
            try {
                const cleanName = studentName?.trim() || "";
                const { data: lastGrammar } = await supabase
                    .from('classes')
                    .select('class_level, class_chapter')
                    .or(`student_name.ilike.%${cleanName}%,student_name.eq.${cleanName}`)
                    .eq('class_type', 'Grammar')
                    .not('class_grade', 'is', null)
                    .order('date', { ascending: false })
                    .order('time', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (lastGrammar) {
                    const targetChapterNum = lastGrammar.class_chapter === '10' ? 2 : 1;
                    const match = data.find(e => 
                        e.chapter_number === targetChapterNum &&
                        (!lastGrammar.class_level || e.level.toLowerCase() === lastGrammar.class_level.toLowerCase())
                    );
                    if (match) {
                        setSelectedExamId(match.id);
                        return;
                    }
                }
            } catch (err) {
                console.error("Error auto-detecting exam:", err);
            }

            if (!selectedExamId) {
                setSelectedExamId(data[0].id);
            }
        }
    }

    async function getStudentId(): Promise<string | null> {
        const cleanName = studentName?.trim() || "";
        const { data: s1 } = await supabase
            .from('students')
            .select('id')
            .ilike('student_name', cleanName)
            .maybeSingle();

        if (s1?.id) return s1.id;

        const { data: s2 } = await supabase
            .from('students')
            .select('id')
            .or(`student_name.ilike.%${cleanName}%,student_name.eq.${cleanName}`)
            .limit(1)
            .maybeSingle();

        return s2?.id || null;
    }

    async function handleUnlockExam() {
        if (!studentName || !selectedExamId) return;
        setUnlocking(true);

        try {
            const studentId = await getStudentId();
            if (!studentId) {
                throw new Error('Student ID not found in database.');
            }

            // 2. Get the specific exam to unlock
            const examToUnlock = exams.find(e => e.id === selectedExamId);
            if (!examToUnlock) {
                toast.error('Selected exam not found.');
                setUnlocking(false);
                return;
            }

            // 3. Check existing submissions
            const { data: existing } = await supabase
                .from('exam_submissions')
                .select('exam_id')
                .eq('student_id', studentId)
                .eq('exam_id', examToUnlock.id);

            if (existing && existing.length > 0) {
                toast.error('This exam is already unlocked or completed.');
                setUnlocking(false);
                return;
            }

            // 4. Insert the submission to unlock
            const { error: insertError } = await supabase
                .from('exam_submissions')
                .insert({
                    student_id: studentId,
                    exam_id: examToUnlock.id,
                    assigned_by: user?.id
                });
            
            if (insertError) throw insertError;

            toast.success(`Exam unlocked successfully for the student!`);
            setIsDialogOpen(false);
            setSelectedExamId('');
            window.location.reload();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to unlock exam.');
        } finally {
            setUnlocking(false);
        }
    }

    async function handleCancelExam() {
        if (!studentName || !selectedExamId) return;
        
        const examToCancel = exams.find(e => e.id === selectedExamId);
        if (!examToCancel) return;

        if (!window.confirm(`Are you sure you want to bypass/cancel ${examToCancel.title} for ${studentName}?`)) {
            return;
        }

        setCanceling(true);

        try {
            const studentId = await getStudentId();
            if (!studentId) {
                throw new Error("Student not found");
            }

            // Delete any existing submission for this student and exam
            await supabase
                .from('exam_submissions')
                .delete()
                .eq('student_id', studentId)
                .eq('exam_id', examToCancel.id);

            // Insert a bypassed submission to satisfy the requirement
            const { error } = await supabase.from('exam_submissions').insert({
                student_id: studentId,
                exam_id: examToCancel.id,
                assigned_by: user?.id,
                score: 100, // Mark as 100% since it's bypassed
                answers_json: { bypassed: true, notes: 'Exam bypassed/canceled by teacher' },
                completed_at: new Date().toISOString()
            });

            if (error) throw error;

            toast.success(`Exam bypassed successfully for ${studentName}!`);
            setIsDialogOpen(false);
            setSelectedExamId('');
            
            // Reload to reflect changes on the schedule or progress page
            window.location.reload();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to cancel exam.');
        } finally {
            setCanceling(false);
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant={variant} size={size} className={className}>
                    Unlock Exam
                </Button>
            </DialogTrigger>
            <DialogContent onClick={e => e.stopPropagation()}>
                <DialogHeader>
                    <DialogTitle>Unlock Exam for {studentName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Exam</label>
                        <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an exam..." />
                            </SelectTrigger>
                            <SelectContent>
                                {exams.map(e => (
                                    <SelectItem key={e.id} value={e.id}>
                                        {e.level} - {e.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">
                            Select the specific exam to unlock or bypass for the student.
                        </p>
                    </div>
                    <div className="flex gap-2 w-full pt-2">
                        <Button 
                            variant="outline"
                            onClick={handleCancelExam} 
                            disabled={!selectedExamId || unlocking || canceling} 
                            className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                        >
                            {canceling ? 'Canceling...' : 'Cancel Exam'}
                        </Button>
                        <Button 
                            onClick={handleUnlockExam} 
                            disabled={!selectedExamId || unlocking || canceling} 
                            className="flex-1"
                        >
                            {unlocking ? 'Unlocking...' : 'Confirm Unlock'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
