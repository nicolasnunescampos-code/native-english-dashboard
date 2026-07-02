'use client';

import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
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
import { Pencil, Trash2, History } from "lucide-react"

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
  course_type?: 'Native English' | 'Conversation Club' | 'Business English'
}

const AdminStudents: React.FC = () => {
  const { toast } = useToast()

  const [students, setStudents] = useState<Student[]>([])
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(false)
  const [showStopped, setShowStopped] = useState(false)

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
    course_type: 'Native English' | 'Conversation Club' | 'Business English'
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
  })

  // =========================
  // FETCH STUDENTS
  // =========================
  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("student_name")

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
      return
    }

    setStudents(data || [])
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
    })
  }

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
          ...(form.status === 'stopped' && selectedStudent.status !== 'stopped' ? { stopped_at: new Date().toISOString() } : {}),
          ...(form.status === 'active' && selectedStudent.status === 'stopped' ? { stopped_at: null } : {})
        })
        .eq('id', selectedStudent.id)

      if (error) throw error

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
  const displayStudents = showStopped 
    ? students.filter(s => s.status === 'stopped')
    : students.filter(s => s.status !== 'stopped')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold">Manage Students</h2>
          <p className="text-sm text-muted-foreground mt-1">Add, edit, or remove students from your system.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
            <input 
              type="checkbox" 
              className="rounded border-gray-300 w-4 h-4"
              checked={showStopped}
              onChange={(e) => setShowStopped(e.target.checked)}
            />
            Show Stopped Students Only
          </label>
          <Button onClick={() => { resetForm(); setOpenCreate(true); }}>Add Student</Button>
        </div>
      </div>

      {/* STUDENT LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayStudents.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground">
            No students found.
          </div>
        ) : (
          displayStudents.map((student) => (
            <Card key={student.id} className={student.status === 'stopped' ? 'opacity-70 grayscale-[0.3]' : ''}>
            <CardContent className="p-6 space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{student.student_name}</h3>
                <p className="text-sm text-muted-foreground">{student.email}</p>
                <div className="mt-2 flex gap-2">
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
                {student.payment_amount && (
                  <p className="font-medium text-green-700">
                    💳 {student.currency || 'BRL'} {student.payment_amount}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEditClick(student)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(`/admin/student-history?student=${encodeURIComponent(student.student_name)}`, '_blank')}
                >
                  <History className="w-4 h-4 mr-2" />
                  History
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
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )))}
      </div>

      {/* CREATE STUDENT MODAL */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Student</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
                onValueChange={(val: 'Native English' | 'Conversation Club' | 'Business English') => setForm({ ...form, course_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Native English">Native English (Grammar + Entertainment)</SelectItem>
                  <SelectItem value="Conversation Club">Conversation Club</SelectItem>
                  <SelectItem value="Business English">Business English</SelectItem>
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

          <div className="space-y-4">
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
                onValueChange={(val: 'Native English' | 'Conversation Club' | 'Business English') => setForm({ ...form, course_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Native English">Native English (Grammar + Entertainment)</SelectItem>
                  <SelectItem value="Conversation Club">Conversation Club</SelectItem>
                  <SelectItem value="Business English">Business English</SelectItem>
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