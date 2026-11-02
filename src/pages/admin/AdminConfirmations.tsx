import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { supabase, Teacher } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  endOfWeek, 
  addDays, 
  subDays,
  min, 
  parseISO, 
  subMonths, 
  addMonths 
} from "date-fns"
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Pencil, 
  Copy, 
  Database, 
  Check, 
  ExternalLink, 
  ShieldAlert 
} from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

interface ConfirmationData {
  id: string
  teacher_id: string
  week_start_date: string
  classes_count: number
  confirmed_at: string
}

const RLS_FIX_SQL = `ALTER TABLE public.teacher_weekly_confirmations DISABLE ROW LEVEL SECURITY;`;
const SUPABASE_SQL_URL = `https://supabase.com/dashboard/project/ibykhkbyzifddwnsfxxy/sql/new`;

// Matches custom weeks in Teacher Payments exactly
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

// Canonical confirmation key for a week
function getWeekTargetMonday(w: { start: Date; end: Date }): string {
  let cur = new Date(w.start)
  while (cur <= w.end) {
    if (cur.getDay() === 1) { // 1 = Monday
      return format(cur, 'yyyy-MM-dd')
    }
    cur = addDays(cur, 1)
  }
  return format(w.start, 'yyyy-MM-dd')
}

export default function AdminConfirmations() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [confirmations, setConfirmations] = useState<ConfirmationData[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedSql, setCopiedSql] = useState(false)
  const [showRlsDialog, setShowRlsDialog] = useState(false)

  // Initialize month and week from URL param or default
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const urlWeek = searchParams.get('week')
    if (urlWeek) {
      const parsed = parseISO(urlWeek)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
    }
    const saved = localStorage.getItem('admin_confirmations_week')
    if (saved) {
      const parsed = parseISO(saved)
      if (!isNaN(parsed.getTime())) {
        return parsed
      }
    }
    return new Date()
  })

  const monthWeeks = useMemo(() => getCustomWeeks(currentDate), [currentDate])

  // Determine active week index
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(() => {
    const urlWeek = searchParams.get('week')
    const weeks = getCustomWeeks(currentDate)
    if (urlWeek) {
      const idx = weeks.findIndex(w => {
        const key = getWeekTargetMonday(w)
        const s = format(w.start, 'yyyy-MM-dd')
        const e = format(w.end, 'yyyy-MM-dd')
        return key === urlWeek || (urlWeek >= s && urlWeek <= e)
      })
      if (idx >= 0) return idx
    }
    // Default: find week containing today if in same month
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const todayIdx = weeks.findIndex(w => {
      const s = format(w.start, 'yyyy-MM-dd')
      const e = format(w.end, 'yyyy-MM-dd')
      return todayStr >= s && todayStr <= e
    })
    return todayIdx >= 0 ? todayIdx : 0
  })

  // Ensure selectedWeekIndex stays within bounds when month changes
  const activeWeekIndex = Math.min(selectedWeekIndex, Math.max(0, monthWeeks.length - 1))
  const activeWeek = monthWeeks[activeWeekIndex] || monthWeeks[0]
  const activeWeekKey = activeWeek ? getWeekTargetMonday(activeWeek) : format(new Date(), 'yyyy-MM-dd')
  const activeStartStr = activeWeek ? format(activeWeek.start, 'yyyy-MM-dd') : ''
  const activeEndStr = activeWeek ? format(activeWeek.end, 'yyyy-MM-dd') : ''

  // Synchronize URL and localStorage
  const selectWeek = (idx: number) => {
    setSelectedWeekIndex(idx)
    const targetW = monthWeeks[idx]
    if (targetW) {
      const key = getWeekTargetMonday(targetW)
      setSearchParams({ week: key }, { replace: true })
      localStorage.setItem('admin_confirmations_week', key)
    }
  }

  const prevMonth = () => {
    const nextDate = subMonths(currentDate, 1)
    setCurrentDate(nextDate)
    setSelectedWeekIndex(0)
  }

  const nextMonth = () => {
    const nextDate = addMonths(currentDate, 1)
    setCurrentDate(nextDate)
    setSelectedWeekIndex(0)
  }

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      // Fetch all teachers
      const { data: teachersData } = await supabase
        .from('teachers')
        .select('*')
        .order('name')

      if (teachersData) setTeachers(teachersData)

      // Fetch confirmations for this month's range
      const searchStart = format(subDays(startOfMonth(currentDate), 7), 'yyyy-MM-dd')
      const searchEnd = format(addDays(endOfMonth(currentDate), 7), 'yyyy-MM-dd')

      const { data: confirmationsData } = await supabase
        .from('teacher_weekly_confirmations')
        .select('*')
        .gte('week_start_date', searchStart)
        .lte('week_start_date', searchEnd)

      if (confirmationsData) setConfirmations(confirmationsData)

      setLoading(false)
    }

    fetchData()
  }, [currentDate])

  const [editingConf, setEditingConf] = useState<string | null>(null) // teacher.id
  const [editValue, setEditValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const startEditing = (teacherId: string, currentVal: number | string) => {
    setEditingConf(teacherId)
    setEditValue(currentVal.toString())
  }

  const handleCopySql = () => {
    navigator.clipboard.writeText(RLS_FIX_SQL)
    setCopiedSql(true)
    toast.success("SQL command copied to clipboard! Paste it into Supabase SQL Editor.")
    setTimeout(() => setCopiedSql(false), 3000)
  }

  const saveEdit = async (teacherId: string) => {
    const newCount = parseInt(editValue, 10)
    if (isNaN(newCount)) {
      setEditingConf(null)
      return
    }

    // Match confirmation for active week
    const conf = confirmations.find(c => 
      c.teacher_id === teacherId && 
      (c.week_start_date === activeWeekKey || (c.week_start_date >= activeStartStr && c.week_start_date <= activeEndStr))
    )

    const weekStartStr = activeWeekKey
    setIsSaving(true)

    try {
      let savedRecord: ConfirmationData | null = null

      if (conf) {
        // 1. Try update by ID with select()
        const { data: updatedById, error: errById } = await supabase
          .from('teacher_weekly_confirmations')
          .update({ 
            classes_count: newCount,
            confirmed_at: new Date().toISOString()
          })
          .eq('id', conf.id)
          .select()

        if (errById) throw errById

        if (updatedById && updatedById.length > 0) {
          savedRecord = updatedById[0]
        } else {
          // 2. Try update by composite (teacher_id, week_start_date)
          const { data: updatedByTeacher, error: errByTeacher } = await supabase
            .from('teacher_weekly_confirmations')
            .update({ 
              classes_count: newCount,
              confirmed_at: new Date().toISOString()
            })
            .eq('teacher_id', teacherId)
            .eq('week_start_date', conf.week_start_date || weekStartStr)
            .select()

          if (errByTeacher) throw errByTeacher

          if (updatedByTeacher && updatedByTeacher.length > 0) {
            savedRecord = updatedByTeacher[0]
          } else {
            // 3. Try upsert
            const { data: upserted, error: errUpsert } = await supabase
              .from('teacher_weekly_confirmations')
              .upsert({
                id: conf.id,
                teacher_id: teacherId,
                week_start_date: conf.week_start_date || weekStartStr,
                classes_count: newCount,
                confirmed_at: new Date().toISOString()
              }, { onConflict: 'teacher_id,week_start_date' })
              .select()

            if (errUpsert) throw errUpsert
            if (upserted && upserted.length > 0) {
              savedRecord = upserted[0]
            }
          }
        }
      } else {
        // Insert new confirmation
        const { data: inserted, error: insertError } = await supabase
          .from('teacher_weekly_confirmations')
          .insert({
            teacher_id: teacherId,
            week_start_date: weekStartStr,
            classes_count: newCount,
            confirmed_at: new Date().toISOString()
          })
          .select()
          .single()

        if (insertError) throw insertError
        savedRecord = inserted
      }

      if (!savedRecord) {
        throw new Error('RLS_UPDATE_BLOCKED')
      }

      // Update local state
      setConfirmations(prev => {
        const matchIndex = prev.findIndex(c => 
          (savedRecord && c.id === savedRecord.id) || 
          (c.teacher_id === teacherId && c.week_start_date === weekStartStr)
        )
        if (matchIndex >= 0) {
          const next = [...prev]
          next[matchIndex] = savedRecord!
          return next
        }
        return [...prev, savedRecord!]
      })

      toast.success("Classes count successfully updated and synced into Teacher Payments!")
    } catch (e: any) {
      console.error('Save confirmation error:', e)
      const isRls = 
        e?.message === 'RLS_UPDATE_BLOCKED' ||
        e?.message?.toLowerCase().includes('row-level security') ||
        e?.message?.toLowerCase().includes('violates');
      
      if (isRls) {
        setShowRlsDialog(true)
        toast.error("Database permission blocked (RLS). Follow the steps in the popup to fix.", {
          duration: 6000
        })
      } else {
        toast.error(e?.message || "Failed to update classes count.")
      }
    } finally {
      setIsSaving(false)
      setEditingConf(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>✅ Teacher Confirmations</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Confirmed weekly classes directly sync into Teacher Payments. Click any number to edit.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRlsDialog(true)}
            className="text-xs gap-1.5 h-9 border-[#2B2F8F]/20 dark:border-white/10"
            title="Click to view and copy the 1-line SQL fix for database permissions"
          >
            <Database className="h-3.5 w-3.5 text-primary" />
            <span>Fix DB Permissions (SQL)</span>
          </Button>

          {/* Month Selector matching Teacher Payments */}
          <div className="flex items-center gap-1.5 bg-card border rounded-xl p-1 shadow-xs">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-xs sm:text-sm font-semibold min-w-[130px] text-center capitalize">
              {format(currentDate, 'MMMM yyyy')}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Semana Tabs matching Teacher Payments exactly */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {monthWeeks.map((w, idx) => {
          const weekNum = idx + 1
          const isSelected = activeWeekIndex === idx
          const dateRange = `${format(w.start, 'MMM d')} - ${format(w.end, 'MMM d')}`

          return (
            <button
              key={idx}
              type="button"
              onClick={() => selectWeek(idx)}
              className={cn(
                "flex flex-col items-center justify-center px-4 py-2 rounded-xl border text-xs transition-all whitespace-nowrap min-w-[130px] cursor-pointer",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs scale-102"
                  : "bg-card hover:bg-muted text-muted-foreground border-border hover:border-border/80"
              )}
            >
              <span className="font-semibold">Semana {weekNum}</span>
              <span className={cn("text-[11px] mt-0.5 capitalize", isSelected ? "text-primary-foreground/90 font-medium" : "text-muted-foreground/80")}>
                {dateRange}
              </span>
            </button>
          )
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Confirmed Classes</TableHead>
                <TableHead className="text-right">Confirmed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Loading data...
                  </TableCell>
                </TableRow>
              ) : teachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No teachers found.
                  </TableCell>
                </TableRow>
              ) : (
                teachers.map((teacher) => {
                  const conf = confirmations.find(c => 
                    c.teacher_id === teacher.id && 
                    (c.week_start_date === activeWeekKey || (c.week_start_date >= activeStartStr && c.week_start_date <= activeEndStr))
                  )
                  
                  return (
                    <TableRow key={teacher.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full shrink-0" 
                            style={{ backgroundColor: teacher.color || '#ccc' }}
                          />
                          <span>{teacher.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {conf ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>Confirmed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-xs">
                            <XCircle className="h-4 w-4 shrink-0" />
                            <span>Pending</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingConf === teacher.id ? (
                           <div className="flex items-center justify-end gap-2">
                             <Input 
                               type="number" 
                               value={editValue} 
                               onChange={e => setEditValue(e.target.value)} 
                               className="w-20 h-8 text-right font-bold"
                               autoFocus
                               disabled={isSaving}
                               onKeyDown={e => {
                                 if (e.key === 'Enter') saveEdit(teacher.id)
                                 if (e.key === 'Escape') setEditingConf(null)
                               }}
                               onBlur={() => saveEdit(teacher.id)}
                             />
                           </div>
                        ) : (
                          <div 
                            className="flex items-center justify-end gap-2 group cursor-pointer" 
                            onClick={() => startEditing(teacher.id, conf ? conf.classes_count : 0)}
                            title="Click to manually edit classes count"
                          >
                            {conf ? (
                              <span className="font-black text-lg text-foreground hover:text-primary transition-colors">
                                {conf.classes_count}
                              </span>
                            ) : (
                              <span className="text-muted-foreground font-semibold">-</span>
                            )}
                            <Pencil className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground font-medium">
                        {conf?.confirmed_at ? format(new Date(conf.confirmed_at), 'MMM d, h:mm a') : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* RLS Permission Fix Modal */}
      <Dialog open={showRlsDialog} onOpenChange={setShowRlsDialog}>
        <DialogContent className="max-w-lg p-6 rounded-3xl">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-1">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-bold">
              Database Permission Fix (RLS)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Supabase Row-Level Security currently blocks admins from modifying teacher confirmations because the policy was set to only allow teachers to modify their own rows (<code className="text-amber-600 dark:text-amber-400 font-mono">violates row-level security policy</code>).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <p className="text-xs font-semibold text-foreground">
              To allow admins to edit and save class counts, run this 1-line command in your Supabase SQL Editor:
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner select-all">
              {RLS_FIX_SQL}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                onClick={handleCopySql}
                className="flex-1 font-bold h-10 rounded-xl gap-2 liquid-btn-primary text-white"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy SQL Command</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                asChild
                className="h-10 rounded-xl gap-2"
              >
                <a href={SUPABASE_SQL_URL} target="_blank" rel="noopener noreferrer">
                  <span>Open Supabase SQL</span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </a>
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-2 sm:justify-start">
            <p className="text-[11px] text-muted-foreground">
              After pressing <span className="font-semibold text-foreground">Run</span> in Supabase, close this window and try editing again — it will save instantly!
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
