'use client';

import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, UserMinus, UserCheck, AlertCircle, Calendar, Plus, Trash2, CheckCircle2, Circle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

const AdminMainDashboard: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'month' | 'year' | 'all'>('month')
  const [rawData, setRawData] = useState<{ students: any[], leads: any[] }>({ students: [], leads: [] })
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    stoppedStudents: 0,
    newClients: 0,
    pendingLeads: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        
        const [studentsRes, leadsRes] = await Promise.all([
          supabase.from('students').select('*'),
          supabase.from('leads').select('*')
        ])

        if (studentsRes.error) throw studentsRes.error
        if (leadsRes.error) throw leadsRes.error

        const students = studentsRes.data || []
        const leads = leadsRes.data || []

        setRawData({
          students: students,
          leads: leads
        })
      } catch (err) {
        console.error("Error fetching admin metrics:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  useEffect(() => {
    const isWithinFilter = (dateString: string | null | undefined) => {
      if (!dateString && timeFilter !== 'all') return false
      if (!dateString) return true
      const d = new Date(dateString)
      const now = new Date()
      if (timeFilter === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }
      if (timeFilter === 'year') {
        return d.getFullYear() === now.getFullYear()
      }
      return true
    }

    const filteredStudents = rawData.students.filter(s => isWithinFilter(s.created_at))
    const stoppedStudentsList = rawData.students.filter(s => s.status === 'stopped' && isWithinFilter(s.stopped_at || s.created_at))
    const filteredLeads = rawData.leads.filter(l => isWithinFilter(l.created_at))

    setMetrics({
      totalStudents: rawData.students.filter(s => s.status !== 'stopped').length, // ALWAYS GLOBAL
      stoppedStudents: stoppedStudentsList.length, // FILTERED BY TIME
      newClients: filteredLeads.filter(l => l.status === 'client').length, // FILTERED BY TIME
      pendingLeads: filteredLeads.filter(l => ['pending_contact', 'contacted'].includes(l.status)).length // FILTERED BY TIME
    })
  }, [rawData, timeFilter])

  const pieData = [
    { name: 'Active Students', value: metrics.totalStudents, color: '#10b981' }, // emerald
    { name: 'Stopped', value: metrics.stoppedStudents, color: '#ef4444' } // red
  ]

  const barData = [
    { name: 'New Clients (Won)', count: metrics.newClients, fill: '#10b981' },
    { name: 'Pending Leads', count: metrics.pendingLeads, fill: '#f59e0b' } // amber
  ]

  return (
    <div className="space-y-6">
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Platform Overview</h1>
            <p className="text-blue-100 opacity-90 max-w-2xl">
              Track the growth, conversions, and retention of your student base perfectly all in one central hub.
            </p>
          </div>
          
          <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-sm border border-white/20 flex items-center">
            <Calendar className="w-4 h-4 text-white/80 ml-2 mr-2" />
            <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
              <SelectTrigger className="w-[140px] bg-transparent border-none text-white focus:ring-0 focus:ring-offset-0 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex flex-col justify-center items-center text-center">
            <UserCheck className="w-8 h-8 text-emerald-500 mb-2" />
            <h3 className="text-3xl font-bold">{loading ? '-' : metrics.totalStudents}</h3>
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mt-1">Active Students</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex flex-col justify-center items-center text-center">
            <UserMinus className="w-8 h-8 text-red-500 mb-2" />
            <h3 className="text-3xl font-bold">{loading ? '-' : metrics.stoppedStudents}</h3>
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mt-1">Stopped Students</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col justify-center items-center text-center">
            <Users className="w-8 h-8 text-blue-500 mb-2" />
            <h3 className="text-3xl font-bold">{loading ? '-' : metrics.newClients}</h3>
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mt-1">Total New Clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col justify-center items-center text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
            <h3 className="text-3xl font-bold">{loading ? '-' : metrics.pendingLeads}</h3>
            <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mt-1">Pending Leads</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Student Retention</CardTitle>
            <CardDescription>Ratio of active vs stopped students.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             {metrics.totalStudents === 0 && metrics.stoppedStudents === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">No students yet</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
             )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Pipeline Snapshot</CardTitle>
            <CardDescription>Compare leads in the pipeline.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fill: '#6B7280', fontSize: 13 }} />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={40}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

export default AdminMainDashboard