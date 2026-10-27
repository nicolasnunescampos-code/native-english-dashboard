import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, getWeekOfMonth, parseISO, getWeeksInMonth, startOfWeek, endOfWeek, addDays, subDays, isBefore, isAfter, max, min } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, FileText, Copy, Wallet, CheckCircle2, AlertCircle } from 'lucide-react'

// Types
type Teacher = { id: string; name: string; class_rate?: number }
type ClassRecord = { 
  id: string; 
  title: string; 
  date: string; 
  time: string;
  class_grade: number | null;
  is_absent: boolean | null;
  student_name: string;
}

type SessionRecord = {
  id: string;
  date: string;
  time: string;
  student_names: string[];
}

type WeekDetails = {
  graded: SessionRecord[]
  absent: SessionRecord[]
  scheduled: SessionRecord[]
}

export type TeacherPaymentRow = {
  id: string;
  name: string;
  weeks: Record<number, number>;
  weekDetails: Record<number, WeekDetails>;
  isConfirmedWeek: Record<number, boolean>;
  totalAulas: number;
  rate: number;
  totalPagar: number;
}

function getCustomWeeks(date: Date) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const weeks: { start: Date; end: Date }[] = []
  let current = monthStart

  while (current <= monthEnd) {
    const weekStart = current
    const weekEnd = min([endOfWeek(current, { weekStartsOn: 1 }), monthEnd])
    weeks.push({ start: weekStart, end: weekEnd })
    current = addDays(weekEnd, 1)
  }

  if (weeks.length > 5) {
    weeks[1].start = weeks[0].start
    weeks.shift()
  }

  return weeks
}

