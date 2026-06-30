import React, { useEffect, useState } from "react"
import { supabase, Class, Payment, Announcement } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, ExternalLink, MessageSquare, CalendarClock } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { format, parseISO } from "date-fns"
import { toLocalDate, formatClassTime, getTimeZoneLabel } from "@/lib/dateUtils"
import { fetchStudentNextChapters, NextChapterInfo, ClassType, fetchUpcomingClassType } from "@/lib/courseUtils"
import { Link } from "react-router-dom"
import { ReadOnlyCalendar } from "@/components/calendar/ReadOnlyCalendar"

const extractClassName = (title: string, studentName?: string) => {
  if (!title) return 'Class';
  if (!title.includes(' - ')) return studentName ? `${studentName.split(' ')[0]}'s class` : 'Class';
  const parts = title.split(' - ');
  return parts[0].trim();
};

const extractTeacherName = (title: string) => {
  if (!title) return '';
  if (!title.includes(' - ')) return title;
  const parts = title.split(' - ');
  return parts.length > 1 ? parts[1].trim() : '';
};

const StudentDashboard: React.FC = () => {
  const { studentName, user } = useAuth()

  const [nextClass, setNextClass] = useState<Class | null>(null)
  const [nextChapters, setNextChapters] = useState<Partial<Record<ClassType, NextChapterInfo>>>({})
  const [upcomingClassType, setUpcomingClassType] = useState<ClassType | null>(null)
  const [upcomingExamCompleted, setUpcomingExamCompleted] = useState(false)
  const [lastClass, setLastClass] = useState<Class | null>(null)
  const [pendingPayment, setPendingPayment] = useState<Payment | null>(null)
  const [paymentDueDay, setPaymentDueDay] = useState<number>(9)
  const [latestAnnouncement, setLatestAnnouncement] =
    useState<Announcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    if (!studentName || !user?.email) {
      setLoading(false)
      return
    }
    const userEmail = user.email;

    const loadDashboard = async () => {
      console.log('StudentDashboard: Loading dashboard data...'); // Force HMR
      const today = format(new Date(), 'yyyy-MM-dd')
      let studentId = "";

      // 0. Fetch Student ID and Settings
      const { data: studentData } = await supabase
        .from('students')
        .select('id, payment_due_day')
        .ilike('email', userEmail!)
        .maybeSingle();

      if (studentData) {
        studentId = studentData.id;
        if (studentData.payment_due_day) setPaymentDueDay(studentData.payment_due_day);
      }


      // NEXT CLASS (Relational)
      // We need classes where:
      // A) student_name == studentName (Legacy)
      // OR
      // B) id IN (select class_id from class_assignments where student_id == studentId)
      // AND date >= today

      let nextClassData: any = null;

      // Fetch Legacy
      const { data: legacyNext } = await supabase
        .from("classes")
        .select("*")
        .ilike("student_name", `%${studentName}%`)
        .gte("date", today)
        .order("date", { ascending: true })
        .order("time", { ascending: true })
        .limit(15)

      // Fetch Relational
      let relationalNext: any[] = [];
      if (studentId) {
        const { data: newClasses } = await supabase
          .from("classes")
          .select(`
            *,
            class_assignments!inner(student_id)
          `)
          .eq("class_assignments.student_id", studentId)
          .gte("date", today)
          .order("date", { ascending: true })
          .limit(15);

        if (newClasses) {
          relationalNext = newClasses.map((cls: any) => ({
            ...cls,
            time: cls.start_time || cls.time,
            title: cls.title,
            link_url: cls.link_url
          }));
        }
      }

      // Combine and Sort
      const allClasses = [...(legacyNext || []), ...relationalNext];
      
      const getMinutes = (tStr: string) => {
        if (!tStr) return 0;
        if (tStr.includes('T')) {
            const d = new Date(tStr);
            return d.getHours() * 60 + d.getMinutes();
        }
        const [h, m] = tStr.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };

      if (allClasses.length > 0) {
        // Deduplicate
        const uniqueClasses = Array.from(new Map(allClasses.map(item => [item.id, item])).values());
        
        uniqueClasses.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return getMinutes(a.time) - getMinutes(b.time);
        });

        // Find the first class that hasn't finished yet (assuming 1hr duration)
        const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
        const upcomingClass = uniqueClasses.find(cls => {
            if (cls.date > today) return true;
            if (cls.date === today) {
                // Keep showing it if it started less than 60 mins ago
                return getMinutes(cls.time) + 60 >= nowMins;
            }
            return false;
        });

        nextClassData = upcomingClass || null;
      }

      setNextClass(nextClassData)

      const chapters = await fetchStudentNextChapters(studentName)
      setNextChapters(chapters)

      const upcomingType = await fetchUpcomingClassType(studentName)
      setUpcomingClassType(upcomingType)

      let isExamCompleted = false;
      if (studentId && upcomingType === 'Exam') {
        const { data: subs } = await supabase
          .from('exam_submissions')
          .select('completed_at')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (subs && subs.length > 0 && subs[0].completed_at) {
          isExamCompleted = true;
        }
      }
      setUpcomingExamCompleted(isExamCompleted)

      // LAST GRADED CLASS
      // 1. Legacy Query
      let lastGradedClass: Class | null = null;

      const { data: legacyLast } = await supabase
        .from("classes")
        .select("*")
        .ilike("student_name", `%${studentName}%`)
        .not("class_grade", "is", null)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle()

      // 2. Relational Query
      lastGradedClass = legacyLast;

      setLastClass(lastGradedClass)


      // CURRENT PAYMENT (MONTH)
      const { data: payments } = await supabase
        .from("payments")
        .select("*")
        .eq("student_name", studentName)
        .order("due_date", { ascending: false })
        .limit(50) // Increased limit to ensure we find current month even if future payments exist

      let currentPayment = null
      if (payments && payments.length > 0) {
        const now = new Date()
        const currentMonthPayments = payments.filter((p) => {
          if (!p.due_date) return true; // Include edge-function created initial payments
          const [year, month] = p.due_date.split('-');
          return (
            parseInt(year, 10) === now.getFullYear() &&
            parseInt(month, 10) === now.getMonth() + 1
          )
        });

        if (currentMonthPayments.length > 0) {
          currentPayment = currentMonthPayments.find(p => p.status === 'paid') || currentMonthPayments[0];
        } else {
          // Fallback to the latest known payment (prevents random 'No Slip' if billed late)
          currentPayment = payments.find(p => p.status === 'paid') || payments[0];
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

      // UNREAD MESSAGES
      if (user?.id) {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .eq("is_read", false)

        setUnreadMessages(count || 0)
      }

      setLoading(false)
    }

    loadDashboard()

    // Realtime listener for messages on dashboard
    if (user?.id) {
      const channel = supabase
        .channel('dashboard_unread_messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
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

  const confirmReschedule = async (cls: Class) => {
    try {
      if (!user) throw new Error("Not logged in");
      
      // 1. Delete class
      const { error: deleteError } = await supabase.from('classes').delete().eq('id', cls.id);
      if (deleteError) throw deleteError;

      // 2. Add recuperation
      const { error: recupError } = await supabase.from('recuperation_classes').insert({
        student_id: user.id,
        status: 'pending',
        date: cls.date, // optional reference
        notes: `Rescheduled from ${cls.date} ${cls.time}`
      });
      if (recupError) throw recupError;

      // 3. Notify teacher (optional, doing it if possible)
      const teacherName = extractTeacherName(cls.title);
      if (teacherName) {
        const { data: teacherData } = await supabase.from('teachers').select('id').ilike('name', teacherName).maybeSingle();
        if (teacherData) {
          await supabase.from('messages').insert({
            sender_id: user.id,
            receiver_id: teacherData.id,
            content: `Hello! I have rescheduled our class on ${cls.date} at ${cls.time}. A recuperation has been added to my account.`,
            is_read: false
          });
        }
      }

      toast.success('Class rescheduled! A recuperation credit has been added.');
      setNextClass(null); // Clear the next class

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to reschedule.');
    }
  };

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

  return (
    <div className="space-y-8">


      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SCHEDULE COMPACT VIEW */}
        <Card className="shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              📅 This Week's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border overflow-hidden">
              <ReadOnlyCalendar role="student" identifier={studentName || ''} compact={true} />
            </div>
            <Button asChild className="w-full font-semibold">
              <Link to="/student/classes">See full schedule</Link>
            </Button>
          </CardContent>
        </Card>

        {/* ANNOUNCEMENTS */}
        <Card className="shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>📢 Latest Announcement</CardTitle>
            <Link
              to="/student/announcements"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {latestAnnouncement ? (
              <div className="space-y-2">
                <p className="font-semibold">
                  {latestAnnouncement.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {latestAnnouncement.message}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                No announcements yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* MESSAGES */}
        <Card className="shadow-sm hover:shadow-md transition">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Messages
            </CardTitle>
            <Link
              to="/student/messages"
              className="text-sm text-primary hover:underline"
            >
              Open chat
            </Link>
          </CardHeader>
          <CardContent>
            {unreadMessages > 0 ? (
              <div className="space-y-4">
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
                <Button asChild className="w-full bg-green-500 hover:bg-green-600 text-white">
                  <Link to="/student/messages">Read Messages</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
                  <MessageSquare className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No new messages.
                </p>
                <Button variant="outline" asChild className="w-full">
                  <Link to="/student/messages">Send a message</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* BILLING */}
        <Card className={`shadow-sm transition-all duration-300 ${
           pendingPayment 
             ? pendingPayment.status !== 'paid' 
               ? 'border-2 border-red-500 bg-red-50/80 dark:bg-red-950/20 shadow-red-500/10' 
               : 'border-2 border-green-500 bg-green-50/80 dark:bg-green-950/20 shadow-green-500/10'
             : 'hover:shadow-md'
        }`}>
          <CardHeader className="pb-2">
            <CardTitle className={
              pendingPayment 
                ? pendingPayment.status !== 'paid' 
                  ? 'text-red-700 dark:text-red-400 font-bold flex items-center gap-2' 
                  : 'text-green-700 dark:text-green-400 font-bold flex items-center gap-2'
                : ''
            }>
              💳 Billing Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between pb-3">
              <div>
                <p className={`text-sm font-medium ${
                  pendingPayment 
                    ? pendingPayment.status !== 'paid' 
                      ? 'text-red-800 dark:text-red-300' 
                      : 'text-green-800 dark:text-green-300'
                    : 'text-muted-foreground'
                }`}>
                  Current month <span className="opacity-70 font-normal ml-1">(Due on the {(() => {
                    const j = paymentDueDay % 10, k = paymentDueDay % 100;
                    if (j === 1 && k !== 11) return paymentDueDay + "st";
                    if (j === 2 && k !== 12) return paymentDueDay + "nd";
                    if (j === 3 && k !== 13) return paymentDueDay + "rd";
                    return paymentDueDay + "th";
                  })()})</span>
                </p>
              </div>

              {pendingPayment ? (
                pendingPayment.status === "paid" ? (
                  <Badge className="bg-success/10 text-success">Paid</Badge>
                ) : (
                  <Badge variant="destructive" className="animate-pulse shadow-md shadow-red-500/30 px-3 py-1 font-bold tracking-wide">ACTION REQUIRED</Badge>
                )
              ) : (
                <span className="text-sm text-muted-foreground">No Slip</span>
              )}
            </div>

            {pendingPayment && pendingPayment.status !== 'paid' && (
               <Button asChild variant="destructive" className="w-full mt-2 font-bold shadow-md hover:bg-red-700 hover:shadow-lg transition-all active:scale-[0.98]">
                 <Link to="/student/payments">Go to Payments</Link>
               </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default StudentDashboard
