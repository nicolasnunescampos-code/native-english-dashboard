import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, addDays, parseISO } from 'date-fns'
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useToast } from '@/hooks/use-toast'

type ClassRecord = {
  id: string
  student_name: string
  title: string
  date: string
  time: string
  link_url: string | null
}

export default function AdminClasses() {
  const { toast } = useToast()

  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [students, setStudents] = useState<{ id: string, name: string }[]>([])
  const [teachers, setTeachers] = useState<{ id: string, name: string, meet_link: string }[]>([])
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [openAdd, setOpenAdd] = useState(false)
  const [openStudentPopover, setOpenStudentPopover] = useState(false)
  const [selected, setSelected] = useState<ClassRecord | null>(null)

  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formTeacher, setFormTeacher] = useState('')
  const [formLink, setFormLink] = useState('')

  const [addForm, setAddForm] = useState({
    student_name: '',
    title: '', // Teacher
    date: '',
    time: '',
    link_url: ''
  })

  // ─────────────────────────────────────────────
  // LOAD CLASSES (NEXT 7 DAYS)
  // ─────────────────────────────────────────────
  const loadClasses = async () => {
    setLoading(true)

    const today = format(new Date(), 'yyyy-MM-dd')
    const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('classes')
      .select('id, student_name, title, date, time, link_url')
      .gte('date', today)
      .lte('date', nextWeek)
      .order('date', { ascending: true })
      .order('time', { ascending: true })

    if (!error && data) {
      setClasses(data)
    }

    // Load students for the dropdown
    const { data: stds, error: stdsError } = await supabase
      .from('students')
      .select('id, student_name')
      .order('student_name', { ascending: true })

    if (!stdsError && stds) {
      setStudents(stds.map(s => ({ id: s.id, name: s.student_name })))
    }

    // Load teachers for the dropdown
    const { data: tchs, error: tchsErr } = await supabase
      .from('teachers')
      .select('id, name, meet_link')
      .order('name', { ascending: true })

    if (!tchsErr && tchs) {
      setTeachers(tchs)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadClasses()
  }, [])

  // ─────────────────────────────────────────────
  // GROUP BY DAY
  // ─────────────────────────────────────────────
  const grouped = React.useMemo(() => {
    const map: Record<string, ClassRecord[]> = {}
    const dateMap: Record<string, string> = {} // First date found for this weekday, for sorting

    for (const cls of classes) {
      // cls.date is usually YYYY-MM-DD
      const [y, m, d] = cls.date.split("-").map(Number)
      const dateObj = new Date(y, m - 1, d)
      const weekday = dateObj.toLocaleDateString("en-US", {
        weekday: "long",
      })

      if (!map[weekday]) {
        map[weekday] = []
        // Store the sorting key if not present
        dateMap[weekday] = cls.date
      }
      map[weekday].push(cls)
    }

    // Sort days by earliest date found
    return Object.entries(map).sort((a, b) => {
      const dateA = dateMap[a[0]]
      const dateB = dateMap[b[0]]
      return dateA.localeCompare(dateB)
    })
  }, [classes])


  // ─────────────────────────────────────────────
  // DELETE CLASS
  // ─────────────────────────────────────────────
  const deleteClass = async () => {
    if (!selected) return

    const confirmDelete = window.confirm("Are you sure you want to delete this class?")
    if (!confirmDelete) return

    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', selected.id)

    if (error) {
      toast({
        title: "Error deleting class",
        description: error.message,
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Class deleted",
      description: "The class has been removed successfully."
    })

    setOpen(false)
    setSelected(null)
    loadClasses()
  }

  // ─────────────────────────────────────────────
  // OPEN MODAL
  // ─────────────────────────────────────────────
  const openReschedule = (cls: ClassRecord) => {
    setSelected(cls)
    setFormDate(cls.date)
    setFormTime(cls.time)
    setFormTeacher(cls.title)
    setFormLink(cls.link_url || '')
    setOpen(true)
  }

  // ─────────────────────────────────────────────
  // SAVE UPDATE
  // ─────────────────────────────────────────────
  const saveChanges = async () => {
    if (!selected) return

    await supabase
      .from('classes')
      .update({
        date: formDate,
        time: formTime,
        title: formTeacher,
        link_url: formLink,
      })
      .eq('id', selected.id)

    setOpen(false)
    setSelected(null)
    loadClasses()
  }

  // ─────────────────────────────────────────────
  // CREATE NEW CLASS
  // ─────────────────────────────────────────────
  const saveNewClass = async () => {
    if (!addForm.student_name || !addForm.date || !addForm.time || !addForm.title) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    const newEventId = `manual-${Date.now()}`

    const { error } = await supabase
      .from('classes')
      .insert({
        student_name: addForm.student_name,
        title: addForm.title,
        date: addForm.date,
        time: addForm.time,
        link_url: addForm.link_url || null,
        class_level: 'Beginner', // Default required by schema
        status: 'published', // Always publish immediately
        event_id: newEventId,
      })

    if (error) {
      console.error("Error inserting class:", error)
      toast({
        title: "Error creating class",
        description: error.message,
        variant: "destructive"
      })
      return
    }

    toast({
      title: "Class added",
      description: "The class was added successfully."
    })

    setOpenAdd(false)
    setAddForm({ student_name: '', title: '', date: '', time: '', link_url: '' })
    loadClasses()
  }

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Class Schedule</h1>
          <p className="text-muted-foreground">
            View, schedule, and reschedule classes
          </p>
        </div>
        <Button onClick={() => setOpenAdd(true)}>Add Class</Button>
      </div>

      {loading ? (
        <p>Loading classes…</p>
      ) : classes.length === 0 ? (
        <p>No classes scheduled</p>
      ) : (
        <div className="space-y-8">
          {grouped.map(([day, dayClasses]) => (
            <div key={day} className="space-y-3">
              <h2 className="text-xl font-semibold text-primary">{day}</h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {dayClasses.map((cls) => (
                      <TableRow key={cls.id}>
                        <TableCell>{cls.student_name}</TableCell>
                        <TableCell>{cls.title}</TableCell>
                        <TableCell>
                          {format(parseISO(cls.date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>{cls.time}</TableCell>
                        <TableCell>
                          {cls.link_url ? (
                            <a
                              href={cls.link_url}
                              target="_blank"
                              className="text-primary underline"
                            >
                              Open
                            </a>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReschedule(cls)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Class</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
              />
            </div>

            <div>
              <Label>Teacher</Label>
              <Select
                value={formTeacher}
                onValueChange={(val) => {
                  setFormTeacher(val);
                  const teacher = teachers.find(t => t.name === val);
                  if (teacher && teacher.meet_link) {
                    setFormLink(teacher.meet_link);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Meet link</Label>
              <Input
                value={formLink}
                onChange={(e) => setFormLink(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="sm:justify-between w-full">
            <Button variant="destructive" onClick={deleteClass} type="button">
              Delete
            </Button>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveChanges}>Save</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADD CLASS MODAL */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Class</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label>Student Name</Label>
              <Popover open={openStudentPopover} onOpenChange={setOpenStudentPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openStudentPopover}
                    className="w-full justify-between font-normal"
                  >
                    {addForm.student_name
                      ? students.find((student) => student.name === addForm.student_name)?.name
                      : "Select a student"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search student..." />
                    <CommandList>
                      <CommandEmpty>No student found.</CommandEmpty>
                      <CommandGroup>
                        {students.map((student) => (
                          <CommandItem
                            key={student.id}
                            value={student.name}
                            onSelect={() => {
                              setAddForm({ ...addForm, student_name: student.name })
                              setOpenStudentPopover(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                addForm.student_name === student.name ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {student.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Teacher</Label>
              <Select
                value={addForm.title}
                onValueChange={(val) => {
                  const teacher = teachers.find(t => t.name === val);
                  setAddForm({ 
                    ...addForm, 
                    title: val, 
                    link_url: teacher?.meet_link || addForm.link_url 
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={addForm.date}
                  onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                />
              </div>

              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={addForm.time}
                  onChange={(e) => setAddForm({ ...addForm, time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Meet link (optional)</Label>
              <Input
                value={addForm.link_url}
                onChange={(e) => setAddForm({ ...addForm, link_url: e.target.value })}
                placeholder="https://meet.google.com/..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAdd(false)}>
              Cancel
            </Button>
            <Button onClick={saveNewClass}>Save Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
