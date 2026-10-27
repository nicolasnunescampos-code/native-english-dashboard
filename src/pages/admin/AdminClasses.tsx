import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, addDays, parseISO, nextFriday, isFriday } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { Check, ChevronsUpDown, Calendar as CalendarIcon, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { UnscheduledRecuperationsTray } from '@/components/calendar/UnscheduledRecuperationsTray'
import { 
  PendingRecuperationItem, 
  syncRecuperationsStatus, 
  grantRecuperationCredit, 
  linkRecuperationToScheduledClass,
  fetchPendingRecuperations
} from '@/utils/recuperationSync'
import { openGoogleCalendarEvent } from '@/utils/googleCalendar'

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

const extractTeacherName = (title: string) => {
  if (!title) return '';
  const parts = title.split(' - ');
  return parts.length > 1 ? parts[1].trim() : title;
};

type ClassRecord = {
  id: string
  student_name: string
  title: string
  date: string
  time: string
  timezone?: string
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
  const [formTimezone, setFormTimezone] = useState('America/Sao_Paulo')
  const [formTeacher, setFormTeacher] = useState('')
  const [formLink, setFormLink] = useState('')

  const [pendingRecuperations, setPendingRecuperations] = useState<PendingRecuperationItem[]>([])

  const [addForm, setAddForm] = useState<{
    student_names: string[];
    teacher_name: string;
    date: string;
    time: string;
    timezone: string;
    link_url: string;
    recuperation_id?: string;
  }>({
    student_names: [],
    teacher_name: '',
    date: '',
    time: '',
    timezone: 'America/Sao_Paulo',
    link_url: ''
  })

  // Generate 30-min interval times with AM/PM
  const timeOptions = React.useMemo(() => {
    const options = []
    for (let h = 0; h < 24; h++) {
      for (const m of ['00', '30']) {
        const isPM = h >= 12
        const displayH = h % 12 === 0 ? 12 : h % 12
        const ampm = isPM ? 'PM' : 'AM'
        const value = `${h.toString().padStart(2, '0')}:${m}`
        const label = `${displayH}:${m} ${ampm}`
        options.push({ label, value })
      }
    }
    return options
  }, [])

  // ─────────────────────────────────────────────
  // LOAD CLASSES (NEXT 7 DAYS)
  // ─────────────────────────────────────────────
  const loadClasses = async () => {
    setLoading(true)

    const today = format(new Date(), 'yyyy-MM-dd')
    const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd')

    const { data, error } = await supabase
      .from('classes')
      .select('id, student_name, title, date, time, timezone, link_url')
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
      const mappedStudents = stds.map(s => ({ id: s.id, name: s.student_name }))
      setStudents(mappedStudents)
    }
    loadPendingRecuperations()

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

  const loadPendingRecuperations = async () => {
    try {
      const enriched = await fetchPendingRecuperations()
      setPendingRecuperations(enriched)
    } catch (err: any) {
      console.error('Failed to load pending recuperations:', err)
    }
  }

  useEffect(() => {
    loadClasses()

    const channel = supabase
      .channel('admin_classes_recuperations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recuperation_classes' }, () => {
        loadPendingRecuperations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleScheduleFromTray = (item: PendingRecuperationItem) => {
    const today = new Date()
    const defaultDate = isFriday(today) ? addDays(today, 7) : nextFriday(today)
    const defaultDateStr = format(defaultDate, 'yyyy-MM-dd')

    const student = students.find(s => s.id === item.student_id)
    const studentName = student?.name || item.student_name

    setAddForm({
      student_names: [studentName],
      teacher_name: '',
      date: defaultDateStr,
      time: '10:00',
      timezone: 'America/Sao_Paulo',
      link_url: '',
      recuperation_id: item.id,
    })
    setOpenAdd(true)
  }

  const handleDismissFromTray = async (item: PendingRecuperationItem) => {
    if (!confirm(`Mark recuperation for ${item.student_name} as resolved?`)) return
    try {
      await supabase
        .from('recuperation_classes')
        .update({ status: 'completed', notes: `${item.notes || ''} — [Dismissed/Resolved by admin]` })
        .eq('id', item.id)
      toast({ title: 'Recuperation resolved', description: `Marked completed for ${item.student_name}` })
      loadPendingRecuperations()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleCourtesyReschedule = async () => {
    if (!selected) return

    const confirmResched = window.confirm(
      `Cancel this class and grant a recuperation credit to ${selected.student_name}?`
    )
    if (!confirmResched) return

    try {
      const studentMatch = students.find(
        s => s.name.toLowerCase() === selected.student_name.toLowerCase()
      )
      const studentId = studentMatch?.id || ''

      const { error: delError } = await supabase
        .from('classes')
        .delete()
        .eq('id', selected.id)

      if (delError) throw delError

      if (studentId) {
        await grantRecuperationCredit({
          studentId,
          studentName: selected.student_name,
          originalDate: selected.date,
          originalTime: selected.time,
          reason: 'Courtesy reschedule by admin',
        })
      }

      toast({
        title: 'Courtesy credit granted',
        description: `Class cancelled. 1 recuperation credit added for ${selected.student_name}.`,
      })

      setOpen(false)
      setSelected(null)
      loadClasses()
      loadPendingRecuperations()
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  // ─────────────────────────────────────────────
  // GROUP BY DAY
  // ─────────────────────────────────────────────
  const grouped = React.useMemo(() => {
    const map: Record<string, ClassRecord[]> = {}
    const dateMap: Record<string, string> = {} // First date found for this weekday, for sorting

    for (const cls of classes) {
      // cls.date is usually YYYY-MM-DD
      let dateObj = new Date(cls.date + 'T00:00:00')
      if (cls.timezone && cls.time) {
        try {
          dateObj = fromZonedTime(`${cls.date} ${cls.time}:00`, cls.timezone)
        } catch(e) {}
      } else {
        const [y, m, d] = cls.date.split("-").map(Number)
        dateObj = new Date(y, m - 1, d)
      }

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
    setFormTimezone(cls.timezone || 'America/Sao_Paulo')
    setFormTeacher(extractTeacherName(cls.title))
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
        timezone: formTimezone,
        title: `${selected.student_name}'s class - ${formTeacher}`,
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
    if (addForm.student_names.length === 0 || !addForm.date || !addForm.time || !addForm.teacher_name) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    const newEventId = `manual-${Date.now()}`

    const { data: inserted, error } = await supabase
      .from('classes')
      .insert({
        student_name: addForm.student_names.join(', '),
        title: `${addForm.student_names.join(', ')}'s class - ${addForm.teacher_name}`,
        date: addForm.date,
        time: addForm.time,
        timezone: addForm.timezone,
        link_url: addForm.link_url || null,
        class_level: 'Beginner', // Default required by schema
        status: 'published', // Always publish immediately
        event_id: newEventId,
      })
      .select()

    if (error) {
      console.error("Error inserting class:", error)
      toast({
        title: "Error creating class",
        description: error.message,
        variant: "destructive"
      })
      return
    }

    if (addForm.recuperation_id && inserted && inserted.length > 0) {
      await linkRecuperationToScheduledClass({
        recuperationId: addForm.recuperation_id,
        classId: inserted[0].id,
        classDate: addForm.date,
        classTime: addForm.time,
        teacherName: addForm.teacher_name,
      })
      loadPendingRecuperations()
      toast({
        title: "Extra Class Scheduled",
        description: `Scheduled for ${addForm.date} at ${addForm.time}. Remember to add to your personal Google Calendar!`
      })
    } else {
      toast({
        title: "Class added",
        description: "The class was added successfully."
      })
    }

    setOpenAdd(false)
    setAddForm({ student_names: [], teacher_name: '', date: '', time: '', timezone: 'America/Sao_Paulo', link_url: '' })
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

      {/* UNSCHEDULED RECUPERATIONS STAGING TRAY */}
      <UnscheduledRecuperationsTray
        pendingRecuperations={pendingRecuperations}
        loading={loading}
        onSchedule={handleScheduleFromTray}
        onDismiss={handleDismissFromTray}
        onRefresh={loadPendingRecuperations}
      />

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
                    {dayClasses.map((cls) => {
                      let displayDate = format(parseISO(cls.date), 'dd/MM/yyyy')
                      let displayTime = cls.time
                      
                      if (cls.timezone) {
                        try {
                          const utcDate = fromZonedTime(`${cls.date} ${cls.time}:00`, cls.timezone)
                          displayDate = format(utcDate, 'dd/MM/yyyy')
                          displayTime = format(utcDate, 'HH:mm')
                        } catch(e) {}
                      }

                      return (
                      <TableRow key={cls.id}>
                        <TableCell>{cls.student_name}</TableCell>
                        <TableCell>{cls.title}</TableCell>
                        <TableCell>{displayDate}</TableCell>
                        <TableCell>{displayTime}</TableCell>
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
                    )})}
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
              <Select
                value={formTime}
                onValueChange={(val) => setFormTime(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Timezone</Label>
              <Select
                value={formTimezone}
                onValueChange={(val) => setFormTimezone(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">New York</SelectItem>
                  <SelectItem value="America/Sao_Paulo">São Paulo</SelectItem>
                </SelectContent>
              </Select>
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

          <DialogFooter className="sm:justify-between w-full flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Button variant="destructive" onClick={deleteClass} type="button" size="sm">
                Delete
              </Button>
              <Button
                variant="outline"
                onClick={handleCourtesyReschedule}
                type="button"
                size="sm"
                className="border-amber-300 bg-amber-50/50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800 text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Courtesy Reschedule
              </Button>
              {selected && (
                <Button
                  variant="outline"
                  type="button"
                  size="sm"
                  onClick={() => {
                    openGoogleCalendarEvent({
                      title: selected.title,
                      date: formDate,
                      startTime: formTime || '10:00',
                      endTime: '10:50',
                      timezone: formTimezone,
                      description: `Teacher: ${formTeacher}\nStudent: ${selected.student_name}\nMeet Link: ${formLink}`,
                      location: formLink,
                    });
                  }}
                  className="border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 text-xs"
                >
                  <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                  Add to GCal
                </Button>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={saveChanges}>Save</Button>
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
                    className="w-full justify-between font-normal h-auto min-h-[40px] whitespace-normal text-left"
                  >
                    {addForm.student_names.length > 0
                      ? addForm.student_names.join(', ')
                      : "Select students..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search student..." />
                    <CommandList>
                      <CommandEmpty>No student found.</CommandEmpty>
                      <CommandGroup>
                        {students.map((student) => {
                          const isSelected = addForm.student_names.includes(student.name);
                          return (
                            <CommandItem
                              key={student.id}
                              value={student.name}
                              onSelect={() => {
                                setAddForm(prev => {
                                  if (isSelected) {
                                    return { ...prev, student_names: prev.student_names.filter(n => n !== student.name) };
                                  } else {
                                    return { ...prev, student_names: [...prev.student_names, student.name] };
                                  }
                                });
                              }}
                            >
                              <div className={cn(
                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible"
                              )}>
                                <Check className="h-3 w-3" />
                              </div>
                              {student.name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Teacher</Label>
              <Select
                value={addForm.teacher_name}
                onValueChange={(val) => {
                  const teacher = teachers.find(t => t.name === val);
                  setAddForm({ 
                    ...addForm, 
                    teacher_name: val, 
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
                <Select
                  value={addForm.time}
                  onValueChange={(val) => setAddForm({ ...addForm, time: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Timezone</Label>
                <Select
                  value={addForm.timezone}
                  onValueChange={(val) => setAddForm({ ...addForm, timezone: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">New York</SelectItem>
                    <SelectItem value="America/Sao_Paulo">São Paulo</SelectItem>
                  </SelectContent>
                </Select>
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
