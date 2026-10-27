import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Calendar, Users, MessageSquare, BookOpen, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { toLocalDate, formatClassTime, getTimeZoneLabel } from "@/lib/dateUtils"
import { ReadOnlyCalendar } from "@/components/calendar/ReadOnlyCalendar"
import { NotificationIncentiveBanner } from "@/components/notifications/NotificationIncentiveBanner"
import { NativeQuestLeaderboardCard } from "@/components/grammar-rush/NativeQuestLeaderboardCard"

export default function TeacherDashboard() {
    const { user, teacherName } = useAuth()
    const [loading, setLoading] = useState(true)

    const [nextClass, setNextClass] = useState<any | null>(null)
    const [unreadMessages, setUnreadMessages] = useState<number>(0)
    const [totalStudents, setTotalStudents] = useState<number>(0)

    // Weekly Confirmation State
    const [needsConfirmation, setNeedsConfirmation] = useState(false)
    const [weekClassCount, setWeekClassCount] = useState(0)
    const [weekStartDateStr, setWeekStartDateStr] = useState("")
    const [teacherDbId, setTeacherDbId] = useState<string | null>(null)
    const [confirming, setConfirming] = useState(false)

    useEffect(() => {
        async function fetchDashboardData() {
            if (!teacherName || !user?.id) return

            // 1. Next Class
            const todayStr = new Date().toISOString().split("T")[0]

            const { data: teacherData } = await supabase
                .from('teachers')
                .select('id')
                .eq('name', teacherName)
                .maybeSingle()

            const teacherId = teacherData?.id
            setTeacherDbId(teacherId || null)

            // 1.5. Check Weekly Confirmation
            if (teacherId) {
                const todayDate = new Date()
                const dayOfWeek = todayDate.getDay() // 0 is Sunday, 5 is Friday, 6 is Saturday
                
                // Find Monday of the CURRENT week
                const currentMonday = new Date(todayDate)
                const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
                currentMonday.setDate(currentMonday.getDate() - diffToMonday)
                currentMonday.setHours(0,0,0,0)

                let targetWeekStart = new Date(currentMonday)

                let schoolNow = todayDate;
                try {
                    schoolNow = new Date(todayDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
                } catch {
                    schoolNow = todayDate;
                }

                // If Mon-Thu, or Friday before 9:00 PM (21:00), the current week's classes are still ongoing.
                // Therefore, target the PREVIOUS week.
                // Starting Friday at 9:00 PM (21:00) through Sunday, all weekly classes have finished.
                const isFridayBeforeNight =
                    (dayOfWeek === 5 && todayDate.getHours() < 21) ||
                    (schoolNow.getDay() === 5 && schoolNow.getHours() < 21);

                const isBeforeFridayNight =
                    (dayOfWeek >= 1 && dayOfWeek <= 4) || isFridayBeforeNight;

                if (isBeforeFridayNight) {
                    targetWeekStart.setDate(targetWeekStart.getDate() - 7);
                }

                const targetMondayStr = format(targetWeekStart, 'yyyy-MM-dd')
                setWeekStartDateStr(targetMondayStr)

                const { data: existingConfirmation } = await supabase
                    .from('teacher_weekly_confirmations')
                    .select('id')
                    .eq('teacher_id', teacherId)
                    .eq('week_start_date', targetMondayStr)
                    .maybeSingle()

                if (!existingConfirmation) {
                    const targetSunday = new Date(targetWeekStart)
                    targetSunday.setDate(targetSunday.getDate() + 6)
                    const targetSundayStr = format(targetSunday, 'yyyy-MM-dd')

                    const { data: weekClassesRaw } = await supabase
                        .from('classes')
                        .select('id, title, student_name, date, time, class_grade, is_absent')
                        .gte('date', targetMondayStr)
                        .lte('date', targetSundayStr)
                        .or(`title.eq.${teacherName},title.ilike.%- ${teacherName}%`)

                    if (weekClassesRaw && weekClassesRaw.length > 0) {
                        const sessionsMap: Record<string, { is_graded: boolean }> = {}

                        for (const cls of weekClassesRaw) {
                            // Verify teacher name match just like Admin payments
                            const title = cls.title || ''
                            const parts = title.split(' - ')
                            const teacherNameFromTitle = parts.length > 1 ? parts[1].trim().toLowerCase() : title.toLowerCase()
                            
                            if (teacherName && !teacherNameFromTitle.includes(teacherName.toLowerCase())) {
                                continue
                            }

                            const key = `${cls.date}_${cls.time}_${cls.title || cls.student_name}`
                            if (!sessionsMap[key]) {
                                sessionsMap[key] = { is_graded: false }
                            }
                            if (cls.class_grade !== null) {
                                sessionsMap[key].is_graded = true
                            }
                        }

                        let gradedCount = 0
                        for (const session of Object.values(sessionsMap)) {
                            if (session.is_graded) gradedCount++
                        }

                        setWeekClassCount(gradedCount)
                        setNeedsConfirmation(true)
                    }
                }
            }

            // Legacy query for old classes without teacher_id.
            let legacyList: any[] = []
            const { data } = await supabase
                .from('classes')
                .select('*')
                .gte('date', todayStr)
                .or(`title.eq.${teacherName},title.ilike.%- ${teacherName}%`)
                .order('date', { ascending: true })
                .order('time', { ascending: true })
                .limit(15)

            legacyList = data || []

            // Relational query (Skipped to prevent 400 errors)
            let relationalList: any[] = []

            // Combine and parse to find the earliest
            const getMinutes = (tStr: string) => {
                if (!tStr) return 0
                if (tStr.includes('T')) {
                    const d = new Date(tStr)
                    return d.getHours() * 60 + d.getMinutes()
                }
                const [h, m] = tStr.split(':').map(Number)
                return (h || 0) * 60 + (m || 0)
            }

            const normalized = [
                ...(legacyList || []),
                ...relationalList.map(cls => ({
                    ...cls,
                    student_name: cls.class_assignments?.map((a: any) => a.students?.student_name).filter(Boolean).join(', ') || 'Unknown Student',
                    time: cls.start_time || cls.time
                }))
            ]

            // Group into unique class blocks based on title/date/time
            const groupedMap = new Map()
            normalized.forEach(item => {
                const key = `${item.date}|${item.time}|${item.title}`
                if (groupedMap.has(key)) {
                    const existing = groupedMap.get(key)
                    if (item.student_name && !existing.student_names.includes(item.student_name)) {
                        existing.student_names.push(item.student_name)
                    }
                } else {
                    groupedMap.set(key, {
                        ...item,
                        student_names: item.student_name ? [item.student_name] : []
                    })
                }
            })
            
            const groupedNormalized = Array.from(groupedMap.values())

            if (groupedNormalized.length > 0) {
                groupedNormalized.sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date)
                    return getMinutes(a.time) - getMinutes(b.time)
                })

                // Find the first class that hasn't finished yet (assuming 1hr duration)
                const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
                const upcomingClass = groupedNormalized.find(cls => {
                    if (cls.date > todayStr) return true;
                    if (cls.date === todayStr) {
                         // Keep showing it if it started less than 60 mins ago
                         return getMinutes(cls.time) + 60 >= nowMins;
                    }
                    return false;
                })

                setNextClass(upcomingClass || null)
            } else {
                setNextClass(null)
            }

            // 2. Unread Messages
            const { count: msgCount } = await supabase
                .from("messages")
                .select("*", { count: "exact", head: true })
                .eq("receiver_id", user.id)
                .eq("is_read", false)
            setUnreadMessages(msgCount || 0)

            // 3. Students
            let relationalStudentNames: string[] = []

            let legacyStudentNames: string[] = []
            const { data: legacyClassesForStudents } = await supabase
                .from('classes')
                .select('student_name')
                .or(`title.eq.${teacherName},title.ilike.%- ${teacherName}%`)

            if (legacyClassesForStudents) {
                legacyStudentNames = legacyClassesForStudents.map((c: any) => c.student_name).filter(Boolean)
            }

            const uniqueStudentNames = new Set([...relationalStudentNames, ...legacyStudentNames])
            setTotalStudents(uniqueStudentNames.size)

            setLoading(false)
        }

        fetchDashboardData()

        // Realtime Listener for Unread Messages
        if (user?.id) {
            const channel = supabase
                .channel('dashboard_teacher_messages')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` },
                    () => {
                        // Re-fetch count when something changes
                        supabase
                            .from("messages")
                            .select("*", { count: "exact", head: true })
                            .eq("receiver_id", user.id)
                            .eq("is_read", false)
                            .then(({ count }) => {
                                setUnreadMessages(count || 0)
                            })
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [teacherName, user?.id])

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardContent className="h-32 mt-4 bg-muted rounded" />
                    </Card>
                ))}
            </div>
        )
    }

    const handleConfirmWeeklyClasses = async () => {
        if (!teacherDbId || !weekStartDateStr) return
        setConfirming(true)
        try {
            const { error } = await supabase.from('teacher_weekly_confirmations').insert({
                teacher_id: teacherDbId,
                week_start_date: weekStartDateStr,
                classes_count: weekClassCount
            })
            if (error) throw error
            setNeedsConfirmation(false)
        } catch (error) {
            console.error('Error confirming classes:', error)
        } finally {
            setConfirming(false)
        }
    }

    return (
        <div className="space-y-6 animate-fade-in pb-8">
            <NotificationIncentiveBanner />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* SCHEDULE COMPACT VIEW */}
                <Card className="flex flex-col">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <CardTitle className="flex items-center gap-3 text-lg">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400/20 to-blue-600/20 border border-sky-400/30 flex items-center justify-center text-primary shadow-sm">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <span>This Week's Schedule</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 gap-4">
                        <div className="rounded-2xl border border-white/50 dark:border-white/10 overflow-hidden flex-1 bg-white/30 dark:bg-slate-950/20">
                            <ReadOnlyCalendar role="teacher" identifier={teacherName || ''} compact={true} />
                        </div>
                        <Button asChild className="w-full font-semibold">
                            <Link to="/teacher/schedule">View Full Schedule</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* MESSAGES CARD */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3 text-lg">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400/20 to-purple-600/20 border border-indigo-400/30 flex items-center justify-center text-primary shadow-sm">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <span>Messages</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 justify-between gap-4">
                        {unreadMessages > 0 ? (
                            <div className="bg-emerald-500/10 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between border border-emerald-500/25">
                                <div>
                                    <p className="font-bold text-emerald-600 dark:text-emerald-400">New Messages</p>
                                    <p className="text-sm text-muted-foreground">
                                        You have {unreadMessages} unread message{unreadMessages !== 1 ? 's' : ''}.
                                    </p>
                                </div>
                                <div className="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-[0_4px_12px_rgba(16,185,129,0.4)]">
                                    {unreadMessages}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center flex-1 min-h-[7rem] liquid-glass-pill rounded-2xl text-center p-5">
                                <MessageSquare className="h-6 w-6 text-primary/70 mb-2" />
                                <p className="text-sm font-medium text-muted-foreground">All caught up! No new messages.</p>
                            </div>
                        )}
                        <Button asChild className={unreadMessages > 0 ? "w-full bg-emerald-500 hover:bg-emerald-600 text-white" : "w-full"} variant={unreadMessages > 0 ? "default" : "outline"}>
                            <Link to="/teacher/messages">Open Messages</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* STUDENTS CARD */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3 text-lg">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-600/20 border border-emerald-400/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                                <Users className="h-5 w-5" />
                            </div>
                            <span>Students &amp; Native Quest Progress</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                        <div className="liquid-glass-pill rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-primary font-bold text-xl">👥</span>
                            </div>
                            <div>
                                <p className="font-bold text-sm text-foreground">Student 360° Cards &amp; Native Quest</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    View your students&apos; course progress, exams, class history, and Native Quest game mastery
                                </p>
                            </div>
                        </div>
                        <Button asChild variant="outline" className="w-full">
                            <Link to="/teacher/students">View Student Cards</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* MATERIALS CARD */}
                <Card className="flex flex-col">
                    <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-3 text-lg">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <span>Materials</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                        <div className="liquid-glass-pill rounded-2xl p-4">
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                Access your class materials, books, audio tracks, and teaching resources in one place.
                            </p>
                        </div>
                        <Button asChild variant="outline" className="w-full">
                            <Link to="/teacher/materials">Open Materials</Link>
                        </Button>
                    </CardContent>
                </Card>

            </div>

            {/* HIGH-VISIBILITY NATIVE QUEST WEEKLY RANKING */}
            <NativeQuestLeaderboardCard
                showSocialMediaButton={true}
                title="Native Quest Weekly Ranking"
                subtitle="See how students are ranking this week across Grammar & Speaking quests!"
            />
        </div>
    )
}
