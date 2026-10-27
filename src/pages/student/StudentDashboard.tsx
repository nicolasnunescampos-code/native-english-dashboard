import React, { useEffect, useState } from "react"
import { supabase, Class, Payment, Announcement } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  MessageSquare,
  Zap,
  Trophy,
  Mic,
  Award,
  Star,
  Megaphone,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { format, parseISO, differenceInCalendarDays, startOfWeek } from "date-fns"
import {
  fetchStudentNextChapters,
  NextChapterInfo,
  ClassType,
  fetchUpcomingClassType,
} from "@/lib/courseUtils"
import { Link } from "react-router-dom"
import { ReadOnlyCalendar } from "@/components/calendar/ReadOnlyCalendar"
import { NotificationIncentiveBanner } from "@/components/notifications/NotificationIncentiveBanner"
import { CompactNativeQuestRankCard } from "@/components/grammar-rush/CompactNativeQuestRankCard"

const TOTAL_COURSE_CLASSES = 160

const extractTeacherName = (title: string) => {
  if (!title) return ""
  if (!title.includes(" - ")) return title
  const parts = title.split(" - ")
  return parts.length > 1 ? parts[1].trim() : ""
}

const formatOrdinalDay = (day: number) => {
  const j = day % 10
  const k = day % 100
  if (j === 1 && k !== 11) return `${day}st`
  if (j === 2 && k !== 12) return `${day}nd`
  if (j === 3 && k !== 13) return `${day}rd`
  return `${day}th`
}

const StudentDashboard: React.FC = () => {
  const { studentName, user } = useAuth()

  const [nextClass, setNextClass] = useState<Class | null>(null)
  const [nextChapters, setNextChapters] = useState<
    Partial<Record<ClassType, NextChapterInfo>>
  >({})
  const [upcomingClassType, setUpcomingClassType] = useState<ClassType | null>(
    null
  )
  const [upcomingExamCompleted, setUpcomingExamCompleted] = useState(false)
  const [lastClass, setLastClass] = useState<Class | null>(null)
  const [pendingPayment, setPendingPayment] = useState<Payment | null>(null)
  // Default payment due day is the 5th of each month unless overridden in student profile
  const [paymentDueDay, setPaymentDueDay] = useState<number>(5)
  const [latestAnnouncement, setLatestAnnouncement] =
    useState<Announcement | null>(null)
  const [announcementDismissed, setAnnouncementDismissed] =
    useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [unreadMessages, setUnreadMessages] = useState(0)

  // Performance & Progress Hub Metrics
  const [completedClassesCount, setCompletedClassesCount] = useState<number>(0)
  const [overallGradeAvg, setOverallGradeAvg] = useState<number>(0)
  const [grammarWeeklyBest, setGrammarWeeklyBest] = useState<number>(0)
  const [grammarAvgAccuracy, setGrammarAvgAccuracy] = useState<number>(0)
  const [speakingAvgScore, setSpeakingAvgScore] = useState<number>(0)
  const [speakingTotalAttempts, setSpeakingTotalAttempts] = useState<number>(0)

  useEffect(() => {
    if (!studentName || !user?.email) {
      setLoading(false)
      return
    }
    const userEmail = user.email

    const loadDashboard = async () => {
      const today = format(new Date(), "yyyy-MM-dd")
      let studentId = ""

      // 0. Fetch Student ID and Settings
      const { data: studentData } = await supabase
        .from("students")
        .select("id, payment_due_day")
        .ilike("email", userEmail!)
        .maybeSingle()

      if (studentData) {
        studentId = studentData.id
        setPaymentDueDay(studentData.payment_due_day || 5)
      }

      // NEXT CLASS (Legacy + Relational)
      let nextClassData: any = null

      const { data: legacyNext } = await supabase
        .from("classes")
        .select("*")
        .ilike("student_name", `%${studentName}%`)
        .gte("date", today)
        .order("date", { ascending: true })
        .order("time", { ascending: true })
        .limit(15)

      let relationalNext: any[] = []
      if (studentId) {
        const { data: newClasses } = await supabase
          .from("classes")
          .select(
            `
            *,
            class_assignments!inner(student_id)
          `
          )
          .eq("class_assignments.student_id", studentId)
          .gte("date", today)
          .order("date", { ascending: true })
          .limit(15)

        if (newClasses) {
          relationalNext = newClasses.map((cls: any) => ({
            ...cls,
            time: cls.start_time || cls.time,
            title: cls.title,
            link_url: cls.link_url,
          }))
        }
      }

      const allClasses = [...(legacyNext || []), ...relationalNext]

      const getMinutes = (tStr: string) => {
        if (!tStr) return 0
        if (tStr.includes("T")) {
          const d = new Date(tStr)
          return d.getHours() * 60 + d.getMinutes()
        }
        const [h, m] = tStr.split(":").map(Number)
        return (h || 0) * 60 + (m || 0)
      }

      if (allClasses.length > 0) {
        const uniqueClasses = Array.from(
          new Map(allClasses.map((item) => [item.id, item])).values()
        )

        uniqueClasses.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date)
          return getMinutes(a.time) - getMinutes(b.time)
        })

        const nowMins = new Date().getHours() * 60 + new Date().getMinutes()
        const upcomingClass = uniqueClasses.find((cls) => {
          if (cls.date > today) return true
          if (cls.date === today) {
            return getMinutes(cls.time) + 60 >= nowMins
          }
          return false
        })

        nextClassData = upcomingClass || null
      }

      setNextClass(nextClassData)

      const chapters = await fetchStudentNextChapters(studentName)
      setNextChapters(chapters)

      const upcomingType = await fetchUpcomingClassType(studentName)
      setUpcomingClassType(upcomingType)

      let isExamCompleted = false
      if (studentId && upcomingType === "Exam") {
        const { data: subs } = await supabase
          .from("exam_submissions")
          .select("completed_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(1)

        if (subs && subs.length > 0 && subs[0].completed_at) {
          isExamCompleted = true
        }
      }
      setUpcomingExamCompleted(isExamCompleted)

      // GRADED CLASSES FOR COURSE COMPLETION & OVERALL GRADE AVG
      const { data: gradedClasses } = await supabase
        .from("classes")
        .select(
          "id, class_grade, speaking_grade, listening_grade, grammar_grade, reading_grade, is_absent, class_level, class_chapter, date"
        )
        .ilike("student_name", `%${studentName}%`)
        .or(
          "speaking_grade.not.is.null,class_grade.not.is.null,grammar_grade.not.is.null,reading_grade.not.is.null,listening_grade.not.is.null"
        )
        .order("date", { ascending: false })

      const validCompleted = (gradedClasses || []).filter(
        (c: any) => !c.is_absent
      )
      setCompletedClassesCount(validCompleted.length)
      if (validCompleted.length > 0) {
        setLastClass(validCompleted[0] as Class)
        const gradesPool: number[] = []
        validCompleted.forEach((cls: any) => {
          if (cls.speaking_grade != null) gradesPool.push(cls.speaking_grade)
          if (cls.listening_grade != null) gradesPool.push(cls.listening_grade)
          if (cls.grammar_grade != null) gradesPool.push(cls.grammar_grade)
          if (cls.reading_grade != null) gradesPool.push(cls.reading_grade)
          if (
            cls.class_grade != null &&
            cls.speaking_grade == null &&
            cls.listening_grade == null &&
            cls.grammar_grade == null &&
            cls.reading_grade == null
          ) {
            gradesPool.push(cls.class_grade)
          }
        })
        if (gradesPool.length > 0) {
          const avg =
            gradesPool.reduce((a, b) => a + b, 0) / gradesPool.length
          setOverallGradeAvg(avg)
        }
      }

      // CURRENT PAYMENT (MONTH)
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("student_name", studentName)
        .order("due_date", { ascending: false })
        .limit(50)

      let currentPayment = null
      if (payments && payments.length > 0) {
        const now = new Date()
        const currentMonthPayments = payments.filter((p) => {
          if (!p.due_date) return true
          const [year, month] = p.due_date.split("-")
          return (
            parseInt(year, 10) === now.getFullYear() &&
            parseInt(month, 10) === now.getMonth() + 1
          )
        })

        if (currentMonthPayments.length > 0) {
          currentPayment =
            currentMonthPayments.find((p) => p.status === "paid") ||
            currentMonthPayments[0]
        } else {
          currentPayment =
            payments.find((p) => p.status === "paid") || payments[0]
        }
      }

      setPendingPayment(currentPayment)

      // LATEST ANNOUNCEMENT
      const { data: announcement } = await supabase
        .from("announcements")
        .select("*")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle()

      setLatestAnnouncement(announcement ?? null)
      if (announcement) {
        const dismissKey = `dismissed_announcement_${
          announcement.id || announcement.date || announcement.title
        }`
        setAnnouncementDismissed(localStorage.getItem(dismissKey) === "true")
      }

      // UNREAD MESSAGES
      if (user?.id) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .eq("is_read", false)

        setUnreadMessages(count || 0)
      }

      // SPEAKING LAB STATS
      const targetStudentId = studentId || user?.id
      try {
        const speakingQuery = targetStudentId
          ? supabase
              .from("student_speaking_attempts")
              .select("score")
              .eq("student_id", targetStudentId)
          : supabase
              .from("student_speaking_attempts")
              .select("score")
              .ilike("student_name", `%${studentName}%`)

        const { data: speakingData } = await speakingQuery
        if (speakingData && speakingData.length > 0) {
          setSpeakingTotalAttempts(speakingData.length)
          const avg = Math.round(
            speakingData.reduce((s: number, a: any) => s + Number(a.score || 0), 0) /
              speakingData.length
          )
          setSpeakingAvgScore(avg)
        }
      } catch {
        // non-blocking
      }

      // GRAMMAR RUSH STATS (Weekly Best Score & Overall Accuracy)
      if (targetStudentId) {
        try {
          const weekStartIso = startOfWeek(new Date(), {
            weekStartsOn: 1,
          }).toISOString()
          const { data: rushSessions } = await supabase
            .from("grammar_game_sessions")
            .select("score, accuracy, created_at")
            .eq("student_id", targetStudentId)
            .order("created_at", { ascending: false })
            .limit(100)

          if (rushSessions && rushSessions.length > 0) {
            const weekly = rushSessions.filter(
              (s: any) => s.created_at && s.created_at >= weekStartIso
            )
            const poolForBest = weekly.length > 0 ? weekly : rushSessions
            const best = Math.max(
              ...poolForBest.map((s: any) => Number(s.score || 0))
            )
            const avgAcc = Math.round(
              rushSessions.reduce(
                (acc: number, s: any) => acc + Number(s.accuracy || 0),
                0
              ) / rushSessions.length
            )
            setGrammarWeeklyBest(best)
            setGrammarAvgAccuracy(avgAcc)
          }
        } catch {
          // Non-blocking if table not yet migrated
        }
      }

      setLoading(false)
    }

    loadDashboard()

    // Realtime listener for messages on dashboard
    if (user?.id) {
      const channel = supabase
        .channel("dashboard_unread_messages")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${user.id}`,
          },
          async () => {
            const { count } = await supabase
              .from("messages")
              .select("*", { count: "exact", head: true })
              .eq("receiver_id", user.id)
              .eq("is_read", false)
            setUnreadMessages(count || 0)
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [studentName, user?.id])

  const isAnnouncementNew = React.useMemo(() => {
    if (!latestAnnouncement) return false
    const dateStr =
      (latestAnnouncement as any).created_at || latestAnnouncement.date
    if (!dateStr) return false

    try {
      let annDate: Date
      if (typeof dateStr === "string" && dateStr.includes("T")) {
        annDate = parseISO(dateStr)
      } else if (
        typeof dateStr === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
      ) {
        const [y, m, d] = dateStr.split("-").map(Number)
        annDate = new Date(y, m - 1, d)
      } else {
        annDate = new Date(dateStr)
      }

      const daysDiff = differenceInCalendarDays(new Date(), annDate)
      return daysDiff >= 0 && daysDiff <= 5
    } catch {
      return false
    }
  }, [latestAnnouncement])

  // Determine if payment is pending AND actually due/overdue (on or after the 5th / paymentDueDay, or from a past month)
  const isPaymentRed = React.useMemo(() => {
    if (!pendingPayment || pendingPayment.status === "paid") return false

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentDay = now.getDate()
    const dueDayOfMonth = paymentDueDay || 5

    if (pendingPayment.due_date) {
      const parts = pendingPayment.due_date.split("-").map(Number)
      if (parts.length >= 2) {
        const [pYear, pMonth] = parts
        // If slip is from an earlier month/year, it is already overdue
        if (
          pYear < currentYear ||
          (pYear === currentYear && pMonth < currentMonth)
        ) {
          return true
        }
        // If slip is for a future month, not red yet
        if (
          pYear > currentYear ||
          (pYear === currentYear && pMonth > currentMonth)
        ) {
          return false
        }
      }
    }

    // Current month slip: only turns red on or after the due day (e.g. the 5th)
    return currentDay >= dueDayOfMonth
  }, [pendingPayment, paymentDueDay])

  const handleDismissAnnouncement = () => {
    if (!latestAnnouncement) return
    const dismissKey = `dismissed_announcement_${
      latestAnnouncement.id ||
      latestAnnouncement.date ||
      latestAnnouncement.title
    }`
    localStorage.setItem(dismissKey, "true")
    setAnnouncementDismissed(true)
  }

  const courseCompletionPct = Math.min(
    100,
    Math.round((completedClassesCount / TOTAL_COURSE_CLASSES) * 100)
  )

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // ============================================================
  // BENTO CARDS DEFINITIONS
  // ============================================================

  // 1. THIS WEEK'S SCHEDULE CARD (Calendar Resume)
  const ScheduleCard = (
    <Card key="schedule-card" className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400/20 to-blue-600/20 border border-sky-400/30 flex items-center justify-center text-primary shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
          <span>This Week's Schedule</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        <div className="rounded-2xl border border-white/50 dark:border-white/10 overflow-hidden flex-1 bg-white/30 dark:bg-slate-950/20">
          <ReadOnlyCalendar
            role="student"
            identifier={studentName || ""}
            compact={true}
          />
        </div>
        <Button asChild className="w-full font-semibold">
          <Link to="/student/classes">See full schedule</Link>
        </Button>
      </CardContent>
    </Card>
  )

  // 3. MESSAGES CARD
  const MessagesCard = (
    <Card key="messages-card" className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-400/20 to-purple-600/20 border border-indigo-400/30 flex items-center justify-center text-primary shadow-sm">
            <MessageSquare className="w-5 h-5" />
          </div>
          <span>Messages</span>
        </CardTitle>
        <Link
          to="/student/messages"
          className="text-xs font-semibold px-3 py-1.5 rounded-full liquid-glass-pill text-primary hover:underline"
        >
          Open chat
        </Link>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        {unreadMessages > 0 ? (
          <div className="space-y-4">
            <div className="bg-emerald-500/10 backdrop-blur-md p-4 rounded-2xl flex items-center justify-between border border-emerald-500/25">
              <div>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                  New Messages
                </p>
                <p className="text-sm text-muted-foreground">
                  You have {unreadMessages} unread message
                  {unreadMessages !== 1 ? "s" : ""}.
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-[0_4px_12px_rgba(16,185,129,0.4)]">
                {unreadMessages}
              </div>
            </div>
            <Button
              asChild
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Link to="/student/messages">Read Messages</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 text-center py-2">
            <div className="liquid-glass-pill rounded-2xl p-5 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                <MessageSquare className="w-6 h-6 text-primary/70" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                All caught up! No new messages.
              </p>
            </div>
            <Button variant="outline" asChild className="w-full">
              <Link to="/student/messages">Send a message</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  // 4. BILLING STATUS CARD (Only turns red on/after the 5th or paymentDueDay; moves to #1 when red)
  const BillingCard = (
    <Card
      key="billing-card"
      className={`flex flex-col transition-all duration-300 ${
        pendingPayment
          ? pendingPayment.status === "paid"
            ? "border-emerald-500/45 bg-emerald-500/[0.07] dark:bg-emerald-950/20"
            : isPaymentRed
              ? "border-rose-500/50 bg-rose-500/[0.08] dark:bg-rose-950/25 ring-2 ring-rose-500/20"
              : "border-amber-400/40 bg-amber-500/[0.05] dark:bg-amber-950/15"
          : ""
      }`}
    >
      <CardHeader className="pb-3">
        <CardTitle
          className={`flex items-center gap-3 text-lg ${
            pendingPayment
              ? pendingPayment.status === "paid"
                ? "text-emerald-700 dark:text-emerald-400 font-bold"
                : isPaymentRed
                  ? "text-rose-700 dark:text-rose-400 font-bold"
                  : "text-foreground font-bold"
              : ""
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-600/20 border border-emerald-400/30 flex items-center justify-center text-base shadow-sm">
            💳
          </div>
          <span>Billing Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-4">
        <div className="liquid-glass-pill rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p
              className={`text-sm font-semibold ${
                pendingPayment
                  ? pendingPayment.status === "paid"
                    ? "text-emerald-900 dark:text-emerald-200"
                    : isPaymentRed
                      ? "text-rose-900 dark:text-rose-200"
                      : "text-foreground"
                  : "text-foreground"
              }`}
            >
              Current month
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Due on the {formatOrdinalDay(paymentDueDay)} of each month
            </p>
          </div>

          {pendingPayment ? (
            pendingPayment.status === "paid" ? (
              <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 px-3 py-1">
                Paid
              </Badge>
            ) : isPaymentRed ? (
              <Badge
                variant="destructive"
                className="animate-pulse px-3 py-1 font-bold tracking-wide"
              >
                ACTION REQUIRED
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 px-3 py-1 font-semibold">
                Due on the {formatOrdinalDay(paymentDueDay)}
              </Badge>
            )
          ) : (
            <span className="text-xs font-medium text-muted-foreground px-3 py-1 rounded-full liquid-glass-pill">
              No Slip
            </span>
          )}
        </div>

        {pendingPayment && pendingPayment.status !== "paid" ? (
          <Button
            asChild
            variant={isPaymentRed ? "destructive" : "outline"}
            className="w-full font-bold"
          >
            <Link to="/student/payments">Go to Payments</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link to="/student/payments">View Payment History</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )

  const CompactRankingCard = (
    <CompactNativeQuestRankCard key="compact-ranking-card" showPlayButton={true} />
  )

  // Dynamically order cards:
  // If payment is pending AND on/after the 5th (red), BillingCard becomes the 1st box!
  // Otherwise: 1) CompactRankingCard, 2) ScheduleCard, 3) MessagesCard, 4) BillingCard.
  const orderedBentoCards = isPaymentRed
    ? [BillingCard, CompactRankingCard, ScheduleCard, MessagesCard]
    : [CompactRankingCard, ScheduleCard, MessagesCard, BillingCard]

  return (
    <div className="space-y-6 pb-8">
      {/* Top Bar: Notification Incentive + Compact Announcements Pill */}
      <div className="space-y-3">
        <NotificationIncentiveBanner />

        {/* SMART ANNOUNCEMENT BANNER:
            Shows automatically at the top when an announcement exists and hasn't been dismissed.
            If dismissed (or no new announcement), collapses into a tiny pill so it never wastes a Bento box! */}
        {latestAnnouncement && !announcementDismissed ? (
          <div
            className={`liquid-glass-card rounded-3xl p-4 sm:p-5 border transition-all animate-fade-in ${
              isAnnouncementNew
                ? "border-emerald-500/50 bg-emerald-500/[0.08] dark:bg-emerald-950/30 ring-2 ring-emerald-500/20"
                : "border-amber-400/40 bg-amber-500/[0.05]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400/25 to-orange-500/25 border border-amber-400/40 flex items-center justify-center text-amber-600 dark:text-amber-300 shrink-0 shadow-sm mt-0.5">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                      School Announcement
                    </span>
                    {isAnnouncementNew && (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-extrabold text-[10px] uppercase px-2 py-0">
                        New
                      </Badge>
                    )}
                    {latestAnnouncement.date && (
                      <span className="text-[11px] text-muted-foreground">
                        • {format(parseISO(latestAnnouncement.date), "MMM d, yyyy")}
                      </span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-base text-foreground">
                    {latestAnnouncement.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {latestAnnouncement.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  to="/student/announcements"
                  className="text-xs font-semibold px-3 py-1.5 rounded-full liquid-glass-pill text-primary hover:underline hidden sm:inline-flex items-center gap-1"
                >
                  <span>All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismissAnnouncement}
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  title="Dismiss announcement"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <div className="inline-flex items-center gap-2">
              {latestAnnouncement && announcementDismissed && (
                <button
                  type="button"
                  onClick={() => setAnnouncementDismissed(false)}
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-full liquid-glass-pill text-foreground/80 hover:text-primary inline-flex items-center gap-1.5 transition-colors"
                >
                  <Megaphone className="w-3.5 h-3.5 text-amber-500" />
                  <span>Show latest announcement</span>
                </button>
              )}
              <Link
                to="/student/announcements"
                className="text-xs font-semibold px-3.5 py-1.5 rounded-full liquid-glass-pill text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 transition-colors"
              >
                <Megaphone className="w-3.5 h-3.5 text-primary" />
                <span>Announcements</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* APPLE LIQUID GLASS 4-CARD BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-6">
        {orderedBentoCards}
      </div>
    </div>
  )
}

export default StudentDashboard
