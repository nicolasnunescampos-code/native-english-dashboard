'use client';

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { format, subMonths, startOfMonth } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { FileText, Loader2, Clock, CheckCircle } from 'lucide-react'

type Report = {
  id: string
  target_month: string
  status: string
  report_text: string | null
  created_at: string
}

export default function StudentReports() {
  const { user, studentName } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  
  const [targetMonth, setTargetMonth] = useState('')
  const [requesting, setRequesting] = useState(false)

  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

  // Generate last 6 months for dropdown
  const monthOptions = Array.from({ length: 6 }).map((_, i) => {
    const d = startOfMonth(subMonths(new Date(), i))
    return {
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy'),
    }
  })

  useEffect(() => {
    if (user) loadReports()
  }, [user])

  const loadReports = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('monthly_reports')
      .select('*')
      .eq('student_id', user!.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setReports(data)
    }
    setLoading(false)
  }

  const requestReport = async () => {
    if (!targetMonth) {
      toast.error('Please select a month')
      return
    }

    if (reports.find(r => r.target_month === targetMonth)) {
      toast.error('You already requested a report for this month.')
      return
    }

    setRequesting(true)
    const { error } = await supabase.from('monthly_reports').insert({
      student_id: user!.id,
      student_name: studentName,
      target_month: targetMonth,
      status: 'pending',
    })

    setRequesting(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Report requested successfully!')
      setTargetMonth('')
      loadReports()
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Monthly Reports
        </h1>
        <p className="text-muted-foreground mt-1">
          Request a summary of your progress and read customized feedback from your teachers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Request a New Report</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4 flex-wrap">
          <div className="w-64">
            <Select value={targetMonth} onValueChange={setTargetMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Select a month..." />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={requestReport} disabled={requesting || !targetMonth}>
            {requesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Request Report
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">Loading your reports...</div>
          ) : reports.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">You haven't requested any reports yet.</div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Requested On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => {
                  const [year, month] = r.target_month.split('-')
                  const displayMonth = format(new Date(parseInt(year), parseInt(month) - 1, 1), 'MMMM yyyy')
                  
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium whitespace-nowrap">{displayMonth}</TableCell>
                      <TableCell className="whitespace-nowrap">{format(new Date(r.created_at), 'PPP')}</TableCell>
                      <TableCell>
                        {r.status === 'completed' ? (
                          <span className="flex items-center gap-1.5 text-green-700 font-medium bg-green-100 px-2.5 py-1 rounded-md w-fit">
                            <CheckCircle className="h-4 w-4" /> Ready
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-amber-700 font-medium bg-amber-100 px-2.5 py-1 rounded-md w-fit">
                            <Clock className="h-4 w-4" /> Pending
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant={r.status === 'completed' ? 'default' : 'outline'}
                          size="sm"
                          disabled={r.status !== 'completed'}
                          onClick={() => setSelectedReport(r)}
                        >
                          Read Report
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto w-[90vw]">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Progress Report 
              {selectedReport && ` (${format(new Date(selectedReport.target_month + '-01T00:00:00'), 'MMMM yyyy')})`}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 prose prose-slate max-w-none prose-p:leading-relaxed">
            {selectedReport?.report_text ? (
              <div dangerouslySetInnerHTML={{ __html: selectedReport.report_text.replace(/\n/g, '<br/>') }} />
            ) : (
              <p className="text-muted-foreground italic">No content found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}