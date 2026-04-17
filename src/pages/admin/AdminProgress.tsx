import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollText, Loader2, BookOpen } from 'lucide-react';

// Types
interface Student {
    id: string;
    student_name: string;
}

interface StudentProgress {
    studentName: string;
    currentLevel: string; // Normalized: Beginner, Intermediate, Advanced, Advanced 2
    currentChapter: number;
}

interface GroupedByLevel {
    [level: string]: {
        [chapter: number]: string[]; // Chapter -> [Student Names]
    };
}

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Advanced 2'];
const CLASS_TYPES = ['Grammar', 'Entertainment', 'Club'];

// Helper to map DB values to standard levels
const normalizeLevel = (dbLevel: string | null): string => {
    if (!dbLevel) return 'Beginner';
    const l = dbLevel.trim().toLowerCase();

    if (l.includes('mixed')) return 'Beginner'; // "Mixed" seems to be Beginner in this DB
    if (l === 'advanced 1') return 'Advanced';
    if (l === 'advanced') return 'Advanced';
    if (l === 'advanced 2') return 'Advanced 2';

    // Default fallbacks
    if (l.includes('beginner')) return 'Beginner';
    if (l.includes('intermediate')) return 'Intermediate';

    return 'Beginner';
};

const AdminProgress: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [activeType, setActiveType] = useState('Grammar');
    const [groupedData, setGroupedData] = useState<GroupedByLevel>({});

    useEffect(() => {
        fetchProgress();
    }, [activeType]);

    const fetchProgress = async () => {
        try {
            setLoading(true);

            // 1. Fetch ALL Students (Active only logic could be added here if needed)
            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('id, student_name');

            if (studentsError) throw studentsError;

            // 2. Fetch ALL Graded Classes for this Type
            const { data: classes, error: classesError } = await supabase
                .from('classes')
                .select('student_name, class_chapter, class_level, date, time')
                .eq('class_type', activeType)
                .not('class_grade', 'is', null)
                .not('class_chapter', 'is', null);

            if (classesError) throw classesError;

            // 3. Process each student
            const stats: StudentProgress[] = (students || []).map(student => {
                const studentClasses = (classes || []).filter(c =>
                    c.student_name.trim().toLowerCase() === student.student_name.trim().toLowerCase()
                );

                if (studentClasses.length === 0) {
                    return {
                        studentName: student.student_name,
                        currentLevel: 'Beginner',
                        currentChapter: 1
                    };
                }

                // Find latest class
                const lastClass = studentClasses.sort((a, b) => {
                    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
                    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
                    return dateB.getTime() - dateA.getTime();
                })[0];

                const lastChapter = parseInt(lastClass.class_chapter);
                const lastLevelName = lastClass.class_level || 'Beginner';

                // Basic validation
                if (isNaN(lastChapter)) {
                    return {
                        studentName: student.student_name,
                        currentLevel: normalizeLevel(lastLevelName),
                        currentChapter: 1
                    };
                }

                // Logic: Next Chapter
                const maxChapters = activeType === 'Grammar' ? 10 : 20;
                let nextChapter = lastChapter + 1;

                // We calculate next level based on the CURRENT normalized level
                let currentNormalized = normalizeLevel(lastLevelName);

                if (nextChapter > maxChapters) {
                    nextChapter = 1;
                    // Level Up logic
                    const idx = LEVELS.indexOf(currentNormalized);
                    if (idx !== -1 && idx < LEVELS.length - 1) {
                        currentNormalized = LEVELS[idx + 1];
                    }
                }

                return {
                    studentName: student.student_name,
                    currentLevel: currentNormalized,
                    currentChapter: nextChapter
                };
            });

            // 4. Group Data Hierarchy: Level -> Chapter -> Students
            const groups: GroupedByLevel = {
                'Beginner': {},
                'Intermediate': {},
                'Advanced': {},
                'Advanced 2': {}
            };

            stats.forEach(stat => {
                const lvl = stat.currentLevel;
                const ch = stat.currentChapter;

                if (!groups[lvl]) groups[lvl] = {};
                if (!groups[lvl][ch]) groups[lvl][ch] = [];

                groups[lvl][ch].push(stat.studentName);
            });

            setGroupedData(groups);

        } catch (error) {
            console.error("Error fetching progress:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <ScrollText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-semibold">Student Progress</h2>
                        <p className="text-muted-foreground">Track student chapters by class type</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {CLASS_TYPES.map(type => (
                        <Button
                            key={type}
                            variant={activeType === type ? 'default' : 'outline'}
                            onClick={() => setActiveType(type)}
                            size="sm"
                        >
                            {type}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="space-y-10">
                {LEVELS.map(level => {
                    const chapters = groupedData[level] || {};
                    const chapterNumbers = Object.keys(chapters).map(Number).sort((a, b) => a - b);
                    const hasStudents = chapterNumbers.length > 0;

                    if (!hasStudents) return null; // Hide empty levels

                    return (
                        <section key={level} className="space-y-4">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <BookOpen className="w-5 h-5 text-muted-foreground" />
                                <h3 className="text-xl font-bold text-foreground">{level}</h3>
                                <Badge variant="secondary" className="ml-2">
                                    {Object.values(chapters).reduce((acc, list) => acc + list.length, 0)} Students
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {chapterNumbers.map(chapterNum => {
                                    const students = chapters[chapterNum];
                                    return (
                                        <div key={chapterNum} className="group relative flex items-start gap-4">
                                            {/* Chapter Indicator */}
                                            <div className="flex-none w-24 pt-2">
                                                <div className="bg-primary/5 text-primary font-bold px-3 py-1 rounded-md text-center border border-primary/20">
                                                    Chapter {chapterNum}
                                                </div>
                                            </div>

                                            {/* Connecting Line (Visual) */}
                                            <div className="hidden md:block w-px bg-border absolute left-[3rem] top-10 bottom-[-1rem] -z-10 group-last:hidden" />

                                            {/* Student Card */}
                                            <Card className="flex-1 hover:shadow-md transition-shadow">
                                                <CardContent className="p-4 flex flex-wrap gap-2 items-center">
                                                    {students.sort().map(name => (
                                                        <Badge
                                                            key={name}
                                                            variant="secondary"
                                                            className="px-3 py-1.5 text-sm bg-secondary/40 hover:bg-secondary border-transparent hover:border-primary/20 transition-all cursor-default"
                                                        >
                                                            {name}
                                                        </Badge>
                                                    ))}
                                                </CardContent>
                                            </Card>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}

                {Object.values(groupedData).every(g => Object.keys(g).length === 0) && (
                    <Card>
                        <CardContent className="p-12 text-center text-muted-foreground">
                            No active student data found for {activeType}.
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};
export default AdminProgress;
