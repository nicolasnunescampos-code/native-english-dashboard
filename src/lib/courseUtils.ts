import { supabase } from '@/lib/supabase';

export type ClassType = "Grammar" | "Entertainment" | "Club" | "Business" | "Exam";

export type NextChapterInfo = {
  chapter: number;
  level: string;
};

export const MAX_CHAPTERS: Record<ClassType, number> = {
  Grammar: 10,
  Entertainment: 20,
  Club: 20,
  Business: 20,
  Exam: 99,
};

export const CLASS_LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced 1',
  'Advanced 2',
];

export function getNextLevel(currentLevel: string): string {
  const currentIndex = CLASS_LEVELS.indexOf(currentLevel || 'Beginner');
  if (currentIndex === -1 || currentIndex >= CLASS_LEVELS.length - 1) {
    return currentLevel || 'Beginner';
  }
  return CLASS_LEVELS[currentIndex + 1];
}

export async function fetchStudentNextChapters(
  studentName: string
): Promise<Partial<Record<ClassType, NextChapterInfo>>> {
  const { data: history } = await supabase
    .from("classes")
    .select("class_type, class_chapter, class_level, date, time")
    .eq("student_name", studentName)
    .not("class_grade", "is", null);

  const nextChapters: Partial<Record<ClassType, NextChapterInfo>> = {};
  if (!history) return nextChapters;

  for (const type of ["Grammar", "Entertainment", "Club", "Business"] as ClassType[]) {
    const last = history
      .filter(
        h =>
          h.class_type === type &&
          h.class_chapter &&
          h.class_chapter !== "N/A"
      )
      .sort((a, b) =>
        `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
      )[0];

    if (!last) continue;

    const lastChapter = Number(last.class_chapter);
    if (Number.isNaN(lastChapter)) continue;

    let nextChapter = lastChapter + 1;
    let nextLevel = last.class_level || "Beginner";

    if (nextChapter > MAX_CHAPTERS[type]) {
      nextChapter = 1;
      nextLevel = getNextLevel(nextLevel);
    }

    nextChapters[type] = {
      chapter: nextChapter,
      level: nextLevel,
    };
  }

  return nextChapters;
}

import { startOfWeek, endOfWeek } from 'date-fns';

export async function fetchUpcomingClassType(studentName: string): Promise<ClassType> {
  if (!studentName) return 'Grammar';

  // First check what course type the student makes
  const { data: student } = await supabase
    .from('students')
    .select('course_type')
    .eq('student_name', studentName)
    .maybeSingle();

  const courseType = student?.course_type || 'Native English';

  if (courseType === 'Conversation Club') {
    return 'Club';
  } else if (courseType === 'Business English') {
    return 'Business';
  }
  
  const now = new Date();
  // Using weekStartsOn: 1 (Monday) as typical for work/school weeks
  const start = startOfWeek(now, { weekStartsOn: 1 }).toISOString().split('T')[0];
  const end = endOfWeek(now, { weekStartsOn: 1 }).toISOString().split('T')[0];

  const { data: classes } = await supabase
    .from("classes")
    .select("class_type, class_chapter, date, time")
    .eq("student_name", studentName)
    .not("class_grade", "is", null);

  if (!classes || classes.length === 0) {
    return 'Grammar';
  }

  // Check for Exam requirement
  const grammarClasses = classes.filter(c => c.class_type === 'Grammar');
  const examClasses = classes.filter(c => c.class_type === 'Exam');
  
  grammarClasses.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  examClasses.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  
  const lastGrammar = grammarClasses[0];
  const lastExam = examClasses[0];

  if (lastGrammar) {
    if (lastGrammar.class_chapter === '5' || lastGrammar.class_chapter === '10') {
      const grammarDateTime = `${lastGrammar.date} ${lastGrammar.time}`;
      const examDateTime = lastExam ? `${lastExam.date} ${lastExam.time}` : '';
      
      // Also check if there's a completed online exam submission AFTER grammarDateTime
      const { data: submissions } = await supabase
        .from('exam_submissions')
        .select('completed_at, students!inner(student_name)')
        .eq('students.student_name', studentName)
        .not('completed_at', 'is', null);

      const hasCompletedSubmission = submissions?.some(sub => {
          return sub.completed_at && new Date(sub.completed_at).getTime() >= new Date(grammarDateTime).getTime();
      });
      
      // If there is no exam class AND no completed online exam AFTER the grammar class 5 or 10, next MUST be Exam
      if (!hasCompletedSubmission && (!lastExam || examDateTime < grammarDateTime)) {
        return 'Exam';
      }
    }
  }

  // Normal alternating logic for this week
  const weeklyClasses = classes.filter(c => c.date >= start && c.date <= end && c.class_type !== 'Exam');

  if (weeklyClasses.length === 0) {
    return 'Grammar';
  }

  const hasGradedGrammar = weeklyClasses.some(c => c.class_type === 'Grammar');
  
  return hasGradedGrammar ? 'Entertainment' : 'Grammar';
}
