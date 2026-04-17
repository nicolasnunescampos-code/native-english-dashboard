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
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2 } from "lucide-react"

interface Teacher {
    id: string
    name: string
    color: string
    meet_link?: string | null
}

const AdminTeachers: React.FC = () => {
    const { toast } = useToast()

    const [teachers, setTeachers] = useState<Teacher[]>([])
    const [openCreate, setOpenCreate] = useState(false)
    const [openEdit, setOpenEdit] = useState(false)
    const [openDelete, setOpenDelete] = useState(false)
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
    const [loading, setLoading] = useState(false)

    const [form, setForm] = useState({
        email: "",
        password: "",
        name: "",
        color: "#3b82f6",
        meet_link: "",
    })

    // =========================
    // FETCH TEACHERS
    // =========================
    const fetchTeachers = async () => {
        const { data, error } = await supabase
            .from("teachers")
            .select("*")
            .order("name")

        if (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            })
            return
        }

        setTeachers(data || [])
    }

    useEffect(() => {
        fetchTeachers()
    }, [])

    // =========================
    // RESET FORM
    // =========================
    const resetForm = () => {
        setForm({
            email: "",
            password: "",
            name: "",
            color: "#3b82f6",
            meet_link: "",
        })
    }

    // =========================
    // CREATE TEACHER
    // =========================
    const handleCreateTeacher = async () => {
        if (loading) return;
        if (!form.email || !form.password || !form.name) {
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

            const { error } = await supabase.functions.invoke("create-user", {
                body: {
                    role: 'teacher',
                    email: form.email.toLowerCase(),
                    password: form.password,
                    name: form.name,
                    color: form.color,
                    meet_link: form.meet_link,
                },
            })

            if (error) throw error

            toast({
                title: "Teacher created",
                description: "Teacher created successfully.",
            })

            setOpenCreate(false)
            resetForm()
            fetchTeachers()
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
    // EDIT TEACHER
    // =========================
    const handleEditClick = (teacher: Teacher) => {
        setSelectedTeacher(teacher)
        // Email/password cannot be easily retrieved from teachers table
        setForm({
            email: "", // Might be complicated to edit email cleanly without auth calls
            password: "",
            name: teacher.name,
            color: teacher.color,
            meet_link: teacher.meet_link || "",
        })
        setOpenEdit(true)
    }

    const handleUpdateTeacher = async () => {
        if (!selectedTeacher) return

        try {
            setLoading(true)
            const { error } = await supabase
                .from('teachers')
                .update({
                    name: form.name,
                    color: form.color,
                    meet_link: form.meet_link,
                })
                .eq('id', selectedTeacher.id)

            if (error) throw error

            toast({
                title: "Teacher updated",
                description: "Changes saved successfully.",
            })

            setOpenEdit(false)
            fetchTeachers()
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
    // DELETE TEACHER
    // =========================
    const handleDeleteTeacher = async () => {
        if (!selectedTeacher) return

        try {
            setLoading(true)

            // We'll just call delete-user if we make it, or use delete-student since it's probably generic
            // actually since we don't have delete-user yet, let's call delete-student under the hood (assuming it deletes auth user by ID)
            const { error } = await supabase.functions.invoke("delete-student", {
                body: {
                    student_id: selectedTeacher.id,
                },
            })

            if (error) throw error

            toast({
                title: "Teacher deleted",
                description: `${selectedTeacher.name} was removed completely.`,
            })

            setOpenDelete(false)
            setSelectedTeacher(null)
            fetchTeachers()
        } catch (err: any) {
            toast({
                title: "Delete failed",
                description: err.message || "Could not delete teacher",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Manage Teachers</h2>
                <Button onClick={() => { resetForm(); setOpenCreate(true); }}>Add Teacher</Button>
            </div>

            {/* LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teachers.map((teacher) => (
                    <Card key={teacher.id}>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: teacher.color || '#3b82f6' }}
                                />
                                <div>
                                    <h3 className="font-semibold text-lg">{teacher.name}</h3>
                                </div>
                            </div>

                            {teacher.meet_link && (
                                <div className="text-sm">
                                    <a href={teacher.meet_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                        Meet Link
                                    </a>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleEditClick(teacher)}
                                >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Edit
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => {
                                        setSelectedTeacher(teacher)
                                        setOpenDelete(true)
                                    }}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* CREATE MODAL */}
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Teacher</DialogTitle>
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
                            <Label>Name</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Color (Hex)</Label>
                                <Input
                                    type="text"
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Color Picker</Label>
                                <Input
                                    type="color"
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                    className="p-1 h-10"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Google Meet Link</Label>
                            <Input
                                value={form.meet_link}
                                onChange={(e) => setForm({ ...form, meet_link: e.target.value })}
                                placeholder="https://meet.google.com/..."
                            />
                        </div>

                        <Button className="w-full" onClick={handleCreateTeacher} disabled={loading}>
                            {loading ? "Creating..." : "Create Teacher"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* EDIT MODAL */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Teacher</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Name</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Color (Hex)</Label>
                                <Input
                                    type="text"
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label>Color Picker</Label>
                                <Input
                                    type="color"
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                    className="p-1 h-10"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Google Meet Link</Label>
                            <Input
                                value={form.meet_link}
                                onChange={(e) => setForm({ ...form, meet_link: e.target.value })}
                            />
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancel</Button>
                            <Button onClick={handleUpdateTeacher} disabled={loading}>
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
                        <DialogTitle>Delete Teacher</DialogTitle>
                    </DialogHeader>

                    <p className="text-sm">
                        Are you sure you want to permanently delete{" "}
                        <strong>{selectedTeacher?.name}</strong>?
                        <br />
                        This action cannot be undone.
                    </p>

                    <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setOpenDelete(false)}>
                            Cancel
                        </Button>

                        <Button variant="destructive" onClick={handleDeleteTeacher} disabled={loading}>
                            {loading ? "Deleting..." : "Delete"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default AdminTeachers
