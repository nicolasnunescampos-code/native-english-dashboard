import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Exam, Question, ExamSubmission } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const ExamRoom: React.FC = () => {
    const { id: examId } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [exam, setExam] = useState<Exam | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [submission, setSubmission] = useState<ExamSubmission | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!user || !examId) return;

        const fetchData = async () => {
            try {
                // Fetch Exam Submission to verify access
                const { data: subData, error: subError } = await supabase
                    .from('exam_submissions')
                    .select('*')
                    .eq('student_id', user.id)
                    .eq('exam_id', examId)
                    .single();

                if (subError || !subData) {
                    toast.error("You don't have access to this exam.");
                    navigate('/student/exams');
                    return;
                }
                setSubmission(subData);

                // Fetch Exam Details
                const { data: examData, error: examError } = await supabase
                    .from('exams')
                    .select('*')
                    .eq('id', examId)
                    .single();
                
                if (examError) throw examError;
                setExam(examData);

                // Fetch Questions
                const { data: qData, error: qError } = await supabase
                    .from('questions')
                    .select('*')
                    .eq('exam_id', examId)
                    .order('created_at', { ascending: true });

                if (qError) throw qError;
                setQuestions(qData || []);

                // If already completed, load their previous answers
                if (subData.completed_at && subData.answers_json) {
                    setAnswers(subData.answers_json);
                } else {
                    // Try to load from localStorage if in progress
                    const savedDraft = localStorage.getItem(`exam_draft_${examId}_${user.id}`);
                    if (savedDraft) {
                        try {
                            setAnswers(JSON.parse(savedDraft));
                        } catch (e) {
                            console.error("Failed to parse saved draft", e);
                        }
                    } else if (subData.answers_json) {
                        setAnswers(subData.answers_json);
                    }
                }

            } catch (err) {
                console.error("Error fetching exam:", err);
                toast.error("Failed to load exam details.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, examId, navigate]);

    const handleInputChange = (questionId: string, value: string) => {
        if (submission?.completed_at) return; // Prevent edits if completed
        setAnswers(prev => {
            const newAnswers = { ...prev, [questionId]: value };
            if (user && examId) {
                localStorage.setItem(`exam_draft_${examId}_${user.id}`, JSON.stringify(newAnswers));
            }
            return newAnswers;
        });
    };

    const normalizeAnswer = (text: string | null | undefined) => {
        if (!text) return '';
        let t = text.toLowerCase().trim();
        // Normalize apostrophes to a standard single quote
        t = t.replace(/['`’´]/g, "'");

        // Normalize separators for multi-blank questions
        t = t.replace(/[/\\,\-|]/g, " ");
        
        // Expand common contractions with optional apostrophes
        t = t.replace(/\baren'?t\b/g, "are not");
        t = t.replace(/\bisn'?t\b/g, "is not");
        t = t.replace(/\bdon'?t\b/g, "do not");
        t = t.replace(/\bdoesn'?t\b/g, "does not");
        t = t.replace(/\bcan'?t\b/g, "can not");
        t = t.replace(/\bcannot\b/g, "can not");
        t = t.replace(/\bwon'?t\b/g, "will not");
        t = t.replace(/\bwasn'?t\b/g, "was not");
        t = t.replace(/\bweren'?t\b/g, "were not");
        t = t.replace(/\bhasn'?t\b/g, "has not");
        t = t.replace(/\bhaven'?t\b/g, "have not");
        t = t.replace(/\bhadn'?t\b/g, "had not");
        t = t.replace(/\bshouldn'?t\b/g, "should not");
        t = t.replace(/\bwouldn'?t\b/g, "would not");
        t = t.replace(/\bcouldn'?t\b/g, "could not");
        t = t.replace(/\bi'?m\b/g, "i am");
        t = t.replace(/\byou'?re\b/g, "you are");
        t = t.replace(/\bhe'?s\b/g, "he is");
        t = t.replace(/\bshe'?s\b/g, "she is");
        t = t.replace(/\bit'?s\b/g, "it is");
        t = t.replace(/\bwe'?re\b/g, "we are");
        t = t.replace(/\bthey'?re\b/g, "they are");

        // Remove extra spaces
        t = t.replace(/\s+/g, " ");
        
        return t;
    };

    const calculateScore = () => {
        let totalPoints = 0;
        let earnedPoints = 0;

        questions.forEach(q => {
            totalPoints += q.points;
            const studentAnswer = normalizeAnswer(answers[q.id] || '');
            const correctAnswer = normalizeAnswer(q.correct_answer);
            
            if (studentAnswer === correctAnswer) {
                earnedPoints += q.points;
            }
        });

        if (totalPoints === 0) return 0;
        return Math.round((earnedPoints / totalPoints) * 100);
    };

    const handleSubmit = async () => {
        if (!user || !submission) return;

        // Ensure all questions are answered
        const unansweredCount = questions.filter(q => !answers[q.id] || answers[q.id].trim() === '').length;
        if (unansweredCount > 0) {
            const confirmSubmit = window.confirm(`You have ${unansweredCount} unanswered questions. Are you sure you want to submit?`);
            if (!confirmSubmit) return;
        }

        setSubmitting(true);
        const finalScore = calculateScore();

        try {
            const { error } = await supabase
                .from('exam_submissions')
                .update({
                    score: finalScore,
                    answers_json: answers,
                    completed_at: new Date().toISOString()
                })
                .eq('id', submission.id);

            if (error) throw error;

            // --- Send Automated Message ---
            try {
                const { data: studentData } = await supabase.from('students').select('student_name').eq('id', user.id).single();
                const studentName = studentData?.student_name || 'A student';
                
                let answersReport = '\n\n--- Exam Answers ---\n';
                questions.forEach((q, idx) => {
                    const studentAns = answers[q.id] || '(No answer)';
                    const correctAns = q.correct_answer;
                    const isCorrect = normalizeAnswer(studentAns) === normalizeAnswer(correctAns);
                    
                    const displayAns = studentAns.replace(/\|/g, ' / ');
                    answersReport += `\nQ${idx + 1}. ${q.question_text}\n`;
                    answersReport += `Student: ${displayAns} ${isCorrect ? '✅' : '❌'}\n`;
                    if (!isCorrect) {
                        answersReport += `Correct: ${correctAns}\n`;
                    }
                });

                const messageContent = `🏆 Exam Completed & Submitted!\n\n${studentName} has just completed the exam "${exam.title}" (Chapter ${exam.chapter_number}).\n\nFinal Score: ${finalScore}%` + answersReport;

                console.log("SENDING MESSAGE:", messageContent);

                // Fetch Admins
                const { data: admins } = await supabase.from('admins').select('id');

                const receiverIds = [
                    ...(admins?.map(a => a.id) || [])
                ];
                
                // Add the teacher who assigned the exam
                if (submission.assigned_by) {
                    receiverIds.push(submission.assigned_by);
                }

                // Deduplicate IDs
                const uniqueReceivers = Array.from(new Set(receiverIds));

                const messagePayloads = uniqueReceivers.map(receiverId => ({
                    sender_id: user.id,
                    receiver_id: receiverId,
                    content: messageContent,
                    is_read: false
                }));

                if (messagePayloads.length > 0) {
                    const { error: msgErr } = await supabase.from('messages').insert(messagePayloads);
                    if (msgErr) {
                        console.error("Message Insert Error:", msgErr);
                        toast.error(`Warning: Could not send automated message. Details: ${msgErr.message}`);
                    }
                }
            } catch (msgError: any) {
                console.error("Failed to construct or send automated message", msgError);
                toast.error(`Warning: Message error: ${msgError?.message || 'Unknown'}`);
            }

            toast.success(`Exam submitted successfully! Score: ${finalScore}%`);
            
            // Clear local storage draft
            localStorage.removeItem(`exam_draft_${examId}_${user.id}`);
            
            // Reload submission state to show results
            setSubmission(prev => prev ? { ...prev, score: finalScore, answers_json: answers, completed_at: new Date().toISOString() } : null);
            
        } catch (error) {
            console.error("Submission error:", error);
            toast.error("Failed to submit exam.");
        } finally {
            setSubmitting(false);
        }
    };

    const renderFillInTheBlank = (question: Question) => {
        const parts = question.question_text.split('___');
        const isCompleted = !!submission?.completed_at;
        const studentAns = answers[question.id] || '';
        const correctAns = question.correct_answer;
        const isCorrect = normalizeAnswer(studentAns) === normalizeAnswer(correctAns);

        const studentAnsParts = studentAns.includes('|') ? studentAns.split('|') : [studentAns];

        return (
            <div className="flex flex-wrap items-center gap-2 text-lg leading-relaxed">
                {parts.map((part, index) => (
                    <React.Fragment key={index}>
                        <span>{part}</span>
                        {index < parts.length - 1 && (
                            <div className="relative inline-block">
                                <Input
                                    value={studentAnsParts[index] || ''}
                                    onChange={(e) => {
                                        if (isCompleted) return;
                                        const newParts = [...studentAnsParts];
                                        while (newParts.length < parts.length - 1) newParts.push('');
                                        newParts[index] = e.target.value;
                                        handleInputChange(question.id, newParts.join('|'));
                                    }}
                                    disabled={isCompleted}
                                    className={`w-32 inline-block h-8 text-center px-2 py-1 mx-1 ${
                                        isCompleted 
                                            ? isCorrect 
                                                ? 'border-success text-success bg-success/10' 
                                                : 'border-destructive text-destructive bg-destructive/10'
                                            : ''
                                    }`}
                                />
                                {isCompleted && (
                                    <span className="absolute -top-3 -right-2 bg-background rounded-full">
                                        {isCorrect ? (
                                            <CheckCircle2 className="w-5 h-5 text-success" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-destructive" />
                                        )}
                                    </span>
                                )}
                            </div>
                        )}
                    </React.Fragment>
                ))}
                
                {isCompleted && !isCorrect && (
                    <div className="w-full mt-2 text-sm text-muted-foreground bg-muted p-2 rounded-md">
                        Correct Answer: <span className="font-semibold text-foreground">{question.correct_answer}</span>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!exam) return null;

    const isCompleted = !!submission?.completed_at;

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-20">
            <Button variant="ghost" onClick={() => navigate('/student/exams')} className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Exams
            </Button>

            {isCompleted && (
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6 text-center">
                        <h2 className="text-2xl font-bold text-primary mb-2">Exam Completed!</h2>
                        <div className="text-5xl font-black mb-2">
                            {submission.score}%
                        </div>
                        <p className="text-muted-foreground">
                            Great job! Review your answers below.
                        </p>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader className="border-b bg-muted/50">
                    <CardTitle className="text-2xl">{exam.title}</CardTitle>
                    <div className="text-sm text-muted-foreground flex gap-4 mt-2">
                        <span>Level: {exam.level}</span>
                        <span>Chapter: {exam.chapter_number}</span>
                        <span>Questions: {questions.length}</span>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                    {questions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No questions have been added to this exam yet.</p>
                    ) : (
                        Object.entries(
                            questions.reduce((acc, q) => {
                                const t = q.topic || 'General';
                                if (!acc[t]) acc[t] = [];
                                acc[t].push(q);
                                return acc;
                            }, {} as Record<string, Question[]>)
                        ).map(([topic, groupQuestions]) => (
                            <div key={topic} className="space-y-6 mb-10 last:mb-0">
                                <div className="border-b border-primary/20 pb-2 mb-4">
                                    <h3 className="text-xl font-bold text-primary">{topic}</h3>
                                </div>
                                {groupQuestions.map((q, idx) => (
                                    <div key={q.id} className="space-y-3">
                                        <div className="flex gap-2 items-baseline">
                                            <span className="font-bold text-muted-foreground w-6 shrink-0">{idx + 1}.</span>
                                            <div className="flex-1">
                                                {q.type === 'fill-in-the-blank' && renderFillInTheBlank(q)}
                                                {/* Future multiple choice logic can go here */}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </CardContent>
                {!isCompleted && questions.length > 0 && (
                    <CardFooter className="bg-muted/50 p-4 flex justify-end">
                        <Button onClick={handleSubmit} disabled={submitting} size="lg">
                            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Submit Exam
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
};

export default ExamRoom;
