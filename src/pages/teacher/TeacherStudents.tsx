import { useEffect, useState } from 'react';
import { supabase, Class } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

/* ---------------------------------------------
   Types
--------------------------------------------- */

type StudentRow = {
  student_name: string;
};

/* ---------------------------------------------
   Component
--------------------------------------------- */

export default function TeacherStudents() {
  const { teacherName } = useAuth();
  const [searchParams] = useSearchParams();
  const studentParam = searchParams.get('student');

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [history, setHistory] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------------------------------------
     MAIN EFFECT
  --------------------------------------------- */

  useEffect(() => {
    setLoading(true);

    if (studentParam) {
      fetchStudentHistory(studentParam);
    } else {
      fetchAllStudents();
    }
  }, [studentParam]);

  /* ---------------------------------------------
     FETCH: ALL STUDENTS
     (same as old JS: fetchAllStudents)
  --------------------------------------------- */

  async function fetchAllStudents() {
    if (!teacherName) {
      setStudents([]);
      setLoading(false);
      return;
    }

    // Fetch all active students directly from the students table
    const { data: activeStudents, error } = await supabase
        .from('students')
        .select('student_name')
        .eq('status', 'active');

    if (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
    } else {
      // Extract names and sort alphabetically
      const studentsList = (activeStudents || [])
        .map((s: any) => ({ student_name: s.student_name }))
        .sort((a, b) => a.student_name.localeCompare(b.student_name));
      
      setStudents(studentsList);
    }

    setLoading(false);
  }

  /* ---------------------------------------------
     FETCH: STUDENT HISTORY
     (same as old JS: fetchStudentHistory)
  --------------------------------------------- */

  async function fetchStudentHistory(studentName: string) {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('student_name', studentName)
      .not('speaking_grade', 'is', null)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
    } else {
      setHistory(data || []);
    }

    setLoading(false);
  }

  /* ---------------------------------------------
     HELPERS
  --------------------------------------------- */

  function getTeacherName(title?: string) {
    if (!title) return 'Unknown';
    const parts = title.split(' - ');
    return parts[parts.length - 1];
  }

  function gradeColor(grade?: number | null) {
    if (!grade) return 'text-muted-foreground';
    if (grade >= 9) return 'text-green-600';
    if (grade >= 7) return 'text-blue-600';
    return 'text-orange-500';
  }

  /* ---------------------------------------------
     RENDER
  --------------------------------------------- */

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  /* ---------- MODE A: ALL STUDENTS ---------- */

  if (!studentParam) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">All Students</h1>

        {students.length === 0 && (
          <p className="text-muted-foreground">No students found.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((s) => (
            <Link
              key={s.student_name}
              to={`/teacher/students?student=${encodeURIComponent(
                s.student_name
              )}`}
            >
              <Card className="hover:bg-muted transition">
                <CardContent className="p-4 text-center font-medium">
                  {s.student_name}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  /* ---------- MODE B: STUDENT HISTORY ---------- */

  return (
    <div className="space-y-6">
      <Link
        to="/teacher/students"
        className="text-sm text-primary hover:underline"
      >
        ← Back to all students
      </Link>

      <h1 className="text-xl font-semibold">
        History for {studentParam}
      </h1>

      {history.length === 0 && (
        <p className="text-muted-foreground">
          No graded classes found for this student.
        </p>
      )}

      <div className="space-y-4">
        {history.map((cls) => (
          <Card key={cls.id}>
            <CardContent className="p-5 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {new Date(cls.date).toLocaleDateString()}
                </p>
                <p className="font-semibold">{cls.title}</p>
                <p className="text-sm text-muted-foreground">
                  Teacher: {getTeacherName(cls.title)}
                </p>
              </div>

              {/* MATERIAL */}
              {cls.class_chapter && cls.class_chapter !== 'N/A' && (
                <div className="border-t border-b py-3 text-sm">
                  <p className="font-medium text-primary">
                    {cls.class_type} — Chapter {cls.class_chapter} (
                    {cls.class_level})
                  </p>
                </div>
              )}

              {/* GRADES */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className={`text-lg font-bold ${gradeColor(cls.speaking_grade)}`}>
                    {cls.speaking_grade ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Speaking</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${gradeColor(cls.grammar_grade)}`}>
                    {cls.grammar_grade ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Grammar</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${gradeColor(cls.reading_grade)}`}>
                    {cls.reading_grade ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Reading</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${gradeColor(cls.class_grade)}`}>
                    {cls.class_grade ?? '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Class</p>
                </div>
              </div>

              {/* NOTES */}
              <div className="bg-muted p-3 rounded-md text-sm italic">
                “{cls.notes || 'No notes provided.'}”
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
