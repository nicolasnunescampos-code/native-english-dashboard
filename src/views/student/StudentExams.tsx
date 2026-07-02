'use client';

import React, { useEffect, useState } from 'react';
import { supabase, ExamSubmission } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, GraduationCap, Clock, CheckCircle, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const StudentExams: React.FC = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        
        const fetchExams = async () => {
            try {
                const { data, error } = await supabase
                    .from('exam_submissions')
                    .select('*, exams(*)')
                    .eq('student_id', user.id)
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                setSubmissions(data || []);
            } catch (err) {
                console.error("Error fetching exams:", err);
            } finally {
                setLoading(false);
            }
        };
        
        fetchExams();
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const pendingExams = submissions.filter(s => s.completed_at === null);
    const completedExams = submissions.filter(s => s.completed_at !== null);

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div>
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-primary" />
                    My Exams
                </h2>
                <p className="text-muted-foreground mt-1">
                    Take your unlocked exams and view past results.
                </p>
            </div>

            {/* Pending Exams */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2 border-b pb-2">
                    <Clock className="h-5 w-5 text-warning" />
                    Pending Exams
                </h3>
                
                {pendingExams.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
                            <Lock className="h-8 w-8 text-muted-foreground/50" />
                            <p>You have no pending exams. Your teacher will unlock exams when you are ready.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingExams.map(sub => (
                            <Card key={sub.id} className="border-warning/50 shadow-sm hover:shadow-md transition-all">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg leading-tight">{sub.exams?.title}</CardTitle>
                                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                                            Unlocked
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1 mb-4 text-sm text-muted-foreground">
                                        <p>Level: <span className="font-medium text-foreground">{sub.exams?.level}</span></p>
                                        <p>Chapter: <span className="font-medium text-foreground">{sub.exams?.chapter_number}</span></p>
                                    </div>
                                    <Button 
                                        className="w-full" 
                                        onClick={() => router.push(`/student/exams/${sub.exam_id}`)}
                                    >
                                        Start Exam
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Completed Exams */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2 border-b pb-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Completed Exams
                </h3>
                
                {completedExams.length === 0 ? (
                    <p className="text-muted-foreground text-sm italic">No completed exams yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {completedExams.map(sub => (
                            <Card key={sub.id} className="opacity-90">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg leading-tight">{sub.exams?.title}</CardTitle>
                                        <Badge variant="secondary" className="bg-success/10 text-success">
                                            {sub.score}%
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1 mb-4 text-sm text-muted-foreground">
                                        <p>Level: <span className="font-medium text-foreground">{sub.exams?.level}</span></p>
                                        <p>Chapter: <span className="font-medium text-foreground">{sub.exams?.chapter_number}</span></p>
                                        {sub.completed_at && (
                                            <p>Completed on: <span className="font-medium text-foreground">{format(new Date(sub.completed_at), 'PPP')}</span></p>
                                        )}
                                    </div>
                                    <Button 
                                        variant="outline"
                                        className="w-full" 
                                        onClick={() => router.push(`/student/exams/${sub.exam_id}`)}
                                    >
                                        View Results
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentExams;