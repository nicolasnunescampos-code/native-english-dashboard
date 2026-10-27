import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, History, Trophy, Medal, Zap, GraduationCap, Clock } from "lucide-react"
import { format, parseISO } from "date-fns"

interface StudentProgressSummary {
  classes_completed: number
  nq_sessions: number
  nq_best_score: number
  nq_avg_accuracy: number
  nq_chapters_count: number
  speaking_attempts: number
  speaking_avg_score: number
  nq_last_accessed?: string | null
}

interface Student {
  id: string
  student_name: string
  email: string
  classes_per_week: number
  cpf?: string | null
  payment_amount?: string | null
  currency?: string | null
  rules_agreed?: boolean
  preferred_schedule?: string | null
  status?: 'active' | 'stopped'
  payment_due_day?: number
  course_type?: 'Native English' | 'Conversation Club'
  source?: string | null
  referred_by?: string | null
}

const AdminStudents: React.FC = () => {
  const { toast } = useToast()

  const [students, setStudents] = useState<Student[]>([])
  const [progressByStudent, setProgressByStudent] = useState<Record<string, StudentProgressSummary>>({})
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(false)
  const [showStopped, setShowStopped] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const [form, setForm] = useState<{
    email: string
    password: string
    student_name: string
    classes_per_week: number
    cpf: string
    payment_amount: string
    currency: string
    preferred_schedule: string
    status: string
    payment_due_day: number
    course_type: 'Native English' | 'Conversation Club'
    source: string
    referred_by: string
  }>({
    email: "",
    password: "",
    student_name: "",
    classes_per_week: 1,
    cpf: "",
    payment_amount: "",
    currency: "BRL",
    preferred_schedule: "",
    status: "active",
    payment_due_day: 5,
    course_type: "Native English",
    source: "",
    referred_by: "none",
  })

  // =========================
  // FETCH STUDENTS & NATIVE QUEST PROGRESS
  // =========================
  const fetchStudents = async () => {
    const [studentsRes, classesRes, nqRes, speakRes] = await Promise.all([
      supabase.from("students").select("*").order("student_name"),
      supabase
        .from("classes")
        .select("student_name, class_grade, speaking_grade, grammar_grade, reading_grade, listening_grade, is_absent")
        .or("speaking_grade.not.is.null,class_grade.not.is.null,grammar_grade.not.is.null,reading_grade.not.is.null,listening_grade.not.is.null"),
      supabase
        .from("grammar_game_sessions")
        .select("student_id, student_name, book, chapter, score, accuracy"),
      supabase
        .from("student_speaking_attempts")
        .select("student_id, student_name, score"),
    ])

    if (studentsRes.error) {
      toast({
        title: "Error",
        description: studentsRes.error.message,
        variant: "destructive",
      })
      return
    }

    const loadedStudents: Student[] = studentsRes.data || []
    setStudents(loadedStudents)

    const allClasses = classesRes.data || []
    const allNq = nqRes.data || []
    const allSpeak = speakRes.data || []

    const map: Record<string, StudentProgressSummary> = {}
    loadedStudents.forEach((stu) => {
      const nameLower = String(stu.student_name || "").trim().toLowerCase()
      const stuClasses = allClasses.filter(
        (c: any) =>
          !c.is_absent &&
          String(c.student_name || "").trim().toLowerCase() === nameLower
      )
      const stuNq = allNq.filter(
        (s: any) =>
          (stu.id && s.student_id === stu.id) ||
          String(s.student_name || "").trim().toLowerCase() === nameLower
      )
      const stuSpeak = allSpeak.filter(
        (a: any) =>
          (stu.id && a.student_id === stu.id) ||
          String(a.student_name || "").trim().toLowerCase() === nameLower
      )

      const nqSessions = stuNq.length
      const nqBestScore =
        nqSessions > 0 ? Math.max(...stuNq.map((s: any) => Number(s.score || 0))) : 0
      const nqAvgAccuracy =
        nqSessions > 0
          ? Math.round(
              stuNq.reduce((sum: number, s: any) => sum + Number(s.accuracy || 0), 0) /
                nqSessions
            )
          : 0
      const nqChaptersCount = new Set(stuNq.map((s: any) => `${s.book}_${s.chapter}`)).size
      const speakingAvgScore =
        stuSpeak.length > 0
          ? Math.round(
              stuSpeak.reduce((sum: number, a: any) => sum + Number(a.score || 0), 0) /
                stuSpeak.length
            )
          : 0

      map[stu.id] = {
        classes_completed: stuClasses.length,
        nq_sessions: nqSessions,
        nq_best_score: nqBestScore,
        nq_avg_accuracy: nqAvgAccuracy,
        nq_chapters_count: nqChaptersCount,
        speaking_attempts: stuSpeak.length,
        speaking_avg_score: speakingAvgScore,
        nq_last_accessed: stuNq.length > 0 ? (stuNq[0].created_at || null) : null,
      }
    })
    setProgressByStudent(map)
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  // =========================
  // RESET FORM
  // =========================
  const resetForm = () => {
    setForm({
      email: "",
      password: "",
      student_name: "",
      classes_per_week: 1,
      cpf: "",
      payment_amount: "",
      currency: "BRL",
      preferred_schedule: "",
      status: "active",
      payment_due_day: 5,
      course_type: "Native English",
      source: "",
      referred_by: "none",
    })
  }

  // =========================
  // FIX CLASSES (Temporary Tool)
  // =========================
  const fixClasses = async () => {
    setLoading(true);
    try {
      const { data: assignments, error: err1 } = await supabase.from('class_assignments').select('*');
      if (err1) throw err1;

      const { data: classesList, error: err2 } = await supabase.from('classes').select('id, student_name');
      if (err2) throw err2;

      const studentMap = new Map();
      students.forEach(s => studentMap.set(s.id, s.student_name));

      let fixedCount = 0;
      for (const cls of classesList || []) {
        const clsAssignments = (assignments || []).filter(a => a.class_id === cls.id);
        if (clsAssignments.length > 0) {
          const names = clsAssignments.map(a => studentMap.get(a.student_id)).filter(Boolean);
          const correctName = names.join(', ');
          if (correctName && correctName !== cls.student_name) {
            await supabase.from('classes').update({ student_name: correctName }).eq('id', cls.id);
            fixedCount++;
          }
        }
      }
      toast({ title: 'Fix Complete', description: `Fixed ${fixedCount} corrupted classes by recalculating student names.` });
    } catch (err: any) {
      toast({ title: 'Fix Failed', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  // =========================
  // CREATE STUDENT
  // =========================
  const handleCreateStudent = async () => {
    if (loading) return;

    if (!form.email || !form.password || !form.student_name) {
      toast({
        title: "Missing fields",
        description: "Email, password and name are required.",
        variant: "destructive",
      })
      return
    }

    if (form.password.length < 5) {
      toast({
        title: "Invalid password",
        description: "Password must have at least 5 characters.",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)

      // 1. Create Auth User & Basic Record via Edge Function
      const { error } = await supabase.functions.invoke("create-student", {
        body: {
          email: form.email.trim().toLowerCase(),
          password: form.password,
          student_name: form.student_name.trim(),
          classes_per_week: form.classes_per_week,
          cpf: form.cpf ? form.cpf.trim() : null,
          payment_amount: form.payment_amount ? form.payment_amount.trim() : null,
          course_type: form.course_type,
        },
      })

      if (error) {
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errorData = await error.context.json()
            if (errorData?.error) throw new Error(errorData.error)
          } catch (e) {
            // ignore JSON parse errors or rethrows
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e
          }
        }
        throw error
      }

      // 2. Update the new student record with Currency (since edge function usually just does basic insert)
      // We look up the student we just created by email to update the currency/cpf if the edge function didn't handle it
      // For safety, assuming edge function MIGHT handle cpf but maybe not currency, let's update both to be sure.
      const { data: newStudent } = await supabase
        .from('students')
        .select('id')
        .eq('email', form.email.trim().toLowerCase())
        .single()

      if (newStudent) {
        await supabase.from('students').update({
          currency: form.currency,
          cpf: form.cpf, // update here too just in case
          payment_amount: form.payment_amount, // and this
          preferred_schedule: form.preferred_schedule || null,
          payment_due_day: form.payment_due_day,
          course_type: form.course_type,
          source: form.source || null,
          referred_by: form.source === 'referral' && form.referred_by !== 'none' ? form.referred_by : null,
        }).eq('id', newStudent.id)

        // 3. Patch the initial payment to give it a proper due_date and currency
        if (form.payment_amount) {
           const now = new Date()
           const year = now.getFullYear()
           const month = String(now.getMonth() + 1).padStart(2, '0')
           const dueDay = String(form.payment_due_day || 9).padStart(2, '0')
           
           await supabase.from('payments').update({
             due_date: `${year}-${month}-${dueDay}`,
             currency: form.currency
           }).eq('student_id', newStudent.id).is('due_date', null)
        }
      }

      toast({
        title: "Student created",
        description: "Student created successfully.",
      })

      setOpenCreate(false)
      resetForm()
      fetchStudents()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // EDIT STUDENT
  // =========================
  const handleEditClick = (student: Student) => {
    setSelectedStudent(student)
    setForm({
      email: student.email,
      password: "", // Don't edit password here
      student_name: student.student_name,
      classes_per_week: student.classes_per_week,
      cpf: student.cpf || "",
      payment_amount: student.payment_amount || "",
      currency: student.currency || "BRL",
      preferred_schedule: student.preferred_schedule || "",
      status: student.status || "active",
      payment_due_day: student.payment_due_day || 5,
      course_type: student.course_type || "Native English",
      source: student.source || "",
      referred_by: student.referred_by || "none",
    })
    setOpenEdit(true)
  }

  const handleUpdateStudent = async () => {
    if (!selectedStudent) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('students')
        .update({
          student_name: form.student_name,
          classes_per_week: form.classes_per_week,
          cpf: form.cpf || null,
          payment_amount: form.payment_amount || null,
          currency: form.currency,
          preferred_schedule: form.preferred_schedule || null,
          status: form.status,
          payment_due_day: form.payment_due_day,
          course_type: form.course_type,
          source: form.source || null,
          referred_by: form.source === 'referral' && form.referred_by !== 'none' ? form.referred_by : null,
          ...(form.status === 'stopped' && selectedStudent.status !== 'stopped' ? { stopped_at: new Date().toISOString() } : {}),
          ...(form.status === 'active' && selectedStudent.status === 'stopped' ? { stopped_at: null } : {})
        })
        .eq('id', selectedStudent.id)

      if (error) throw error

      if (form.password && form.password.trim() !== "") {
        const { error: pwdError } = await supabase.functions.invoke("update-user-password", {
          body: {
            userId: selectedStudent.id,
            newPassword: form.password
          }
        })
        if (pwdError) {
          console.error("Failed to update password:", pwdError)
          toast({
            title: "Warning",
            description: "Student details updated, but password change failed.",
            variant: "destructive"
          })
        }
      }

      // Update associated pending payments
      const paymentUpdate: any = {}
      if (form.student_name !== selectedStudent.student_name) {
        paymentUpdate.student_name = form.student_name
      }
      if (form.payment_amount) {
        paymentUpdate.amount = Number(form.payment_amount)
      }
      if (form.currency) {
        paymentUpdate.currency = form.currency
      }

      if (Object.keys(paymentUpdate).length > 0) {
        await supabase
          .from('payments')
          .update(paymentUpdate)
          .eq('student_name', selectedStudent.student_name)
          .eq('status', 'pending')
      }

      // Also update classes table if student name changed (to prevent orphaned classes)
      if (form.student_name !== selectedStudent.student_name) {
        // Find all class assignments for this student
        const { data: assignments } = await supabase
          .from('class_assignments')
          .select('class_id')
          .eq('student_id', selectedStudent.id)
          
        if (assignments && assignments.length > 0) {
           const classIds = assignments.map(a => a.class_id)
           // We need to fetch the current classes to properly update the comma-separated names
           const { data: classesToUpdate } = await supabase
             .from('classes')
             .select('id, student_name')
             .in('id', classIds)
             
           if (classesToUpdate) {
             for (const cls of classesToUpdate) {
               if (cls.student_name) {
                 // Replace the old name with the new name in the comma-separated string
                 const newNames = cls.student_name.split(',').map((name: string) => {
                   return name.trim() === selectedStudent.student_name ? form.student_name : name.trim()
                 })
                 await supabase
                   .from('classes')
                   .update({ student_name: newNames.join(', ') })
                   .eq('id', cls.id)
               }
             }
           }
        }
      }

      toast({
        title: "Student updated",
        description: "Changes saved successfully.",
      })

      setOpenEdit(false)
      fetchStudents()
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // DELETE STUDENT
  // =========================
  const handleDeleteStudent = async () => {
    if (!selectedStudent) return

    try {
      setLoading(true)

      const { error } = await supabase.functions.invoke("delete-student", {
        body: {
          student_id: selectedStudent.id,
        },
      })

      if (error) {
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errorData = await error.context.json()
            if (errorData?.error) throw new Error(errorData.error)
          } catch (e) {
            if (e instanceof Error && e.message !== "Unexpected end of JSON input") throw e
          }
        }
        throw error
      }

      toast({
        title: "Student deleted",
        description: `${selectedStudent.student_name} was removed completely.`,
      })

      setOpenDelete(false)
      setSelectedStudent(null)
      fetchStudents()
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.message || "Could not delete student",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // =========================
  // UI
  // =========================
  const displayStudents = students
    .filter(s => showStopped ? s.status === 'stopped' : s.status !== 'stopped')
    .filter(s => 
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Manage Students &amp; Progress Cards</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add, edit, or inspect each student&apos;s 360° card, course history, and Native Quest game progress.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Input
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-white"
          />
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
            <input 
              type="checkbox" 
              className="rounded border-gray-300 w-4 h-4"
              checked={showStopped}
              onChange={(e) => setShowStopped(e.target.checked)}
            />
            Show Stopped Only
          </label>
          <Button asChild variant="outline" className="whitespace-nowrap border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10">
            <Link to="/admin/student-history">
              <Trophy className="w-4 h-4 mr-1.5 text-amber-500" />
              360° Directory &amp; Ranking
            </Link>
          </Button>
          <Button variant="outline" onClick={fixClasses} disabled={loading} className="whitespace-nowrap">
            Fix Schedule Data
          </Button>
          <Button onClick={() => { resetForm(); setOpenCreate(true); }} className="whitespace-nowrap">Add Student</Button>
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayStudents.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground">
            No students found.
          </div>
        ) : (
          displayStudents.map((student) => {
            const prog = progressByStudent[student.id] || {
              classes_completed: 0,
              nq_sessions: 0,
              nq_best_score: 0,
              nq_avg_accuracy: 0,
              nq_chapters_count: 0,
              speaking_attempts: 0,
              speaking_avg_score: 0,
            }
            const coursePct = Math.min(100, Math.round((prog.classes_completed / 160) * 100))
            const nqPct = Math.min(100, Math.round((prog.nq_chapters_count / 30) * 100))

            return (
              <Card key={student.id} className={student.status === 'stopped' ? 'opacity-70 grayscale-[0.3]' : ''}>
                <CardContent className="p-6 space-y-3.5">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-lg">{student.student_name}</h3>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                      <Badge variant="outline" className="text-[11px] shrink-0">
                        {prog.classes_completed}/160 classes ({coursePct}%)
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${student.rules_agreed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {student.rules_agreed ? 'Rules: Agreed ✅' : 'Rules: Pending ⏳'}
                      </span>
                      {student.status === 'stopped' && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700">
                          Stopped 🛑
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm space-y-1">
                    <p>📚 {student.classes_per_week} classes/week</p>
                    <p>🎓 Course: {student.course_type || 'Native English'}</p>
                    {student.cpf && <p>🆔 CPF: {student.cpf}</p>}
                    {student.preferred_schedule && <p>🕒 Shift/Time: {student.preferred_schedule}</p>}
                    {student.source && (
                      <p>📢 Source: {student.source === 'referral' && student.referred_by ? `Referred by ${students.find(s => s.id === student.referred_by)?.student_name || 'Unknown'}` : student.source}</p>
                    )}
                    {student.payment_amount && (
                      <p className="font-medium text-green-700">
                        💳 {student.currency || 'BRL'} {student.payment_amount}
                      </p>
                    )}
                  </div>

                  {/* Native Quest Progress Section inside Admin Student Card */}
                  <div className="rounded-xl bg-amber-500/[0.07] dark:bg-amber-500/10 border border-amber-500/25 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-300 flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        Native Quest Progress
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] py-0 bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/30"
                      >
                        {prog.nq_chapters_count}/30 Chapters ({nqPct}%)
                      </Badge>
                    </div>
                    <div className="w-full bg-slate-200/70 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all"
                        style={{ width: `${nqPct}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 pt-0.5 text-center">
                      <div className="rounded-lg bg-background/60 p-1.5 border border-border/50">
                        <p className="text-[10px] text-muted-foreground">Best Score</p>
                        <p className="text-xs font-extrabold text-amber-600 dark:text-amber-300">
                          {prog.nq_best_score.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-lg bg-background/60 p-1.5 border border-border/50">
                        <p className="text-[10px] text-muted-foreground">Quests</p>
                        <p className="text-xs font-extrabold text-foreground">
                          {prog.nq_sessions}
                        </p>
                      </div>
                      <div className="rounded-lg bg-background/60 p-1.5 border border-border/50">
                        <p className="text-[10px] text-muted-foreground">Accuracy</p>
                        <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          {prog.nq_sessions ? `${prog.nq_avg_accuracy}%` : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-background/60 p-1.5 border border-border/50">
                        <p className="text-[10px] text-muted-foreground">Speaking</p>
                        <p className="text-xs font-extrabold text-purple-600 dark:text-purple-300">
                          {prog.speaking_attempts ? `${prog.speaking_avg_score}%` : '—'}
                        </p>
                      </div>
                    </div>

                    {prog.nq_last_accessed && (
                      <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px] text-muted-foreground font-semibold">
                        <Clock className="w-3 h-3 text-sky-500 shrink-0" />
                        <span>Last played: {format(parseISO(prog.nq_last_accessed), 'MMM d, HH:mm')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditClick(student)}
                    >
                      <Pencil className="w-4 h-4 mr-1.5" />
                      Edit
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1 border-sky-500/40 text-sky-600 dark:text-sky-300 hover:bg-sky-500/10"
                    >
                      <Link to={`/admin/student-history?student=${encodeURIComponent(student.student_name)}`}>
                        <GraduationCap className="w-4 h-4 mr-1.5" />
                        360° Card
                      </Link>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedStudent(student)
                        setOpenDelete(true)
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* CREATE STUDENT MODAL */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Student</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[75vh] overflow-y-auto px-2 custom-scrollbar">
            <div>
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <Label>Password (min 5 chars)</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div>
              <Label>Student Name</Label>
              <Input
                value={form.student_name}
                onChange={(e) => setForm({ ...form, student_name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Classes/week</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.classes_per_week}
                  onChange={(e) => setForm({ ...form, classes_per_week: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Note: This is informational. To schedule multiple classes per week, you must manually create a separate recurring class for each day.
                </p>
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(val) => setForm({ ...form, currency: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Course Type</Label>
              <Select
                value={form.course_type}
                onValueChange={(val: 'Native English' | 'Conversation Club') => setForm({ ...form, course_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Native English">Native English (Grammar + Reading + Listening)</SelectItem>
                  <SelectItem value="Conversation Club">Conversation Club</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>CPF (optional)</Label>
              <Input
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <Label>Preferred Shift / Times (optional)</Label>
              <Input
                value={form.preferred_schedule}
                onChange={(e) => setForm({ ...form, preferred_schedule: e.target.value })}
                placeholder="e.g. Morning, 10am"
              />
            </div>

            <div>
              <Label>Source (optional)</Label>
              <Select
                value={form.source}
                onValueChange={(val) => setForm({ ...form, source: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How did they hear about us?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referral">Referral (Indicated by student)</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="ads">Ads</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.source === 'referral' && (
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                <Label className="text-purple-800">Who referred them?</Label>
                <Select
                  value={form.referred_by}
                  onValueChange={(val) => setForm({ ...form, referred_by: val })}
                >
                  <SelectTrigger className="bg-white mt-1">
                    <SelectValue placeholder="Select a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unknown / Not in list</SelectItem>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.student_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment amount</Label>
                <Input
                  value={form.payment_amount}
                  onChange={(e) => setForm({ ...form, payment_amount: e.target.value })}
                  placeholder="e.g. 250.00"
                />
              </div>
              <div>
                <Label>Due Day</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.payment_due_day}
                  onChange={(e) => setForm({ ...form, payment_due_day: Number(e.target.value) })}
                  placeholder="e.g. 5"
                />
              </div>
            </div>

            <Button className="w-full" onClick={handleCreateStudent} disabled={loading}>
              {loading ? "Creating..." : "Create Student"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT STUDENT MODAL */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[75vh] overflow-y-auto px-2 custom-scrollbar">
            <div>
              <Label>Student Name</Label>
              <Input
                value={form.student_name}
                onChange={(e) => setForm({ ...form, student_name: e.target.value })}
              />
            </div>

            <div>
              <Label>New Password (optional)</Label>
              <Input
                type="text"
                placeholder="Leave blank to keep unchanged"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Classes/week</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.classes_per_week}
                  onChange={(e) => setForm({ ...form, classes_per_week: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Note: This is informational. To schedule multiple classes per week, you must manually create a separate recurring class for each day.
                </p>
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(val) => setForm({ ...form, currency: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Course Type</Label>
              <Select
                value={form.course_type}
                onValueChange={(val: 'Native English' | 'Conversation Club') => setForm({ ...form, course_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Native English">Native English (Grammar + Reading + Listening)</SelectItem>
                  <SelectItem value="Conversation Club">Conversation Club</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>CPF (optional)</Label>
              <Input
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              />
            </div>

            <div>
              <Label>Preferred Shift / Times (optional)</Label>
              <Input
                value={form.preferred_schedule}
                onChange={(e) => setForm({ ...form, preferred_schedule: e.target.value })}
              />
            </div>

            <div>
              <Label>Source (optional)</Label>
              <Select
                value={form.source}
                onValueChange={(val) => setForm({ ...form, source: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How did they hear about us?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referral">Referral (Indicated by student)</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="ads">Ads</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.source === 'referral' && (
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                <Label className="text-purple-800">Who referred them?</Label>
                <Select
                  value={form.referred_by}
                  onValueChange={(val) => setForm({ ...form, referred_by: val })}
                >
                  <SelectTrigger className="bg-white mt-1">
                    <SelectValue placeholder="Select a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unknown / Not in list</SelectItem>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.student_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Payment amount</Label>
                <Input
                  value={form.payment_amount}
                  onChange={(e) => setForm({ ...form, payment_amount: e.target.value })}
                  placeholder="e.g. 250.00"
                />
              </div>
              <div>
                <Label>Due Day</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.payment_due_day}
                  onChange={(e) => setForm({ ...form, payment_due_day: Number(e.target.value) })}
                  placeholder="e.g. 5"
                />
              </div>
            </div>

            <div>
              <Label>Student Status</Label>
              <Select
                value={form.status}
                onValueChange={(val) => setForm({ ...form, status: val as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="stopped" className="text-red-600">Stopped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancel</Button>
              <Button onClick={handleUpdateStudent} disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>


      {/* DELETE CONFIRM MODAL */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Student</DialogTitle>
          </DialogHeader>

          <p className="text-sm">
            Are you sure you want to permanently delete{" "}
            <strong>{selectedStudent?.student_name}</strong>?
            <br />
            This action cannot be undone.
          </p>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpenDelete(false)}>
              Cancel
            </Button>

            <Button variant="destructive" onClick={handleDeleteStudent} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminStudents
