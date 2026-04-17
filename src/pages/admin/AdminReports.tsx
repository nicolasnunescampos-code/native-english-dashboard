import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, lastDayOfMonth } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from 'sonner'
import { FileText, Loader2 } from 'lucide-react'

type Report = {
  id: string
  student_name: string
  target_month: string
  status: string
  report_text: string | null
  created_at: string
}

type ClassRecord = {
  id: string
  title: string
  date: string
  class_grade: number | null
  notes: string | null
  is_absent: boolean
}

export default function AdminReports() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [studentClasses, setStudentClasses] = useState<ClassRecord[]>([])
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [reportText, setReportText] = useState('')
  const [saving, setSaving] = useState(false)

  const loadReports = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('monthly_reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setReports(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadReports()
  }, [])

  const openReport = async (report: Report) => {
    setSelectedReport(report)
    setReportText(report.report_text || '')
    setLoadingClasses(true)

    const [year, month] = report.target_month.split('-')
    const startDate = `${year}-${month}-01`
    const endDate = format(lastDayOfMonth(new Date(parseInt(year), parseInt(month) - 1, 1)), 'yyyy-MM-dd')

    const { data } = await supabase
      .from('classes')
      .select('id, title, date, class_grade, notes, is_absent')
      .eq('student_name', report.student_name)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    setStudentClasses(data || [])
    setLoadingClasses(false)
  }

  const saveReport = async () => {
    if (!selectedReport) return
    if (!reportText.trim()) {
      toast.error('Report text cannot be empty')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('monthly_reports')
      .update({
        report_text: reportText,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', selectedReport.id)

    setSaving(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Report completed and sent to student!')
      setSelectedReport(null)
      loadReports()
    }
  }

  const pendingReports = reports.filter(r => r.status === 'pending')
  const completedReports = reports.filter(r => r.status === 'completed')

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Student Report Requests
          </h1>
          <p className="text-muted-foreground mt-1">Review student histories and write their monthly feedback.</p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="pending">Pending ({pendingReports.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedReports.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Target Month</TableHead>
                    <TableHead>Requested On</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReports.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No pending requests.</TableCell></TableRow>
                  ) : pendingReports.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold whitespace-nowrap">{r.student_name}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.target_month}</TableCell>
                      <TableCell className="whitespace-nowrap">{format(new Date(r.created_at), 'PPP')}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="sm" onClick={() => openReport(r)}>Write Report</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Target Month</TableHead>
                    <TableHead>Requested On</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedReports.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No completed reports yet.</TableCell></TableRow>
                  ) : completedReports.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold whitespace-nowrap">{r.student_name}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.target_month}</TableCell>
                      <TableCell className="whitespace-nowrap">{format(new Date(r.created_at), 'PPP')}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button variant="outline" size="sm" onClick={() => openReport(r)}>Edit Report</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 w-[95vw]">
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="text-xl">
              Report for {selectedReport?.student_name} ({selectedReport?.target_month})
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x">
            {/* Left Pane - Context */}
            <div className="w-full md:w-1/2 flex flex-col h-full bg-muted/20">
              <div className="p-4 border-b font-medium bg-muted/50 text-sm">Classes in {selectedReport?.target_month}</div>
              <div className="overflow-y-auto p-4 space-y-4">
                {loadingClasses ? (
                  <p className="text-muted-foreground text-sm text-center py-4">Loading classes...</p>
                ) : studentClasses.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No classes found for this month.</p>
                ) : (
                  studentClasses.map(cls => (
                    <div key={cls.id} className="bg-background border rounded-lg p-3 text-sm space-y-2 relative shadow-sm">
                      {cls.is_absent && <Badge variant="destructive" className="absolute top-3 right-3">Absent</Badge>}
                      {!cls.is_absent && cls.class_grade && <Badge className="absolute top-3 right-3 bg-green-600">Grade: {cls.class_grade}/10</Badge>}
                      
                      <p className="font-semibold pl-1 border-l-2 border-primary">{cls.title || 'Teacher'} <span className="text-muted-foreground font-normal ml-1">- {format(new Date(cls.date), 'MMM d, yyyy')}</span></p>
                      
                      {cls.notes ? (
                        <div className="bg-muted p-2 rounded-md italic text-muted-foreground mt-2 break-words text-xs">
                          "{cls.notes}"
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground pl-1">No notes recorded.</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Pane - Writer */}
            <div className="w-full md:w-1/2 flex flex-col h-full p-4">
              <label className="font-semibold text-sm mb-2 text-foreground">Write your monthly recap here:</label>
              <Textarea
                className="flex-1 resize-none bg-yellow-50/50 focus-visible:bg-white transition-colors"
                placeholder={`Write an encouraging summary of their progress, reflecting on the notes from the teachers...`}
                value={reportText}
                onChange={e => setReportText(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="p-4 border-t bg-muted/10 shrink-0">
            <Button variant="outline" onClick={() => setSelectedReport(null)}>Cancel</Button>
            <Button onClick={saveReport} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {selectedReport?.status === 'completed' ? 'Update Report' : 'Send Report to Student'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
