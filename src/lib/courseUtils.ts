import { supabase } from '@/lib/supabase';

export type ClassType = "Grammar" | "Reading" | "Listening" | "Club (Reading)" | "Club (Listening)" | "Club" | "Exam";

export type NextChapterInfo = {
  chapter: number;
  level: string;
};

export const MAX_CHAPTERS: Record<ClassType, number> = {
  Grammar: 10,
  "Reading": 20,
  "Listening": 20,
  "Club (Reading)": 20,
  "Club (Listening)": 20,
  Club: 20,
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
  const cleanName = studentName?.trim() || "";
  const { data: history } = await supabase
    .from("classes")
    .select("class_type, class_chapter, class_level, date, time")
    .or(`student_name.ilike.%${cleanName}%,student_name.eq.${cleanName}`)
    .not("class_grade", "is", null);

  const nextChapters: Partial<Record<ClassType, NextChapterInfo>> = {};
  if (!history) return nextChapters;

  for (const type of ["Grammar", "Reading", "Listening", "Club (Reading)", "Club (Listening)", "Club"] as ClassType[]) {
    const last = history
      .filter(
        h =>
          h.class_type === type &&
          h.class_chapter &&
          h.class_chapter !== "N/A"
      )
      .sort((a, b) =>
        `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`)
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

  const cleanName = studentName.trim();

  // First check what course type the student makes and find student ID
  let studentId: string | null = null;
  let courseType = 'Native English';

  const { data: student } = await supabase
    .from('students')
    .select('id, course_type')
    .ilike('student_name', cleanName)
    .maybeSingle();

  if (student) {
    studentId = student.id;
    courseType = student.course_type || 'Native English';
  } else {
    const { data: fallbackStudent } = await supabase
      .from('students')
      .select('id, course_type')
      .or(`student_name.ilike.%${cleanName}%,student_name.eq.${cleanName}`)
      .limit(1)
      .maybeSingle();
    if (fallbackStudent) {
      studentId = fallbackStudent.id;
      courseType = fallbackStudent.course_type || 'Native English';
    }
  }

  if (courseType === 'Conversation Club') {
    return 'Club';
  }
  
  const now = new Date();
  // Using weekStartsOn: 1 (Monday) as typical for work/school weeks
  const start = startOfWeek(now, { weekStartsOn: 1 }).toISOString().split('T')[0];
  const end = endOfWeek(now, { weekStartsOn: 1 }).toISOString().split('T')[0];

  const { data: classes } = await supabase
    .from("classes")
    .select("class_type, class_chapter, class_level, date, time")
    .or(`student_name.ilike.%${cleanName}%,student_name.eq.${cleanName}`)
    .not("class_grade", "is", null);

  if (!classes || classes.length === 0) {
    return 'Grammar';
  }

  // Check for Exam requirement
  const grammarClasses = classes.filter(c => c.class_type === 'Grammar');
  const examClasses = classes.filter(c => c.class_type === 'Exam');
  
  grammarClasses.sort((a, b) => `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`));
  examClasses.sort((a, b) => `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`));
  
  const lastGrammar = grammarClasses[0];
  const lastExam = examClasses[0];

  if (lastGrammar) {
    if (lastGrammar.class_chapter === '5' || lastGrammar.class_chapter === '10') {
      const cleanTime = (lastGrammar.time || '00:00').trim();
      const timePart = cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
      const grammarDateTimeMs = new Date(`${lastGrammar.date}T${timePart}`).getTime();

      let examDateTimeMs = 0;
      if (lastExam) {
        const examCleanTime = (lastExam.time || '00:00').trim();
        const examTimePart = examCleanTime.length === 5 ? `${examCleanTime}:00` : examCleanTime;
        examDateTimeMs = new Date(`${lastExam.date}T${examTimePart}`).getTime();
      }

      // Check if there is a completed or bypassed online exam submission
      let hasCompletedSubmission = false;

      if (studentId) {
        const { data: submissions, error: subError } = await supabase
          .from('exam_submissions')
          .select('id, exam_id, completed_at, score, answers_json, exams(id, chapter_number, level)')
          .eq('student_id', studentId)
          .not('completed_at', 'is', null);

        if (subError) {
          console.error('Error fetching exam submissions in fetchUpcomingClassType:', subError);
        }

        if (submissions && submissions.length > 0) {
          const targetExamChapterNumber = lastGrammar.class_chapter === '5' ? 1 : 2;
          const ONE_DAY_MS = 24 * 60 * 60 * 1000;

          hasCompletedSubmission = submissions.some(sub => {
            if (!sub.completed_at) return false;

            // 1. Explicit milestone match (Exam 1 for Ch 5, Exam 2 for Ch 10)
            const examObj = (sub as any).exams;
            if (examObj?.chapter_number === targetExamChapterNumber) {
              if (!examObj.level || !lastGrammar.class_level || examObj.level.toLowerCase() === lastGrammar.class_level.toLowerCase()) {
                return true;
              }
            }

            // 2. Bypassed / Canceled by teacher flag
            const answers = sub.answers_json;
            if (answers && typeof answers === 'object') {
              if (answers.bypassed === true) return true;
              const notes = String(answers.notes || '').toLowerCase();
              if (notes.includes('bypassed') || notes.includes('canceled') || notes.includes('cancelled')) {
                return true;
              }
            }

            // 3. Completed on or after grammar class date (with 24h timezone margin)
            const subTimeMs = new Date(sub.completed_at).getTime();
            if (!isNaN(subTimeMs) && !isNaN(grammarDateTimeMs)) {
              if (subTimeMs >= grammarDateTimeMs - ONE_DAY_MS) {
                return true;
              }
            } else if (!isNaN(subTimeMs) && sub.completed_at.slice(0, 10) >= lastGrammar.date) {
              return true;
            }

            return false;
          });
        }
      }

      // If there is no in-person exam class AND no completed/bypassed online exam after chapter 5 or 10, next MUST be Exam
      const hasValidExamClass = lastExam && examDateTimeMs >= grammarDateTimeMs;
      if (!hasCompletedSubmission && !hasValidExamClass) {
        return 'Exam';
      }
    }
  }

  // Normal alternating logic for this week
  const weeklyClasses = classes.filter(c => c.date >= start && c.date <= end && c.class_type !== 'Exam');

  if (weeklyClasses.length === 0) {
    return 'Grammar';
  }

  // Sort them so we see the most recent
  weeklyClasses.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  const lastWeeklyClassType = weeklyClasses[0].class_type;

  if (lastWeeklyClassType === 'Grammar') {
    return 'Reading';
  } else if (lastWeeklyClassType === 'Reading') {
    return 'Listening';
  } else if (lastWeeklyClassType === 'Club' || lastWeeklyClassType === 'Club (Listening)') {
    return 'Club (Reading)';
  } else if (lastWeeklyClassType === 'Club (Reading)') {
    return 'Club (Listening)';
  } else {
    return 'Grammar';
  }
}
