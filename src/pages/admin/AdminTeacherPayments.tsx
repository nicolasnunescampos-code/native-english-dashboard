import React, { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth, endOfMonth, getWeekOfMonth, parseISO } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Types
type Teacher = { id: string; name: string }
type ClassRecord = { id: string; title: string; date: string; class_grade: number | null }

export default function AdminTeacherPayments() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [teacherRates, setTeacherRates] = useState<Record<string, number>>({})

  useEffect(() => {
    const saved = localStorage.getItem('teacher_rates')
    if (saved) {
      try {
        setTeacherRates(JSON.parse(saved))
      } catch (e) {
        // ignore
      }
    }
  }, [])

  const handleRateChange = (teacherId: string, val: string) => {
    const parsed = parseFloat(val)
    const updated = { ...teacherRates, [teacherId]: isNaN(parsed) ? 0 : parsed }
    setTeacherRates(updated)
    localStorage.setItem('teacher_rates', JSON.stringify(updated))
  }

  const loadData = async () => {
    setLoading(true)
    const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd')

    // Fetch teachers
    const { data: tData } = await supabase.from('teachers').select('id, name').order('name', { ascending: true })
    if (tData) {
      const excludedNames = ['nicolas', 'mariana']
      setTeachers(tData.filter(t => !excludedNames.some(ex => t.name.toLowerCase().includes(ex))))
    }

    // Fetch graded classes for this month
    const { data: cData } = await supabase
      .from('classes')
      .select('id, title, date, class_grade')
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .not('class_grade', 'is', null)

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
      // Find classes for this teacher
      const teacherClasses = classes.filter(c => c.title && c.title.toLowerCase().includes(teacher.name.toLowerCase()))
      
      const weeks: Record<number, number> = {}
      for (const cls of teacherClasses) {
        // getWeekOfMonth returns week number (1-index), starting week on Monday (1)
        const weekNum = getWeekOfMonth(parseISO(cls.date), { weekStartsOn: 1 })
        weeks[weekNum] = (weeks[weekNum] || 0) + 1
      }
      
      const totalAulas = Object.values(weeks).reduce((a, b) => a + b, 0)
      const rate = teacherRates[teacher.id] || 0
      const totalPagar = totalAulas * rate

      return {
        id: teacher.id,
        name: teacher.name,
        weeks,
        totalAulas,
        rate,
        totalPagar
      }
    })
  }, [teachers, classes, teacherRates])

  const maxWeeks = 5 // Show exactly 5 weeks
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
        <div className="space-y-8">
          <div className="rounded-md border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Nome do Professor</TableHead>
                  {[...Array(maxWeeks)].map((_, i) => (
                    <TableHead key={i} className="text-center whitespace-nowrap">Semana {i + 1}</TableHead>
                  ))}
                  <TableHead className="text-center whitespace-nowrap">Total de Aulas</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Valor por Aula</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Total a Pagar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.map(row => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium whitespace-nowrap">{row.name}</TableCell>
                    {[...Array(maxWeeks)].map((_, i) => (
                      <TableCell key={i} className="text-center">{row.weeks[i + 1] || ''}</TableCell>
                    ))}
                    <TableCell className="text-center font-semibold text-lg">{row.totalAulas}</TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        className="w-24 mx-auto text-center font-mono"
                        value={teacherRates[row.id] === undefined ? '' : teacherRates[row.id]}
                        onChange={(e) => handleRateChange(row.id, e.target.value)}
                        placeholder="0"
                        step="0.01"
                        min="0"
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold text-lg whitespace-nowrap">${row.totalPagar.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <div className="border rounded-xl p-6 bg-muted/40 min-w-[300px] text-right shadow-sm">
              <p className="text-sm font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Total Salarios</p>
              <p className="text-4xl font-bold text-primary">${globalTotal.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
