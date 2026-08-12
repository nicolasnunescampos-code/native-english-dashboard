import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, getWeekOfMonth, parseISO, getWeeksInMonth, startOfWeek, endOfWeek, addDays, isBefore, isAfter, max, min } from 'date-fns'
import { toast } from 'sonner'
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
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, FileText, Copy } from 'lucide-react'

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
  } | null>(null)

  const [selectedReceipt, setSelectedReceipt] = useState<typeof tableData[0] | null>(null)

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

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [currentDate])

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

  // Calculate stats
  const tableData = useMemo(() => {
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

      const weeks: Record<number, number> = {}       // Paid (graded) classes count
      const weekDetails: Record<number, WeekDetails> = {} // Full breakdown
      
      for (const session of Object.values(sessionsMap)) {
        // getWeekOfMonth returns week number (1-index), starting week on Monday (1)
        const weekNum = getWeekOfMonth(parseISO(session.date), { weekStartsOn: 1 })
        
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
          weeks[weekNum] = (weeks[weekNum] || 0) + 1
        } else if (session.is_absent && session.student_names.length > 0) {
          weekDetails[weekNum].absent.push(sessionRecord)
        } else {
          weekDetails[weekNum].scheduled.push(sessionRecord)
        }
      }
      
      const totalAulas = Object.values(weeks).reduce((a, b) => a + b, 0)
      const rate = teacher.class_rate || 0
      const totalPagar = totalAulas * rate

      return {
        id: teacher.id,
        name: teacher.name,
        weeks,
        weekDetails,
        totalAulas,
        rate,
        totalPagar
      }
    })
  }, [teachers, classes])

  const maxWeeks = getWeeksInMonth(currentDate, { weekStartsOn: 1 })
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
                  {[...Array(maxWeeks)].map((_, i) => {
                    const start = startOfWeek(addDays(startOfMonth(currentDate), i * 7), { weekStartsOn: 1 })
                    const end = endOfWeek(start, { weekStartsOn: 1 })
                    return (
                      <TableHead key={i} className="text-center whitespace-nowrap align-bottom pb-4">
                        <div className="font-semibold text-foreground">Semana {i + 1}</div>
                        <div className="text-[11px] font-normal text-muted-foreground mt-1 capitalize">
                          {format(start, 'MMM d')} - {format(end, 'MMM d')}
                        </div>
                      </TableHead>
                    )
                  })}
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
                      const hasData = row.weekDetails[weekKey] && (
                        row.weekDetails[weekKey].graded.length > 0 ||
                        row.weekDetails[weekKey].absent.length > 0 ||
                        row.weekDetails[weekKey].scheduled.length > 0
                      );
                      
                      return (
                        <TableCell key={weekKey} className="text-center">
                          {hasData ? (
                            <Button 
                               variant="ghost" 
                               className="font-semibold text-primary hover:bg-primary/20 bg-primary/5 h-auto py-1 px-3 min-w-[36px]"
                               onClick={() => setSelectedDetails({
                                 teacherName: row.name,
                                 week: weekKey,
                                 details: row.weekDetails[weekKey]
                               })}
                            >
                              {row.weeks[weekKey] || 0}
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
                      <div className="flex items-center justify-end gap-3">
                        R${row.totalPagar.toFixed(2)}
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
                    {[...Array(maxWeeks)].map((_, i) => {
                      const weekCount = selectedReceipt.weeks[i + 1] || 0;
                      return (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground font-medium">Week {i + 1}:</span>
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
                    [...Array(maxWeeks)].map((_, i) => `Week ${i + 1}: ${selectedReceipt.weeks[i + 1] || 0} classes`).join('\n') +
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
    </div>
  )
}