export default function AdminTeacherPayments() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [savingRate, setSavingRate] = useState<string | null>(null)

  const [selectedDetails, setSelectedDetails] = useState<{
    teacherName: string;
    week: number;
    details: WeekDetails;
    confirmedCount?: number;
  } | null>(null)

  const [confirmations, setConfirmations] = useState<any[]>([])

  const [selectedReceipt, setSelectedReceipt] = useState<TeacherPaymentRow | null>(null)

  // Expense Integration States
  const [existingTeacherExpenses, setExistingTeacherExpenses] = useState<any[]>([])
  const [confirmingExpenseTeacher, setConfirmingExpenseTeacher] = useState<TeacherPaymentRow | null>(null)
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<string>("Company's Nubank")
  const [expensePaymentDate, setExpensePaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [submittingExpense, setSubmittingExpense] = useState(false)

  const handleRateChangeLocal = (teacherId: string, val: string) => {
    const parsed = parseFloat(val)
    const newRate = isNaN(parsed) ? 0 : parsed
    setTeachers(prev => prev.map(t => t.id === teacherId ? { ...t, class_rate: newRate } : t))
  }

  const saveRateToDb = async (teacherId: string, val: number) => {
    setSavingRate(teacherId)
    try {
      await supabase.from('teachers').update({ class_rate: val }).eq('id', teacherId)
    } catch (e) {
      console.error('Error saving rate', e)
    } finally {
      setSavingRate(null)
    }
  }

  const loadData = async () => {
    setLoading(true)
    const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    // Fetch teachers
    const { data: tData } = await supabase.from('teachers').select('id, name, class_rate').order('name', { ascending: true })
    if (tData) {
      const excludedNames = ['nicolas', 'mariana']
      setTeachers(tData.filter(t => !excludedNames.some(ex => t.name.toLowerCase().includes(ex))))
    }

    // Fetch ALL classes for this month (graded, absent, or scheduled)
    const { data: cData } = await supabase
      .from('classes')
      .select('id, title, date, time, class_grade, is_absent, student_name')
      .gte('date', monthStart)
      .lte('date', monthEnd)

    if (cData) setClasses(cData)

    // Fetch weekly confirmations for this month's range
    const searchStart = format(subDays(startOfMonth(currentDate), 7), 'yyyy-MM-dd')
    const searchEnd = format(addDays(endOfMonth(currentDate), 7), 'yyyy-MM-dd')

    const { data: confData } = await supabase
      .from('teacher_weekly_confirmations')
      .select('*')
      .gte('week_start_date', searchStart)
      .lte('week_start_date', searchEnd)

    if (confData) setConfirmations(confData)

    setLoading(false)
  }

  const fetchTeacherExpenses = async () => {
    const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    try {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .eq('category', 'Teacher Payments')
        .gte('due_date', monthStart)
        .lte('due_date', monthEnd)

      setExistingTeacherExpenses(data || [])
    } catch (e) {
      console.error('Error fetching teacher expenses:', e)
    }
  }

  useEffect(() => {
    loadData()
    fetchTeacherExpenses()
  }, [currentDate])

  const getTeacherExpense = (teacherName: string) => {
    const lower = teacherName.toLowerCase()
    return existingTeacherExpenses.find(
      (e: any) =>
        e.title?.toLowerCase().includes(lower) ||
        (e.notes && e.notes.toLowerCase().includes(lower))
    )
  }

  const handleOpenExpenseConfirm = (row: TeacherPaymentRow) => {
    setConfirmingExpenseTeacher(row)
    const existing = getTeacherExpense(row.name)
    if (existing) {
      if (existing.payment_method) {
        setExpensePaymentMethod(existing.payment_method)
      }
      if (existing.due_date) {
        setExpensePaymentDate(existing.due_date)
      }
    } else {
      setExpensePaymentMethod("Company's Nubank")
      setExpensePaymentDate(format(new Date(), 'yyyy-MM-dd'))
    }
  }

  const handleConfirmExpense = async () => {
    if (!confirmingExpenseTeacher) return
    setSubmittingExpense(true)

    const monthLabel = format(currentDate, 'MMMM yyyy')
    const existing = getTeacherExpense(confirmingExpenseTeacher.name)
    const title = `Teacher Payroll - ${confirmingExpenseTeacher.name} (${monthLabel})`
    const notesText = `[Paid via: ${expensePaymentMethod}] ${confirmingExpenseTeacher.totalAulas} classes taught at R$ ${confirmingExpenseTeacher.rate.toFixed(2)}/class (${monthLabel})`

    try {
      if (existing) {
        let updatePayload: any = {
          title,
          amount: confirmingExpenseTeacher.totalPagar,
          due_date: expensePaymentDate,
          status: 'paid',
          payment_method: expensePaymentMethod,
          notes: notesText,
        }
        let { error } = await supabase.from('expenses').update(updatePayload).eq('id', existing.id)

        if (error && (error.code === '42703' || error.message?.includes('payment_method'))) {
          delete updatePayload.payment_method
          const retry = await supabase.from('expenses').update(updatePayload).eq('id', existing.id)
          if (retry.error) throw retry.error
        } else if (error) {
          throw error
        }
        toast.success(`Expense updated for ${confirmingExpenseTeacher.name}!`)
      } else {
        let insertPayload: any = {
          title,
          category: 'Teacher Payments',
          amount: confirmingExpenseTeacher.totalPagar,
          currency: 'BRL',
          due_date: expensePaymentDate,
          status: 'paid',
          payment_method: expensePaymentMethod,
          is_recurring: false,
          notes: notesText,
        }
        let { error } = await supabase.from('expenses').insert(insertPayload)

        if (error && (error.code === '42703' || error.message?.includes('payment_method'))) {
          delete insertPayload.payment_method
          const retry = await supabase.from('expenses').insert(insertPayload)
          if (retry.error) throw retry.error
        } else if (error) {
          throw error
        }
        toast.success(`Expense of R$${confirmingExpenseTeacher.totalPagar.toFixed(2)} for ${confirmingExpenseTeacher.name} added to Expenses!`)
      }

      setConfirmingExpenseTeacher(null)
      await fetchTeacherExpenses()
    } catch (err: any) {
      console.error('Error recording expense:', err)
      toast.error(err.message || 'Failed to save expense.')
    } finally {
      setSubmittingExpense(false)
    }
  }

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

  // Calculate stats
  const tableData: TeacherPaymentRow[] = useMemo(() => {
    const monthWeeks = getCustomWeeks(currentDate)

    return teachers.map(teacher => {
      // Helper to strictly extract Teacher name from titles formatted like "Student Name - Teacher Name"
      const extractTeacherName = (title: string) => {
        if (!title) return '';
        const parts = title.split(' - ');
        return parts.length > 1 ? parts[1].trim().toLowerCase() : title.toLowerCase();
      };

      // Filter classes strictly comparing teacher name string
      const teacherClasses = classes.filter(c => {
        const teacherNameFromTitle = extractTeacherName(c.title);
        return teacherNameFromTitle.includes(teacher.name.toLowerCase());
      })
      
      const sessionsMap: Record<string, {
         id: string;
         date: string;
         time: string;
         student_names: string[];
         is_graded: boolean;
         is_absent: boolean; // true if ALL are absent
      }> = {}

      for (const cls of teacherClasses) {
        const key = `${cls.date}_${cls.time}`;
        if (!sessionsMap[key]) {
          sessionsMap[key] = {
            id: cls.id,
            date: cls.date,
            time: cls.time,
            student_names: [],
            is_graded: false,
            is_absent: true // Start assuming absent, falsify if any is not absent
          }
        }

        if (cls.student_name) {
           sessionsMap[key].student_names.push(cls.student_name)
        }

        if (cls.class_grade !== null) {
          sessionsMap[key].is_graded = true
        }
        if (!cls.is_absent) {
          sessionsMap[key].is_absent = false
        }
      }

      const autoWeeks: Record<number, number> = {}       // Paid (graded) classes count
      const weekDetails: Record<number, WeekDetails> = {} // Full breakdown
      const weeks: Record<number, number> = {}           // Final count (Confirmed or Auto)
      const isConfirmedWeek: Record<number, boolean> = {} // Whether week was confirmed
      
      for (const session of Object.values(sessionsMap)) {
        const weekIndex = monthWeeks.findIndex(w => {
          const sDate = format(w.start, 'yyyy-MM-dd')
          const eDate = format(w.end, 'yyyy-MM-dd')
          return session.date >= sDate && session.date <= eDate
        })
        const weekNum = weekIndex >= 0 ? weekIndex + 1 : 1
        
        if (!weekDetails[weekNum]) {
          weekDetails[weekNum] = { graded: [], absent: [], scheduled: [] }
        }

        const sessionRecord: SessionRecord = {
           id: session.id,
           date: session.date,
           time: session.time,
           student_names: session.student_names
        }

        if (session.is_graded) {
          weekDetails[weekNum].graded.push(sessionRecord)
          autoWeeks[weekNum] = (autoWeeks[weekNum] || 0) + 1
        } else if (session.is_absent && session.student_names.length > 0) {
          weekDetails[weekNum].absent.push(sessionRecord)
        } else {
          weekDetails[weekNum].scheduled.push(sessionRecord)
        }
      }

      // Reconcile each week with confirmed count from teacher_weekly_confirmations
      monthWeeks.forEach((w, idx) => {
        const weekNum = idx + 1
        const mondayStr = format(startOfWeek(w.start, { weekStartsOn: 1 }), 'yyyy-MM-dd')
        const startStr = format(w.start, 'yyyy-MM-dd')
        const endStr = format(w.end, 'yyyy-MM-dd')

        const conf = confirmations.find(c => {
          if (c.teacher_id !== teacher.id) return false
          const cDate = c.week_start_date
          return cDate === mondayStr || cDate === startStr || (cDate >= mondayStr && cDate <= endStr)
        })

        if (conf !== undefined && conf !== null) {
          weeks[weekNum] = conf.classes_count
          isConfirmedWeek[weekNum] = true
        } else {
          weeks[weekNum] = autoWeeks[weekNum] || 0
          isConfirmedWeek[weekNum] = false
        }
      })
      
      const totalAulas = Object.values(weeks).reduce((a, b) => a + b, 0)
      const rate = teacher.class_rate || 0
      const totalPagar = totalAulas * rate

      return {
        id: teacher.id,
        name: teacher.name,
        weeks,
        weekDetails,
        isConfirmedWeek,
        totalAulas,
        rate,
        totalPagar
      }
    })
  }, [teachers, classes, confirmations, currentDate])

  const monthWeeks = getCustomWeeks(currentDate)
  const maxWeeks = monthWeeks.length
  const globalTotal = tableData.reduce((acc, row) => acc + row.totalPagar, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Teacher Payments</h1>
          <p className="text-muted-foreground">Automatically calculates classes taught based on grades</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-medium text-lg min-w-[150px] text-center">{format(currentDate, 'MMMM yyyy')}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? (
        <p>Loading data...</p>
      ) : (
        <div className="space-y-8 animate-fade-in">
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Nome do Professor</TableHead>
                  {monthWeeks.map((week, i) => (
                    <TableHead key={i} className="text-center whitespace-nowrap align-bottom pb-4">
                      <div className="font-semibold text-foreground">Semana {i + 1}</div>
                      <div className="text-[11px] font-normal text-muted-foreground mt-1 capitalize">
                        {format(week.start, 'MMM d')} - {format(week.end, 'MMM d')}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center whitespace-nowrap align-bottom pb-4">Total de Aulas</TableHead>
                  <TableHead className="text-center whitespace-nowrap align-bottom pb-4">Valor por Aula</TableHead>
                  <TableHead className="text-right whitespace-nowrap align-bottom pb-4">Total a Pagar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
                    {[...Array(maxWeeks)].map((_, i) => {
                      const weekKey = i + 1;
                      const isConfirmed = row.isConfirmedWeek?.[weekKey];
                      const count = row.weeks[weekKey];
                      const hasData = (count !== undefined && count !== null) || (row.weekDetails[weekKey] && (
                        row.weekDetails[weekKey].graded.length > 0 ||
                        row.weekDetails[weekKey].absent.length > 0 ||
                        row.weekDetails[weekKey].scheduled.length > 0
                      ));
                      
                      return (
                        <TableCell key={weekKey} className="text-center">
                          {hasData ? (
                            <Button 
                               variant="ghost" 
                               className={cn(
                                 "font-bold h-auto py-1 px-2.5 min-w-[36px] gap-1 transition-all",
                                 isConfirmed
                                   ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 shadow-2xs"
                                   : "text-primary hover:bg-primary/20 bg-primary/5"
                               )}
                               title={isConfirmed ? "Confirmed in Teacher Confirmations" : "Calculated from graded classes"}
                               onClick={() => setSelectedDetails({
                                 teacherName: row.name,
                                 week: weekKey,
                                 details: row.weekDetails[weekKey] || { graded: [], absent: [], scheduled: [] },
                                 confirmedCount: isConfirmed ? count : undefined
                               })}
                            >
                              <span>{count || 0}</span>
                              {isConfirmed && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              )}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground opacity-50">-</span>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center font-bold text-lg">{row.totalAulas}</TableCell>
                    <TableCell className="text-center relative">
                      <Input
                        type="number"
                        className="w-24 mx-auto text-center font-mono"
                        value={row.rate || ''}
                        onChange={(e) => handleRateChangeLocal(row.id, e.target.value)}
                        onBlur={(e) => saveRateToDb(row.id, parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        step="0.01"
                        min="0"
                        disabled={savingRate === row.id}
                      />
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg whitespace-nowrap text-green-700 dark:text-green-500">
                      <div className="flex items-center justify-end gap-2.5">
                        <span className="font-extrabold">R${row.totalPagar.toFixed(2)}</span>

                        {/* Send to Expenses Button */}
                        {getTeacherExpense(row.name) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenExpenseConfirm(row)}
                            title="Already sent to expenses. Click to view or update."
                            className="h-8 rounded-lg text-xs font-bold border-emerald-400 bg-emerald-100/80 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700 gap-1 px-2.5 shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            In Expenses
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenExpenseConfirm(row)}
                            disabled={row.totalPagar <= 0}
                            title="Register this payment directly in Company Expenses"
                            className="h-8 rounded-lg text-xs font-bold border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 gap-1.5 px-2.5 shadow-2xs"
                          >
                            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                            Send to Expenses
                          </Button>
                        )}

                        <Button variant="ghost" size="icon" onClick={() => setSelectedReceipt(row)} title="Generate Receipt">
                          <FileText className="w-5 h-5 text-muted-foreground hover:text-primary" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <div className="border rounded-xl p-6 bg-muted/40 min-w-[300px] text-right shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-green-500/20"></div>
              <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Total Salarios</p>
              <p className="text-4xl font-bold text-primary">R${globalTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!selectedDetails} onOpenChange={(open) => !open && setSelectedDetails(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle className="text-xl">
               {selectedDetails?.teacherName} - Week {selectedDetails?.week}
             </DialogTitle>
           </DialogHeader>
           
           {selectedDetails && (
             <div className="space-y-6 mt-4">
                {selectedDetails.confirmedCount !== undefined && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-bold text-foreground">Teacher Confirmation:</span>
                    </div>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      {selectedDetails.confirmedCount} classes confirmed
                    </span>
                  </div>
                )}
                {/* GRADED / PAID */}
                <div>
                  <h3 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                    <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                      {selectedDetails.details.graded.length} Paid
                    </Badge>
                  </h3>
                  {selectedDetails.details.graded.length > 0 ? (
                    <ul className="space-y-2 border-l-2 border-green-200 pl-3">
                      {selectedDetails.details.graded.map(c => (
                        <li key={c.id} className="text-sm">
                          <span className="font-medium">{c.student_names.join(', ')}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                             ({c.date} {c.time && `at ${c.time}`})
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground pl-3">No paid classes this week.</p>
                  )}
                </div>

                {/* ABSENT */}
                <div>
                  <h3 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                    <Badge variant="default" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
                      {selectedDetails.details.absent.length} Absent
                    </Badge>
                  </h3>
                  {selectedDetails.details.absent.length > 0 ? (
                    <ul className="space-y-2 border-l-2 border-red-200 pl-3">
                      {selectedDetails.details.absent.map(c => (
                        <li key={c.id} className="text-sm">
                          <span className="font-medium text-red-600 line-through opacity-80">{c.student_names.join(', ')}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                             ({c.date} {c.time && `at ${c.time}`})
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground pl-3">No absences marked.</p>
                  )}
                </div>

                {/* SCHEDULED */}
                <div>
                  <h3 className="font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <Badge variant="secondary">
                      {selectedDetails.details.scheduled.length} Scheduled (Ungraded)
                    </Badge>
                  </h3>
                  {selectedDetails.details.scheduled.length > 0 ? (
                    <ul className="space-y-2 border-l-2 border-muted pl-3 opacity-70">
                      {selectedDetails.details.scheduled.map(c => (
                        <li key={c.id} className="text-sm">
                          <span>{c.student_names.length > 0 ? c.student_names.join(', ') : 'Class'}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                             ({c.date} {c.time && `at ${c.time}`})
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground pl-3">No pending classes.</p>
                  )}
                </div>
             </div>
           )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedReceipt} onOpenChange={(open) => !open && setSelectedReceipt(null)}>
        <DialogContent className="max-w-sm">
           <DialogHeader>
             <DialogTitle className="text-xl text-center">
               Payment Summary
             </DialogTitle>
           </DialogHeader>
           
           {selectedReceipt && (
             <div className="space-y-4 mt-2">
                <div className="text-center mb-6">
                  <h3 className="font-bold text-2xl">{selectedReceipt.name}</h3>
                  <p className="text-muted-foreground capitalize">{format(currentDate, 'MMMM yyyy')}</p>
                </div>

                <div className="bg-muted/30 p-6 rounded-lg border space-y-4 shadow-sm">
                  <div className="space-y-3 border-b border-border/50 pb-4">
                    {monthWeeks.map((week, i) => {
                      const weekCount = selectedReceipt.weeks[i + 1] || 0;
                      
                      return (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground font-medium">
                            Week {i + 1} <span className="text-xs opacity-70 ml-1">({format(week.start, 'MMM d')} - {format(week.end, 'MMM d')})</span>:
                          </span>
                          <span className="font-semibold text-foreground">{weekCount} class{weekCount !== 1 ? 'es' : ''}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Total Classes:</span>
                      <span className="font-bold text-foreground">{selectedReceipt.totalAulas}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Rate per Class:</span>
                      <span className="font-semibold text-foreground">R${selectedReceipt.rate.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-extrabold mt-4 pt-4 border-t border-border/50">
                      <span>Total:</span>
                      <span className="text-green-600">R${selectedReceipt.totalPagar.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button className="w-full mt-4" size="lg" onClick={() => {
                  const text = `*${selectedReceipt.name} - ${format(currentDate, 'MMMM yyyy')}*\n\n` +
                    monthWeeks.map((week, i) => {
                      return `Week ${i + 1} (${format(week.start, 'MMM d')} - ${format(week.end, 'MMM d')}): ${selectedReceipt.weeks[i + 1] || 0} classes`
                    }).join('\n') +
                    `\n------------------\n` +
                    `Total Classes: ${selectedReceipt.totalAulas}\n` +
                    `Rate: R$${selectedReceipt.rate.toFixed(2)}\n` +
                    `*Total to Pay: R$${selectedReceipt.totalPagar.toFixed(2)}*`;
                  
                  navigator.clipboard.writeText(text);
                  toast.success('Copied to clipboard!');
                }}>
                  <Copy className="w-5 h-5 mr-2" />
                  Copy for WhatsApp
                </Button>
             </div>
           )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Teacher Payroll Expense */}
      <Dialog
        open={!!confirmingExpenseTeacher}
        onOpenChange={(open) => !open && setConfirmingExpenseTeacher(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-600" />
              Confirm Teacher Payroll Expense
            </DialogTitle>
            <DialogDescription>
              Register this teacher payment directly into Company Expenses.
            </DialogDescription>
          </DialogHeader>

          {confirmingExpenseTeacher && (
            <div className="space-y-4 py-2">
              {/* Summary Card */}
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Professor</span>
                  <span className="font-bold text-foreground text-sm">{confirmingExpenseTeacher.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Reference Month</span>
                  <span className="font-semibold text-sm text-foreground">{format(currentDate, 'MMMM yyyy')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Aulas Ministradas</span>
                  <span className="text-sm font-semibold text-foreground">
                    {confirmingExpenseTeacher.totalAulas} aulas × R${confirmingExpenseTeacher.rate.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-emerald-200/80 dark:border-emerald-800/80 pt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase">Total a Pagar</span>
                  <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400">
                    R${confirmingExpenseTeacher.totalPagar.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Already sent warning if updating */}
              {getTeacherExpense(confirmingExpenseTeacher.name) && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>An expense for this teacher in this month is already recorded. Confirming will update the existing entry.</span>
                </div>
              )}

              {/* Payment Account */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Paid Via / Account</Label>
                <Select value={expensePaymentMethod} onValueChange={setExpensePaymentMethod}>
                  <SelectTrigger className="w-full h-10 rounded-xl text-xs">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Company's Nubank">Company's Nubank</SelectItem>
                    <SelectItem value="Nicolas's Personal Acc">Nicolas's Personal Acc</SelectItem>
                    <SelectItem value="InfinitePay">InfinitePay</SelectItem>
                    <SelectItem value="Company Credit Card">Company Credit Card</SelectItem>
                    <SelectItem value="Wise / International">Wise / International</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment / Due Date</Label>
                <Input
                  type="date"
                  value={expensePaymentDate}
                  onChange={(e) => setExpensePaymentDate(e.target.value)}
                  className="w-full h-10 rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmingExpenseTeacher(null)}
                  disabled={submittingExpense}
                  className="rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmExpense}
                  disabled={submittingExpense || confirmingExpenseTeacher.totalPagar <= 0}
                  className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {submittingExpense ? 'Saving...' : 'Confirm & Send to Expenses'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
