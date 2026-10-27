import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, UserMinus, UserCheck, AlertCircle, Calendar, Plus, Trash2, CheckCircle2, Circle, Trophy, Medal, Zap, GraduationCap, ArrowRight, RotateCcw } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, PieChart, Pie, Cell, Legend } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { NativeQuestLeaderboardCard } from "@/components/grammar-rush/NativeQuestLeaderboardCard"

const AdminMainDashboard: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'month' | 'year' | 'all'>('month')
  const [showAllSources, setShowAllSources] = useState(false)
  const [selectedSourceForModal, setSelectedSourceForModal] = useState<string | null>(null)
  const [rawData, setRawData] = useState<{ students: any[] }>({ students: [] })
  const [metrics, setMetrics] = useState({
    totalStudents: 0,
    stoppedStudents: 0,
    newClients: 0,
    newReferrals: 0
  })
  const [pendingRecupsCount, setPendingRecupsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        
        const studentsRes = await supabase.from('students').select('*')
        const { count: recupsCount } = await supabase
          .from('recuperation_classes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        if (studentsRes.error) throw studentsRes.error

        const students = studentsRes.data || []

        setPendingRecupsCount(recupsCount || 0)
        setRawData({
          students: students
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

    setMetrics({
      totalStudents: rawData.students.filter(s => s.status !== 'stopped').length, // ALWAYS GLOBAL
      stoppedStudents: stoppedStudentsList.length, // FILTERED BY TIME
      newClients: filteredStudents.length, // FILTERED BY TIME
      newReferrals: filteredStudents.filter(s => s.source === 'referral').length // FILTERED BY TIME
    })
  }, [rawData, timeFilter])

  const pieData = [
    { name: 'Active Students', value: metrics.totalStudents, color: '#10b981' }, // emerald
    { name: 'Stopped', value: metrics.stoppedStudents, color: '#ef4444' } // red
  ]

  const barData = [
    { name: 'Total New Clients', count: metrics.newClients, fill: '#10b981' },
    { name: 'New Referrals', count: metrics.newReferrals, fill: '#8b5cf6' } // purple
  ]

  // Calculate source breakdown globally
  const sourceBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {}
    rawData.students.forEach(s => {
      if (s.source === 'referral' && s.referred_by) {
        const referrerName = rawData.students.find(r => r.id === s.referred_by)?.student_name || 'Unknown'
        const key = `Referral: ${referrerName}`
        counts[key] = (counts[key] || 0) + 1
      } else if (s.source && s.source !== 'none' && s.source.trim() !== '') {
        let key = s.source
        if (key === 'instagram') key = 'Instagram'
        else if (key === 'website') key = 'Website'
        else if (key === 'ads') key = 'Ads'
        else if (key === 'other') key = 'Other'
        else key = key.charAt(0).toUpperCase() + key.slice(1)
        
        counts[key] = (counts[key] || 0) + 1
      }
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [rawData.students])

  const studentsForSelectedSource = React.useMemo(() => {
    if (!selectedSourceForModal) return []
    return rawData.students.filter(s => {
      if (selectedSourceForModal.startsWith('Referral:')) {
        const referrerName = selectedSourceForModal.replace('Referral: ', '')
        const referrerId = rawData.students.find(r => r.student_name === referrerName)?.id
        return s.source === 'referral' && s.referred_by === referrerId
      } else {
        let key = s.source
        if (!key || key === 'none' || key.trim() === '') return false
        if (key === 'instagram') key = 'Instagram'
        else if (key === 'website') key = 'Website'
        else if (key === 'ads') key = 'Ads'
        else if (key === 'other') key = 'Other'
        else key = key.charAt(0).toUpperCase() + key.slice(1)
        
        return key === selectedSourceForModal
      }
    })
  }, [selectedSourceForModal, rawData.students])

  return (
    <div className="space-y-6 pb-8">
      <div className="mb-6 p-6 sm:p-7 liquid-glass-card bg-gradient-to-r from-sky-400/15 via-sky-500/10 to-indigo-400/10 border-sky-300/60 dark:border-sky-400/25 rounded-3xl relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 w-64 h-64 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-20 w-64 h-64 rounded-full bg-sky-300/15 blur-3xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-1.5">Platform Overview</h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
              Track the growth, conversions, and retention of your student base in one spatial hub.
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="liquid-glass-pill px-2 py-1 rounded-2xl flex items-center">
              <Calendar className="w-4 h-4 text-primary ml-2 mr-1.5" />
              <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
                <SelectTrigger className="w-[136px] h-9 bg-transparent border-none shadow-none text-foreground focus:ring-0 focus:ring-offset-0 font-semibold">
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
      </div>

      {pendingRecupsCount > 0 && (
        <div className="p-4 rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold shrink-0">
              <RotateCcw className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                {pendingRecupsCount} Unscheduled Recuperation {pendingRecupsCount === 1 ? 'Class' : 'Classes'} Waiting
              </h4>
              <p className="text-xs text-amber-900/80 dark:text-amber-300/80">
                Students have rescheduled or received courtesy credits that haven't been slotted yet.
              </p>
            </div>
          </div>
          <Link to="/admin/calendar">
            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 shadow-sm shrink-0">
              Open Calendar Tray & Schedule
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="hover:-translate-y-0.5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-13 h-13 p-3.5 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border border-emerald-400/30 text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Active Students</p>
              <h3 className="text-3xl font-extrabold tracking-tight mt-0.5">{loading ? '-' : metrics.totalStudents}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:-translate-y-0.5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-13 h-13 p-3.5 rounded-2xl bg-gradient-to-br from-rose-400/20 to-red-500/20 border border-rose-400/30 text-rose-600 dark:text-rose-400 shrink-0 shadow-sm">
              <UserMinus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Stopped Students</p>
              <h3 className="text-3xl font-extrabold tracking-tight mt-0.5">{loading ? '-' : metrics.stoppedStudents}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:-translate-y-0.5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-13 h-13 p-3.5 rounded-2xl bg-gradient-to-br from-sky-400/20 to-blue-600/20 border border-sky-400/30 text-blue-600 dark:text-sky-400 shrink-0 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Total New Clients</p>
              <h3 className="text-3xl font-extrabold tracking-tight mt-0.5">{loading ? '-' : metrics.newClients}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:-translate-y-0.5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-13 h-13 p-3.5 rounded-2xl bg-gradient-to-br from-purple-400/20 to-indigo-600/20 border border-purple-400/30 text-purple-600 dark:text-purple-400 shrink-0 shadow-sm">
              <Plus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">New Referrals</p>
              <h3 className="text-3xl font-extrabold tracking-tight mt-0.5">{loading ? '-' : metrics.newReferrals}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* STUDENT 360° CARDS DIRECTORY (Matches Teacher View + Native Quest Progress) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border-sky-500/30 bg-gradient-to-br from-sky-500/[0.06] to-indigo-500/[0.04]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400/20 to-blue-600/20 border border-sky-400/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-sm">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <span>Student 360° Cards &amp; Native Quest Progress</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  Same directory &amp; profile cards teachers see — plus full Native Quest mastery
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Inspect any student&apos;s CEFR stage, skill averages, exams, class history, and Native Quest game progress.
            </p>
            <Button asChild className="shrink-0 gap-1.5">
              <Link to="/admin/student-history">
                <Users className="w-4 h-4" />
                Open Student Cards
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/[0.06] to-orange-500/[0.04]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-400/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <span>Native Quest Tracker &amp; Question Bank</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">
                  Monitor game sessions, pronunciation scores, and manage questions
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              View detailed session logs or screenshot the weekly podium below to post on social media!
            </p>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/grammar-rush-questions">Question Bank</Link>
              </Button>
              <Button asChild size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                <Link to="/admin/grammar-rush-tracking">Full Tracker</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SOCIAL-MEDIA SCREENSHOT-READY WEEKLY NATIVE QUEST RANKING */}
      <NativeQuestLeaderboardCard
        showSocialMediaButton={true}
        title="Native Quest Weekly Ranking (Social Media Ready)"
        subtitle="Click 'Social Media Rank Card' on the right to open a clean weekly championship poster ready to screenshot and post!"
      />

      {/* SOURCES BREAKDOWN */}
      <div className="mt-8 mb-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold tracking-tight">
            {showAllSources ? "📈 All Client Sources" : "🏆 Top Sources"}
          </h3>
          {sourceBreakdown.length > 3 && (
            <Button variant="outline" size="sm" onClick={() => setShowAllSources(!showAllSources)}>
              {showAllSources ? "Show Less" : "Show More"}
            </Button>
          )}
        </div>
        
        {sourceBreakdown.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar p-1">
            {(showAllSources ? sourceBreakdown : sourceBreakdown.slice(0, 3)).map((src, i) => {
              let style = 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-400/25'
              if (src.name.startsWith('Referral:')) style = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-400/30'
              else if (src.name === 'Instagram') style = 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-400/30'
              else if (src.name === 'Website') style = 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-400/30'
              else if (src.name === 'Ads') style = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/30'

              return (
                <div 
                  key={src.name} 
                  className="flex items-center gap-4 liquid-glass-card rounded-2xl px-5 py-4 cursor-pointer hover:-translate-y-0.5 transition-all"
                  onClick={() => setSelectedSourceForModal(src.name)}
                >
                  <div className={`p-3 rounded-2xl ${style}`}>
                    {(!showAllSources && i === 0) ? <Trophy className="w-5 h-5" /> :
                     (!showAllSources && i > 0) ? <Medal className="w-5 h-5" /> :
                     src.name.startsWith('Referral:') ? <Users className="w-5 h-5" /> : 
                     <span className="font-bold w-5 h-5 flex items-center justify-center">#</span>}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-sm truncate" title={src.name}>
                      {src.name.startsWith('Referral:') ? src.name.replace('Referral: ', '') : src.name}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">{src.count} client{src.count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-3xl liquid-glass-card">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <h4 className="text-md font-semibold mb-1 text-muted-foreground">No source data yet</h4>
            <p className="text-sm text-muted-foreground/70">As you add students with sources, they will appear here.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
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
                    <RechartsTooltip contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
             )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Growth Snapshot</CardTitle>
            <CardDescription>Compare new students vs referrals.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(148, 163, 184, 0.25)" />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fill: '#64748B', fontSize: 13 }} />
                <XAxis type="number" axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{ fill: 'rgba(59,130,246,0.06)' }} contentStyle={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.6)', backdropFilter: 'blur(16px)', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={40}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedSourceForModal} onOpenChange={(open: boolean) => !open && setSelectedSourceForModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Students from {selectedSourceForModal}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            {studentsForSelectedSource.length > 0 ? (
              <ul className="space-y-2">
                {studentsForSelectedSource.map(s => (
                  <li key={s.id} className="p-3.5 rounded-2xl liquid-glass-pill flex flex-col">
                    <span className="font-semibold text-sm">{s.student_name}</span>
                    <span className="text-xs text-muted-foreground">{s.email}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No students found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminMainDashboard
