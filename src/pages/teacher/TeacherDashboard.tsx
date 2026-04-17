import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Calendar, Users, MessageSquare, BookOpen, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { toLocalDate, formatClassTime, getTimeZoneLabel } from "@/lib/dateUtils"

export default function TeacherDashboard() {
    const { user, teacherName } = useAuth()
    const [loading, setLoading] = useState(true)

    const [nextClass, setNextClass] = useState<any | null>(null)
    const [unreadMessages, setUnreadMessages] = useState<number>(0)
    const [totalStudents, setTotalStudents] = useState<number>(0)

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

            // Legacy query for old classes without teacher_id.
            let legacyList: any[] = []
            const { data } = await supabase
                .from('classes')
                .select('*')
                .gte('date', todayStr)
                .ilike('title', `%${teacherName}%`)
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

            if (normalized.length > 0) {
                normalized.sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date)
                    return getMinutes(a.time) - getMinutes(b.time)
                })

                // Find the first class that hasn't finished yet (assuming 1hr duration)
                const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
                const upcomingClass = normalized.find(cls => {
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
                .ilike('title', `%${teacherName}%`)

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

    return (
        <div className="space-y-8 animate-fade-in pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* NEXT CLASS CARD */}
                <Card className="shadow-sm hover:shadow-md transition flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Next Class
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 justify-between gap-4">
                        {nextClass ? (
                            <div className="space-y-3">
                                <p className="text-2xl font-bold">
                                    {(() => {
                                        const localDate = toLocalDate(nextClass.date, nextClass.time)
                                        return format(localDate, "EEEE, MMM d")
                                    })()}
                                </p>
                                <div className="space-y-1">
                                    <p className="text-lg font-semibold">{nextClass.student_name || nextClass.title}</p>
                                    <p className="text-primary font-medium flex items-center gap-2">
                                        at {formatClassTime(nextClass.date, nextClass.time)}
                                        <span className="text-xs text-muted-foreground font-normal">({getTimeZoneLabel()})</span>
                                    </p>
                                </div>

                                {nextClass.classroom_link && (
                                    <Button asChild className="w-full mt-2">
                                        <a href={nextClass.classroom_link} target="_blank" rel="noopener noreferrer">
                                            Enter Class <ExternalLink className="ml-2 h-4 w-4" />
                                        </a>
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center flex-1 h-24 bg-muted/20 rounded-lg border border-dashed">
                                <p className="text-muted-foreground">No upcoming classes</p>
                            </div>
                        )}
                        <Button asChild variant="outline" className="w-full">
                            <Link to="/teacher/schedule">View Full Schedule</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* MESSAGES CARD */}
                <Card className="shadow-sm hover:shadow-md transition flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            Messages
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col flex-1 justify-between gap-4">
                        {unreadMessages > 0 ? (
                            <div className="bg-green-500/10 p-4 rounded-lg flex items-center justify-between border border-green-500/20">
                                <div>
                                    <p className="font-semibold text-green-600">New Messages</p>
                                    <p className="text-sm text-muted-foreground">
                                        You have {unreadMessages} unread message{unreadMessages !== 1 ? 's' : ''}.
                                    </p>
                                </div>
                                <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                                    {unreadMessages}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center flex-1 h-24 bg-muted/20 rounded-lg border border-dashed text-center p-4">
                                <MessageSquare className="h-6 w-6 text-muted-foreground mb-2 opacity-50" />
                                <p className="text-sm text-muted-foreground">All caught up! No new messages.</p>
                            </div>
                        )}
                        <Button asChild className={unreadMessages > 0 ? "w-full bg-green-500 hover:bg-green-600 text-white" : "w-full"} variant={unreadMessages > 0 ? "default" : "outline"}>
                            <Link to="/teacher/messages">Open Messages</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* STUDENTS CARD */}
                <Card className="shadow-sm hover:shadow-md transition">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Students
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-primary font-bold text-xl">👥</span>
                            </div>
                            <div>
                                <p className="font-semibold">Student's previous classes</p>
                                <p className="text-sm text-muted-foreground">View your students' histories</p>
                            </div>
                        </div>
                        <Button asChild variant="outline" className="w-full">
                            <Link to="/teacher/students">View Directory</Link>
                        </Button>
                    </CardContent>
                </Card>

                {/* MATERIALS CARD */}
                <Card className="shadow-sm hover:shadow-md transition">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            Materials
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">Access your class materials, drive folders, and teaching resources.</p>
                        <Button asChild variant="outline" className="w-full">
                            <Link to="/teacher/materials">Open Materials</Link>
                        </Button>
                    </CardContent>
                </Card>

            </div>
        </div>
    )
}
