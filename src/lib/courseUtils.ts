import { supabase } from '@/lib/supabase';

export type ClassType = "Grammar" | "Entertainment" | "Club" | "Business";

export type NextChapterInfo = {
  chapter: number;
  level: string;
};

export const MAX_CHAPTERS: Record<ClassType, number> = {
  Grammar: 10,
  Entertainment: 20,
  Club: 20,
  Business: 20,
};

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

    const next = lastChapter + 1 > MAX_CHAPTERS[type] ? 1 : lastChapter + 1;

    nextChapters[type] = {
      chapter: next,
      level: last.class_level || "Beginner",
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
    .select("class_type")
    .eq("student_name", studentName)
    .gte("date", start)
    .lte("date", end)
    .not("class_grade", "is", null);

  if (!classes || classes.length === 0) {
    return 'Grammar';
  }

  const hasGradedGrammar = classes.some(c => c.class_type === 'Grammar');
  
  return hasGradedGrammar ? 'Entertainment' : 'Grammar';
}
