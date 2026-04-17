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
import { Pencil, Trash2, CheckCircle, ArrowLeft, RotateCcw } from "lucide-react"

interface Recuperation {
  id: string
  student_id: string
  status: 'pending' | 'completed' | 'cancelled'
  date: string
  notes: string
  student_name?: string
}

interface Student {
  id: string
  student_name: string
}

const AdminRecuperations: React.FC = () => {
  const { toast } = useToast()

  const [recuperations, setRecuperations] = useState<Recuperation[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [selectedRecuperation, setSelectedRecuperation] = useState<Recuperation | null>(null)
  const [loading, setLoading] = useState(false)
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null)

  const [form, setForm] = useState({
    student_id: "",
    status: "pending",
    date: "",
    notes: "",
    quantity: 1,
  })

  const loadData = async () => {
    try {
      const { data: stds, error: stdError } = await supabase
        .from('students')
        .select('id, student_name')
        .order('student_name')
      if (stdError) throw stdError

      const { data: recups, error: recupError } = await supabase
        .from('recuperation_classes')
        .select('*')
        .order('created_at', { ascending: false })
      if (recupError) throw recupError

      const studentMap = (stds || []).reduce((acc, curr) => {
        acc[curr.id] = curr.student_name
        return acc
      }, {} as Record<string, string>)

      const enriched = (recups || []).map(r => ({
        ...r,
        student_name: studentMap[r.student_id] || 'Unknown Student'
      }))

      setStudents(stds || [])
      setRecuperations(enriched)
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" })
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = async () => {
    if (!form.student_id) {
      toast({ title: "Validation Error", description: "Please select a student.", variant: "destructive" })
      return
    }

    try {
      setLoading(true)
      const qty = Math.max(1, form.quantity || 1)
      const inserts = Array.from({ length: qty }).map(() => ({
        student_id: form.student_id,
        status: form.status,
        date: form.date || null,
        notes: form.notes || null
      }))

      const { error } = await supabase
        .from('recuperation_classes')
        .insert(inserts)

      if (error) throw error

      toast({ title: "Success", description: `${qty} Recuperation class(es) added successfully.` })
      setOpenCreate(false)
      loadData()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedRecuperation) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('recuperation_classes')
        .update({
          status: form.status,
          date: form.date || null,
          notes: form.notes || null
        })
        .eq('id', selectedRecuperation.id)

      if (error) throw error

      toast({ title: "Success", description: "Recuperation updated successfully." })
      setOpenEdit(false)
      loadData()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRecuperation) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('recuperation_classes')
        .delete()
        .eq('id', selectedRecuperation.id)

      if (error) throw error

      toast({ title: "Success", description: "Recuperation deleted successfully." })
      setOpenDelete(false)
      loadData()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleMarkCompleted = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      setLoading(true)
      const { error } = await supabase
        .from('recuperation_classes')
        .update({ status: 'completed' })
        .eq('id', id)

      if (error) throw error

      toast({ title: "Success", description: "Class marked as completed!" })
      loadData()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  // Derive top-level list
  const studentStats = Array.from(new Set(recuperations.map(r => r.student_id))).map(studentId => {
    const recups = recuperations.filter(r => r.student_id === studentId);
    return {
      studentId,
      student_name: recups[0].student_name || 'Unknown',
      pendingCount: recups.filter(r => r.status === 'pending').length,
      totalCount: recups.length
    }
  })

  const openCreateModal = (prefillStudentId = "") => {
    setForm({ student_id: prefillStudentId, status: "pending", date: "", notes: "", quantity: 1 }); 
    setOpenCreate(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Recuperation Classes</h2>
          <p className="text-muted-foreground">Manage student recuperation rights</p>
        </div>
        <Button onClick={() => openCreateModal(viewingStudentId || "")}>
          Add Recuperation
        </Button>
      </div>

      {!viewingStudentId ? (
        // Master View: List by Student
        <div className="space-y-4">
          <h3 className="font-medium text-lg border-b pb-2">Students with Recuperations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentStats.length === 0 ? (
              <p className="text-muted-foreground">No students have recuperation rights yet.</p>
            ) : (
              studentStats.map(stat => (
                <Card 
                  key={stat.studentId} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-blue-100"
                  onClick={() => setViewingStudentId(stat.studentId)}
                >
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{stat.student_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {stat.totalCount} total classes
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                        stat.pendingCount > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {stat.pendingCount} Pending
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      ) : (
        // Detail View: Cards for specific student
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" onClick={() => setViewingStudentId(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <h3 className="font-medium text-lg">
              Recuperation Classes for {studentStats.find(s => s.studentId === viewingStudentId)?.student_name}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recuperations
              .filter(r => r.student_id === viewingStudentId)
              .sort((a, b) => {
                if (a.status === 'completed' && b.status !== 'completed') return -1;
                if (a.status !== 'completed' && b.status === 'completed') return 1;
                return 0;
              })
              .map(r => (
                <Card key={r.id} className="relative border-slate-200">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex justify-between items-start pr-6">
                      <div className="flex gap-2 items-center">
                        <RotateCcw className="w-4 h-4 text-blue-500" />
                        <h3 className="font-semibold text-md">Recuperation</h3>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        r.status === 'completed' ? 'bg-green-100 text-green-700' :
                        r.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {r.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-sm space-y-1 text-slate-700">
                      <p><span className="font-medium">Date:</span> {r.date ? r.date : "Not assigned"}</p>
                      {r.notes && <p className="italic"><span className="font-medium text-slate-500">Note:</span> {r.notes}</p>}
                    </div>

                    {r.status === 'pending' && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full mt-2 bg-green-50 text-green-700 hover:bg-green-100"
                        onClick={(e) => handleMarkCompleted(r.id, e)}
                        disabled={loading}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Completed
                      </Button>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedRecuperation(r)
                          setForm({ student_id: r.student_id, status: r.status, date: r.date || '', notes: r.notes || '', quantity: 1 })
                          setOpenEdit(true)
                        }}
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      {r.status !== 'completed' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedRecuperation(r)
                            setOpenDelete(true)
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Recuperation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Student</Label>
              <Select value={form.student_id} onValueChange={(val) => setForm({...form, student_id: val})}>
                <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => <SelectItem key={s.id} value={s.id}>{s.student_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(val) => setForm({...form, status: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm({...form, quantity: parseInt(e.target.value) || 1})} />
            </div>
            <div>
              <Label>Date / Info</Label>
              <Input value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} placeholder="e.g. 20/10/2025 or n/m" />
            </div>
            <div>
              <Label>Internal Note (Admin only)</Label>
              <Input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="e.g. *no 24h advance notice" />
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={loading}>
              {loading ? "Saving..." : "Add"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Recuperation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(val) => setForm({...form, status: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date / Info</Label>
              <Input value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} placeholder="e.g. 20/10/2025" />
            </div>
            <div>
              <Label>Internal Note (Admin only)</Label>
              <Input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="e.g. *no 24h advance notice" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={loading}>Save</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Recuperation</DialogTitle></DialogHeader>
          <p>Are you sure you want to delete this recuperation right for <strong>{selectedRecuperation?.student_name}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminRecuperations
