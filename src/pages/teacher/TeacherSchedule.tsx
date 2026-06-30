import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Link } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { toLocalDate, getTimeZoneLabel } from "@/lib/dateUtils"
import { fetchUpcomingClassType, ClassType, getNextLevel } from "@/lib/courseUtils"
import { UnlockExamDialog } from "@/components/UnlockExamDialog"

/* ---------------------------------------------
   Types
--------------------------------------------- */

import { format } from "date-fns"

type ClassRow = {
  id: number
  student_name: string
  title: string
  date: string
  time: string
  classroom_link?: string | null
  class_grade?: number | null
  is_absent?: boolean | null
}

type HistoryRow = {
  student_name: string
  class_type: ClassType | null
  class_chapter: string | null
  class_level: string | null
  date: string
  time: string
}

type NextChapterInfo = {
  chapter: number
  level: string
}

type EnrichedClass = ClassRow & {
  studentChapters: Record<string, Partial<Record<ClassType, NextChapterInfo>>>
  upcomingClassTypes: Record<string, ClassType | undefined>
  _localDate: Date
  student_names: string[]
  group_classes: ClassRow[]
  studentNotes: Record<string, string>
}

/* ---------------------------------------------
   Constants
--------------------------------------------- */

const MAX_CHAPTERS: Record<ClassType, number> = {
  Grammar: 10,
  Entertainment: 20,
  Club: 20,
  Business: 20,
  Exam: 99,
}

/* ---------------------------------------------
   Component
--------------------------------------------- */

export default function TeacherSchedule() {
  const { teacherName, loading: authLoading } = useAuth()

  const [classes, setClasses] = useState<EnrichedClass[]>([])
  const [loading, setLoading] = useState(true)

  /* ---------------------------------------------
     Load schedule when teacher is known
  --------------------------------------------- */

  useEffect(() => {
    if (!teacherName) return
    loadSchedule(teacherName)
  }, [teacherName])

  async function loadSchedule(teacherName: string) {
    setLoading(true)

    const today = new Date()
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const todayStr = format(today, "yyyy-MM-dd");
    const nextWeekStr = format(nextWeek, "yyyy-MM-dd");

    // 0. Get Teacher ID from name
    const { data: teacherData } = await supabase
      .from('teachers')
      .select('id')
      .ilike('name', teacherName)
      .maybeSingle();

    const teacherId = teacherData?.id;

    /* 1️⃣ Upcoming classes for THIS teacher (Legacy + Relational) */

    // A. Legacy
    let legacy: any[] = []
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .gte("date", todayStr)
      .lte("date", nextWeekStr) // Limit to 7 days
      .or(`title.eq.${teacherName},title.ilike.%- ${teacherName}%`)
      .order("date", { ascending: true })
      .order("time", { ascending: true })

    if (error) console.error(error)
    legacy = data || []

    // B. New Relational (Skipped to prevent 400 errors since DB lacks teacher_id and class_assignments)
    let relational: any[] = [];

    // Helper: Parse to minutes for sorting/dedup
    const getMinutes = (cls: any) => {
      let tStr = cls.start_time || cls.time || "00:00";
      if (tStr.includes('T')) {
        // ISO Date: Extract time part
        // Assumption: We want strict HH:mm visual time regardless of TZ, or Local?
        // "12:00" legacy is usually local.
        // Let's try to extract HH:mm substring if it exists, or Date parse
        const d = new Date(tStr);
        return d.getHours() * 60 + d.getMinutes();
      }
      // "HH:mm" or "HH:mm:ss"
      const [h, m] = tStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const formatTime = (minutes: number) => {
      const h = Math.floor(minutes / 60).toString().padStart(2, '0');
      const m = (minutes % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    // 1. Normalize All
    const normalized = [
      ...(legacy || []),
      ...relational.map(cls => ({
        ...cls,
        student_name: cls.class_assignments?.map((a: any) => a.students?.student_name).filter(Boolean).join(', ') || 'Unknown Student',
        time: cls.start_time || cls.time
      }))
    ].map(cls => {
      const mins = getMinutes(cls);
      return {
        ...cls,
        _minutes: mins,
        _cleanTime: formatTime(mins),
        _cleanDate: cls.date // YYYY-MM-DD
      };
    });

    // 2. Group overlapping students into single class blocks
    // Key: Date + Time(HH:mm) + Title (fallback to student name if title empty)
    const uniqueMap = new Map();
    normalized.forEach(item => {
      const titleKey = item.title ? item.title.trim() : item.student_name.trim();
      const key = `${item._cleanDate}|${item._cleanTime}|${titleKey.toLowerCase()}`;

      if (uniqueMap.has(key)) {
        const existing = uniqueMap.get(key);
        // Add student entry logic gracefully
        if (item.student_name && !existing.student_names.includes(item.student_name)) {
          existing.student_names.push(item.student_name);
          existing.group_classes.push(item);
        }
      } else {
        uniqueMap.set(key, { ...item, student_names: item.student_name ? [item.student_name] : [], group_classes: [item] });
      }
    });

    // 3. Sort Combined (Date -> Time)
    const combined = Array.from(uniqueMap.values()).sort((a, b) => {
      if (a._cleanDate !== b._cleanDate) {
        return a._cleanDate.localeCompare(b._cleanDate);
      }
      return a._minutes - b._minutes;
    }).map(cls => ({
      ...cls,
      time: cls._cleanTime // Force display to match sort
    }));

    const studentNames = Array.from(
      new Set(combined.flatMap(c => c.student_names?.length > 0 ? c.student_names : [c.student_name]))
    )

    /* 2️⃣ Past graded history (Legacy logic) */
    // Note: This logic might be imperfect for multi-student strings ("Alice, Bob"), 
    // but preserving strict legacy behavior for single names is safer than breaking it.
    const { data: history } = await supabase
      .from("classes")
      .select("student_name, class_type, class_chapter, class_level, date, time, notes")
      .in("student_name", studentNames)
      .not("class_grade", "is", null)

    /* 3️⃣ Enrich classes with next chapters */
    const enriched = combined.map(cls => {
      const actualStudents = cls.student_names?.length > 0 ? cls.student_names : [cls.student_name];
      const studentChapters: Record<string, Partial<Record<ClassType, NextChapterInfo>>> = {};

      for (const student of actualStudents) {
        const studentHistory = history?.filter(h => h.student_name === student) ?? [];
        const nextChapters: Partial<Record<ClassType, NextChapterInfo>> = {};

        for (const type of ["Grammar", "Entertainment", "Club", "Business"] as ClassType[]) {
          const last = studentHistory
            .filter(
              h =>
                h.class_type === type &&
                h.class_chapter &&
                h.class_chapter !== "N/A"
            )
            .sort(
              (a, b) =>
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
        studentChapters[student] = nextChapters;
      }

      const studentNotes: Record<string, string> = {}
      for (const student of actualStudents) {
        const studentHistoryWithNotes = history?.filter(h => h.student_name === student && h.notes) ?? []
        // Sort to get the most recent class with notes
        const lastClassWithNotes = studentHistoryWithNotes.sort(
            (a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
        )[0]
        if (lastClassWithNotes && lastClassWithNotes.notes) {
            studentNotes[student] = lastClassWithNotes.notes
        }
      }

      const _localDate = toLocalDate(cls.date, cls.time)
      return { ...cls, studentChapters, _localDate, studentNotes }
    })

    // Fetch upcoming types for each unique student efficiently
    const upcomingTypes: Record<string, ClassType> = {}
    await Promise.all(studentNames.map(async name => {
      if (name) {
        upcomingTypes[name] = await fetchUpcomingClassType(name)
      }
    }))

    const finalEnriched: EnrichedClass[] = enriched.map(cls => {
      const actualStudents = cls.student_names?.length > 0 ? cls.student_names : [cls.student_name];
      const classUpcomingTypes: Record<string, ClassType | undefined> = {};
      
      for (const student of actualStudents) {
        classUpcomingTypes[student] = upcomingTypes[student];
      }

      return {
        ...cls,
        upcomingClassTypes: classUpcomingTypes
      };
    })

    setClasses(finalEnriched)
    setLoading(false)
  }

  /* ---------------------------------------------
     Group by weekday (Sorted)
  --------------------------------------------- */

  const grouped = useMemo(() => {
    const map: Record<string, EnrichedClass[]> = {}
    const dateMap: Record<string, string> = {} // DayName -> DateStr mapping for sorting

    for (const cls of classes) {
      // Group by LOCAL date
      const weekday = format(cls._localDate, "EEEE") // e.g. "Monday"

      if (!map[weekday]) {
        map[weekday] = []
        dateMap[weekday] = format(cls._localDate, "yyyy-MM-dd")
      }
      map[weekday].push(cls)
    }

    // Sort days by earliest date
    return Object.entries(map).sort((a, b) => {
      return dateMap[a[0]].localeCompare(dateMap[b[0]]);
    });
  }, [classes])


  /* ---------------------------------------------
     Render guards
  --------------------------------------------- */

  if (authLoading || loading) {
    return <p className="text-muted-foreground">Loading schedule…</p>
  }

  /* ---------------------------------------------
     Render
  --------------------------------------------- */

  return (
    <div className="space-y-8">


      {grouped.map(([day, dayClasses]) => (
        <div key={day}>
          <h2 className="text-lg font-semibold mb-4">{day}</h2>

          <div className="space-y-4">
            {dayClasses.map(cls => (
              <div
                key={cls.id || cls.student_name + cls.time}
                className="rounded-xl border bg-card text-card-foreground p-5 shadow-sm flex justify-between"
              >
                <div>
                  <h3 className="font-semibold text-lg">
                    {cls.title && cls.title.includes(' - ') 
                      ? cls.title.split(' - ')[0] 
                      : `${cls.student_names?.length > 0 ? cls.student_names.join(', ') : cls.student_name}'s class`}
                  </h3>
                  <p className="text-sm font-medium text-foreground/80 my-1">
                    Students: {cls.student_names?.join(', ') || cls.student_name}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    class at {format(cls._localDate, "HH:mm")}
                    <span className="text-xs opacity-70">({getTimeZoneLabel()})</span>
                  </p>

                  <div className="mt-3 space-y-3">
                    {(cls.student_names?.length > 0 ? cls.student_names : [cls.student_name]).map((student) => {
                      const upType = cls.upcomingClassTypes?.[student];
                      const sChaps = cls.studentChapters?.[student] || {};
                      const isMulti = (cls.student_names?.length || 0) > 1;
                      
                      return (
                        <div key={student} className="flex flex-col gap-1.5">
                           {isMulti && <span className="text-xs font-semibold text-muted-foreground uppercase">{student.split(' ')[0]}</span>}
                           <div className="flex flex-wrap gap-2">
                             {upType && (
                               <Badge variant={upType === 'Grammar' ? 'default' : (upType === 'Exam' ? 'destructive' : 'secondary')} className="uppercase">
                                 {upType}
                               </Badge>
                             )}
                             {upType !== 'Exam' && Object.entries(sChaps).map(
                               ([type, info]) =>
                                 info && (
                                   <Badge key={type} variant="secondary">
                                     {type}: Chapter {info.chapter} ({info.level})
                                   </Badge>
                                 )
                             )}
                           </div>
                        </div>
                      );
                    })}
                  </div>

                  {Object.keys(cls.studentNotes || {}).length > 0 && (
                    <div className="mt-4 space-y-2 border-t pt-3 border-border/50">
                      {Object.entries(cls.studentNotes).map(([student, notes]) => (
                        <div key={student} className="text-sm bg-muted/50 p-3 rounded-md">
                          <span className="font-semibold text-primary">{student.split(' ')[0]}'s last feedback:</span>
                          <p className="text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">{notes}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-[140px] items-end justify-center">
                  {(cls.group_classes || []).map((studentCls: any) => (
                    <div key={studentCls.id} className="flex flex-col gap-2 w-full">
                      {studentCls.class_grade !== null || studentCls.is_absent ? (
                        <Link to={`/teacher/grade?class=${studentCls.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className={
                              studentCls.is_absent 
                                ? "w-full border-red-600 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-950/30"
                                : "w-full border-green-600 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-400 dark:hover:bg-green-950/30"
                            }
                          >
                            ✓ {studentCls.student_name.split(' ')[0]}
                          </Button>
                        </Link>
                      ) : (
                        <Link to={`/teacher/grade?class=${studentCls.id}`}>
                          <Button size="sm" className="w-full">
                            Grade {studentCls.student_name.split(' ')[0]}
                          </Button>
                        </Link>
                      )}

                      {/* EXAM UNLOCK BUTTON */}
                      {cls.upcomingClassTypes?.[studentCls.student_name] === 'Exam' && (
                        <UnlockExamDialog 
                          studentName={studentCls.student_name} 
                          variant="destructive"
                          size="sm"
                          className="w-full"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
