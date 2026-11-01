import { supabase } from '@/lib/supabase';
import { startOfWeek, endOfWeek } from 'date-fns';

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

export function cleanStudentName(rawName: string | null | undefined): string {
  if (!rawName) return '';
  let cleaned = String(rawName).trim();
  if (cleaned.includes(' - ')) {
    cleaned = cleaned.split(' - ')[0].trim();
  }
  cleaned = cleaned.replace(/['’]s\s+class\b/gi, '');
  cleaned = cleaned.replace(/\s+class$/gi, '');
  cleaned = cleaned.replace(/['’]s$/gi, '');
  cleaned = cleaned.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '');
  return cleaned.trim();
}

export interface ResolvedStudent {
  id: string;
  student_name: string;
  course_type?: string;
  email?: string;
}

export async function resolveStudent(rawName: string | null | undefined): Promise<ResolvedStudent | null> {
  const clean = cleanStudentName(rawName);
  if (!clean) return null;

  // 1. Direct case-insensitive match on student_name
  const { data: s1 } = await supabase
    .from('students')
    .select('id, student_name, course_type, email')
    .ilike('student_name', clean)
    .maybeSingle();

  if (s1?.id) return s1 as ResolvedStudent;

  // 2. Query students table for in-memory matching (handles typos, substrings, and "Sheeran" vs "Scheeren")
  const { data: allStudents } = await supabase
    .from('students')
    .select('id, student_name, course_type, email');

  if (!allStudents || allStudents.length === 0) return null;

  const target = clean.toLowerCase();
  const targetWords = target.split(/\s+/).filter(Boolean);

  // 2a. Exact trimmed match
  const exact = allStudents.find(s => (s.student_name || '').trim().toLowerCase() === target);
  if (exact) return exact as ResolvedStudent;

  // 2b. Substring match (either clean contains student_name or student_name contains clean)
  const sub = allStudents.find(s => {
    const sName = (s.student_name || '').trim().toLowerCase();
    return sName && (target.includes(sName) || sName.includes(target));
  });
  if (sub) return sub as ResolvedStudent;

  // 2c. First name + last name similarity (handles spelling variants e.g. Scheeren vs Sheeran)
  if (targetWords.length > 0) {
    const firstMatches = allStudents.filter(s => {
      const sWords = (s.student_name || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      return sWords.length > 0 && sWords[0] === targetWords[0];
    });

    if (firstMatches.length === 1) {
      return firstMatches[0] as ResolvedStudent;
    }

    if (firstMatches.length > 1 && targetWords.length > 1) {
      const targetLast = targetWords[targetWords.length - 1];
      const best = firstMatches.find(s => {
        const sWords = (s.student_name || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
        const sLast = sWords[sWords.length - 1];
        if (!sLast) return false;
        return (
          sLast.startsWith(targetLast.slice(0, 2)) ||
          targetLast.startsWith(sLast.slice(0, 2)) ||
          sLast.includes(targetLast) ||
          targetLast.includes(sLast)
        );
      });
      if (best) return best as ResolvedStudent;
    }
  }

  return null;
}

export async function fetchStudentNextChapters(
  studentName: string
): Promise<Partial<Record<ClassType, NextChapterInfo>>> {
  const cleanName = cleanStudentName(studentName);
  const safeName = cleanName.replace(/['"]/g, '');
  
  let { data: history } = await supabase
    .from("classes")
    .select("class_type, class_chapter, class_level, date, time")
    .ilike("student_name", `%${safeName}%`)
    .not("class_grade", "is", null);

  if ((!history || history.length === 0) && safeName.includes(' ')) {
    const firstName = safeName.split(' ')[0];
    const { data: fallbackHistory } = await supabase
      .from("classes")
      .select("class_type, class_chapter, class_level, date, time")
      .ilike("student_name", `%${firstName}%`)
      .not("class_grade", "is", null);
    history = fallbackHistory;
  }

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

export async function fetchUpcomingClassType(studentName: string): Promise<ClassType> {
  if (!studentName) return 'Grammar';

  const cleanName = cleanStudentName(studentName);
  const safeName = cleanName.replace(/['"]/g, '');

  // First check what course type the student makes and find student ID
  let studentId: string | null = null;
  let courseType = 'Native English';

  const resolved = await resolveStudent(cleanName);
  if (resolved) {
    studentId = resolved.id;
    courseType = resolved.course_type || 'Native English';
  }

  if (courseType === 'Conversation Club') {
    return 'Club';
  }
  
  const now = new Date();
  // Using weekStartsOn: 1 (Monday) as typical for work/school weeks
  const start = startOfWeek(now, { weekStartsOn: 1 }).toISOString().split('T')[0];
  const end = endOfWeek(now, { weekStartsOn: 1 }).toISOString().split('T')[0];

  let { data: classes } = await supabase
    .from("classes")
    .select("class_type, class_chapter, class_level, date, time")
    .ilike("student_name", `%${safeName}%`)
    .not("class_grade", "is", null);

  if ((!classes || classes.length === 0) && safeName.includes(' ')) {
    const firstName = safeName.split(' ')[0];
    const { data: fallbackClasses } = await supabase
      .from("classes")
      .select("class_type, class_chapter, class_level, date, time")
      .ilike("student_name", `%${firstName}%`)
      .not("class_grade", "is", null);
    classes = fallbackClasses;
  }

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
