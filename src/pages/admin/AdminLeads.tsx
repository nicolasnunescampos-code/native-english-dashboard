import React, { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Clock, PhoneForwarded, CheckCircle2, XCircle, Search, UserPlus, Gift, Trophy, Medal, PieChart as PieChartIcon, BarChart as BarChartIcon, Calendar } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts"

interface Lead {
  id: string
  name: string
  source: string | null
  status: 'pending_contact' | 'contacted' | 'client' | 'lost'
  comments: string | null
  referred_by: string | null
  created_at: string
}

interface Student {
  id: string
  student_name: string
}

const ALL_STATUSES = [
  { id: 'pending_contact', label: 'Pending Contact', icon: Clock, color: 'bg-amber-100 text-amber-800 border-amber-200', bg: 'bg-amber-50' },
  { id: 'contacted', label: 'Already Talked To', icon: PhoneForwarded, color: 'bg-blue-100 text-blue-800 border-blue-200', bg: 'bg-blue-50' },
  { id: 'client', label: 'New Client', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-800 border-emerald-200', bg: 'bg-emerald-50' },
  { id: 'lost', label: 'Didn\'t Close', icon: XCircle, color: 'bg-rose-100 text-rose-800 border-rose-200', bg: 'bg-rose-50' },
] as const

const ACTIVE_PIPELINE = ['pending_contact', 'contacted']

const AdminLeads: React.FC = () => {
  const { toast } = useToast()

  const [leads, setLeads] = useState<Lead[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [openCreate, setOpenCreate] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("board")
  const [timeFilter, setTimeFilter] = useState<'month' | 'year' | 'all'>('month')
  const [searchQuery, setSearchQuery] = useState("")

  const [form, setForm] = useState({
    name: "",
    source: "",
    status: "pending_contact",
    comments: "",
    referred_by: "none",
  })

  // Check if user selected "referral" from source dropdown
  const isReferral = form.source === 'referral'

  const fetchLeads = async () => {
    const { data: leadsData, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })

    if (leadsError && leadsError.code !== '42P01') { 
      toast({
        title: "Error fetching leads",
        description: leadsError.message,
        variant: "destructive",
      })
    } else if (leadsData) {
      setLeads(leadsData)
    }

    // Fetch students to populate the referral dropdown
    const { data: studentsData } = await supabase
      .from("students")
      .select("id, student_name")
      .order("student_name")
    
    if (studentsData) {
      setStudents(studentsData)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  const resetForm = () => {
    setForm({
      name: "",
      source: "",
      status: "pending_contact",
      comments: "",
      referred_by: "none",
    })
  }

  const handleCreateLead = async () => {
    if (!form.name) {
      toast({ title: "Missing fields", description: "Name is required.", variant: "destructive" })
      return
    }

    try {
      setLoading(true)
      const payload: any = {
        name: form.name,
        source: form.source || null,
        status: form.status,
        comments: form.comments || null,
        referred_by: isReferral && form.referred_by !== "none" ? form.referred_by : null
      }

      const { error } = await supabase.from('leads').insert(payload)
      if (error) throw error

      toast({ title: "Lead created", description: "Lead added successfully to the dashboard." })
      setOpenCreate(false)
      resetForm()
      fetchLeads()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (lead: Lead) => {
    setSelectedLead(lead)
    setForm({
      name: lead.name,
      source: lead.source || "",
      status: lead.status,
      comments: lead.comments || "",
      referred_by: lead.referred_by || "none",
    })
    setOpenEdit(true)
  }

  const handleUpdateLead = async () => {
    if (!selectedLead) return
    try {
      setLoading(true)
      const payload: any = {
        name: form.name,
        source: form.source || null,
        status: form.status,
        comments: form.comments || null,
        referred_by: isReferral && form.referred_by !== "none" ? form.referred_by : null
      }

      const { error } = await supabase.from('leads').update(payload).eq('id', selectedLead.id)
      if (error) throw error

      toast({ title: "Lead updated", description: "Changes saved successfully." })
      setOpenEdit(false)
      fetchLeads()
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickStatusChange = async (leadId: string, newStatus: string) => {
    try {
      setLeads(current => current.map(l => l.id === leadId ? { ...l, status: newStatus as any } : l))
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId)
      if (error) throw error
    } catch (err: any) {
      fetchLeads()
      toast({ title: "Failed to update", description: err.message, variant: "destructive" })
    }
  }

  const handleDeleteLead = async () => {
    if (!selectedLead) return
    try {
      setLoading(true)
      const { error } = await supabase.from('leads').delete().eq('id', selectedLead.id)
      if (error) throw error
      toast({ title: "Lead deleted", description: `${selectedLead.name} was removed.` })
      setOpenDelete(false)
      setSelectedLead(null)
      fetchLeads()
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const getStudentName = (id: string) => {
    const s = students.find(s => s.id === id)
    return s ? s.student_name : "Unknown Student"
  }

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (l.source && l.source.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (l.referred_by && getStudentName(l.referred_by).toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const isWithinFilter = (dateString: string | null | undefined, filter: typeof timeFilter) => {
    if (!dateString && filter !== 'all') return false
    if (!dateString) return true
    const d = new Date(dateString)
    const now = new Date()
    if (filter === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }
    if (filter === 'year') {
      return d.getFullYear() === now.getFullYear()
    }
    return true
  }

  const analyticsLeads = useMemo(() => filteredLeads.filter(l => isWithinFilter(l.created_at, timeFilter)), [filteredLeads, timeFilter])
  const analyticsAllLeads = useMemo(() => leads.filter(l => isWithinFilter(l.created_at, timeFilter)), [leads, timeFilter])

  const referralStats = useMemo(() => {
    const stats: Record<string, { id: string, name: string, total: number, converted: number }> = {}
    
    analyticsAllLeads.forEach(l => {
      if (l.referred_by) {
        if (!stats[l.referred_by]) {
          stats[l.referred_by] = {
            id: l.referred_by,
            name: getStudentName(l.referred_by),
            total: 0,
            converted: 0
          }
        }
        stats[l.referred_by].total += 1
        if (l.status === 'client') {
          stats[l.referred_by].converted += 1
        }
      }
    })

    return Object.values(stats).sort((a, b) => {
      if (b.converted !== a.converted) return b.converted - a.converted
      return b.total - a.total
    })
  }, [analyticsAllLeads, students])

  // Analytics Compute
  const closedLeads = analyticsLeads.filter(l => l.status === 'client' || l.status === 'lost')
  const clientCount = closedLeads.filter(l => l.status === 'client').length
  const lostCount = closedLeads.filter(l => l.status === 'lost').length
  const pendingCount = analyticsLeads.filter(l => l.status === 'contacted').length

  const chartData = [
    { name: 'New Clients', value: clientCount, color: '#10b981' }, 
    { name: 'Pending Decision', value: pendingCount, color: '#94a3b8' },
    { name: "Didn't Close", value: lostCount, color: '#f43f5e' } 
  ].filter(d => d.value > 0)

  const sourceStats = useMemo(() => {
    const sources = ['referral', 'old student', 'instagram', 'website', 'ads'] as const;
    const initialStats = sources.reduce((acc, source) => {
      acc[source] = { source, total: 0, converted: 0 };
      return acc;
    }, {} as Record<string, { source: string, total: number, converted: number }>);

    analyticsAllLeads.forEach(l => {
      const src = l.source;
      if (src && initialStats[src]) {
         initialStats[src].total += 1;
         if (l.status === 'client') {
            initialStats[src].converted += 1;
         }
      }
    });

    return Object.values(initialStats).map(s => {
       const capitalizedName = s.source.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
       return {
         name: capitalizedName,
         Leads: s.total,
         Clients: s.converted
       }
    });
  }, [leads]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8 flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      {/* HEADER OVERVIEW */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leads Dashboard</h2>
          <p className="text-muted-foreground mt-1">Manage and track potential clients through your pipeline.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar flex-wrap">
          <TabsList className="bg-muted/50 border shrink-0">
            <TabsTrigger value="board">Pipeline</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="leaderboard">Referrals</TabsTrigger>
          </TabsList>

          {activeTab !== "board" && (
            <div className="flex border rounded-md items-center bg-background shrink-0">
              <Calendar className="w-4 h-4 ml-3 text-muted-foreground" />
              <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
                <SelectTrigger className="w-[124px] border-none shadow-none focus:ring-0 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="relative flex-1 md:w-48 lg:w-64 max-w-[200px] shrink-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search leads..." 
              className="pl-9 bg-background"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={() => { resetForm(); setOpenCreate(true); }} className="shrink-0 shadow-sm">
            <UserPlus className="w-4 h-4 md:mr-2" />
            <span className="hidden md:inline">Add Lead</span>
          </Button>
        </div>
      </div>

      {/* PIPELINE BOARD CONTENT */}
      <TabsContent value="board" className="flex-1 overflow-x-auto pb-4 m-0 data-[state=inactive]:hidden focus-visible:outline-none">
        
        <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary/80 flex items-center justify-between shadow-sm shrink-0 w-full min-w-max">
          <p>
            🔥 <strong>Tip:</strong> Keep this board clean! When you change a lead's status to <b>New Client</b> or <b>Didn't Close</b>, it automatically moves to the <strong>Analytics</strong> tab.
          </p>
        </div>

        <div className="flex gap-6 h-[calc(100%-80px)] min-w-max items-stretch shrink-0">
          {ALL_STATUSES.filter(s => ACTIVE_PIPELINE.includes(s.id)).map(status => {
            const columnLeads = filteredLeads.filter(l => l.status === status.id)
            const Icon = status.icon

            return (
              <div key={status.id} className={`flex flex-col flex-1 min-w-[320px] max-w-[400px] rounded-xl border h-full ${status.bg} bg-opacity-30`}>
                <div className={`p-4 border-b shrink-0 flex items-center justify-between ${status.bg} rounded-t-xl`}>
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${status.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold">{status.label}</h3>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-background border shadow-sm">
                    {columnLeads.length}
                  </span>
                </div>
                
                <div className="p-3 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
                  {columnLeads.length === 0 ? (
                    <div className="text-center p-6 border-2 border-dashed rounded-lg border-muted-foreground/20 text-muted-foreground/60 text-sm h-full flex items-center justify-center">
                      No active leads here
                    </div>
                  ) : (
                    columnLeads.map(lead => (
                      <Card key={lead.id} className="shadow-sm hover:shadow-md transition-shadow group relative">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-[15px] pr-8 truncate" title={lead.name}>
                              {lead.name}
                            </h4>
                            <div className="absolute top-4 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/80 backdrop-blur-sm rounded-md shadow-sm border border-border">
                              <button 
                                onClick={() => handleEditClick(lead)}
                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => { setSelectedLead(lead); setOpenDelete(true); }}
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5 flex-col items-start mb-3">
                            {lead.source && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground">
                                {lead.source}
                              </span>
                            )}
                            {lead.referred_by && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                ⭐ Referred by {getStudentName(lead.referred_by)}
                              </span>
                            )}
                          </div>
                          
                          {lead.comments && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                              {lead.comments}
                            </p>
                          )}
                          
                          <div className="pt-3 border-t mt-auto">
                            <Select 
                              value={lead.status} 
                              onValueChange={(val) => handleQuickStatusChange(lead.id, val)}
                            >
                              <SelectTrigger className="h-8 text-xs bg-background/50 border-dashed hover:border-solid transition-all font-medium">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ALL_STATUSES.map(s => (
                                  <SelectItem key={s.id} value={s.id} className="text-xs">
                                    Move to {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </TabsContent>

      {/* ANALYTICS CONTENT */}
      <TabsContent value="analytics" className="flex-1 overflow-y-auto pb-4 m-0 data-[state=inactive]:hidden focus-visible:outline-none custom-scrollbar pr-2">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Pie Chart & Highlights */}
          <Card className="col-span-1 shadow-sm flex flex-col h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <PieChartIcon className="w-5 h-5 mr-2 text-primary" /> Overall Outcome
              </CardTitle>
              <CardDescription>All closed leads summary.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-between">
              <div className="h-[180px] flex justify-center w-full mb-4">
                {clientCount === 0 && lostCount === 0 && pendingCount === 0 ? (
                  <p className="text-muted-foreground text-center flex items-center h-full">No conversion data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value} people`, 'Total']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', cursor: 'default' }}
                      />
                      <Legend verticalAlign="bottom" height={24} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mt-auto">
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{clientCount}</p>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-600/80 font-bold mt-1">Won Clients</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-rose-700">{lostCount}</p>
                  <p className="text-[10px] uppercase tracking-wider text-rose-600/80 font-bold mt-1">Lost Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart mapping sources to conversions */}
          <Card className="col-span-1 md:col-span-2 shadow-sm flex flex-col h-full">
             <CardHeader className="pb-2">
               <CardTitle className="text-lg flex items-center">
                 <BarChartIcon className="w-5 h-5 mr-2 text-primary" /> Performance by Source
               </CardTitle>
               <CardDescription>Track which channels bring the most leads vs actual clients.</CardDescription>
             </CardHeader>
             <CardContent className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sourceStats} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6B7280', fontSize: 12 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6B7280', fontSize: 12 }} 
                    />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                      cursor={{ fill: 'rgba(0,0,0,0.05)' }} 
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="Leads" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Clients" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
             </CardContent>
           </Card>
        </div>

        {/* CLOSED LEADS LIST */}
        <h3 className="text-xl font-bold tracking-tight mb-4 border-b pb-2">Closed Leads History</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {closedLeads.length === 0 ? (
            <p className="text-muted-foreground col-span-full">No closed leads to display.</p>
          ) : (
            closedLeads.map(lead => {
              const statusConfig = ALL_STATUSES.find(s => s.id === lead.status)
              const Icon = statusConfig?.icon || CheckCircle2

              return (
                <Card key={lead.id} className="relative group">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="pr-6">
                        <h4 className="font-semibold text-sm truncate" title={lead.name}>{lead.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={`p-1.5 rounded-full ${statusConfig?.color}`}>
                         <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="flex gap-2">
                       <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={() => handleEditClick(lead)}>
                         <Pencil className="w-3 h-3 mr-2" /> Edit
                       </Button>
                       <Select 
                          value={lead.status} 
                          onValueChange={(val) => handleQuickStatusChange(lead.id, val)}
                        >
                          <SelectTrigger className="w-full text-xs h-8 bg-muted border-none font-medium">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending_contact" className="text-xs">Re-open (Pending Contact)</SelectItem>
                            <SelectItem value="contacted" className="text-xs">Re-open (Contacted)</SelectItem>
                            <div className="border-t my-1"></div>
                            <SelectItem value="client" className="text-xs text-emerald-600">Client</SelectItem>
                            <SelectItem value="lost" className="text-xs text-rose-600">Didn't Close</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </TabsContent>

      {/* REFERRAL LEADERBOARD CONTENT */}
      <TabsContent value="leaderboard" className="flex-1 overflow-y-auto pb-4 m-0 data-[state=inactive]:hidden focus-visible:outline-none custom-scrollbar pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {referralStats.length === 0 && (
            <div className="col-span-full py-16 text-center border-2 border-dashed rounded-xl bg-muted/20">
              <Gift className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-1">No referrals to track yet</h3>
              <p className="text-sm text-muted-foreground">
                When students refer leads, their conversion stats will appear here.
              </p>
            </div>
          )}
          
          {referralStats.map((stat, index) => (
            <Card key={stat.id} className="relative overflow-hidden border-2 hover:border-primary/50 transition-colors bg-card">
              {index === 0 && stat.converted > 0 && (
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center shadow-sm">
                  <Trophy className="w-3 h-3 mr-1" /> #1 Referrer
                </div>
              )}
              {(index === 1 || index === 2) && stat.converted > 0 && (
                <div className="absolute top-0 right-0 bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center shadow-sm">
                  <Medal className="w-3 h-3 mr-1" /> Top 3
                </div>
              )}
              
              <CardContent className="p-5 pt-6">
                 <h3 className="font-semibold text-lg mb-4 pr-16 truncate" title={stat.name}>{stat.name}</h3>
                 
                 <div className="grid grid-cols-2 gap-3 text-center">
                   <div className="bg-muted rounded-lg p-2.5 border">
                     <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Referred</p>
                     <p className="text-2xl font-bold">{stat.total}</p>
                   </div>
                   
                   <div className={`rounded-lg p-2.5 border ${stat.converted > 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-muted border-transparent opacity-50'}`}>
                     <p className="text-[10px] uppercase tracking-wider font-semibold mb-1">Became Clients</p>
                     <p className="text-2xl font-bold">{stat.converted}</p>
                   </div>
                 </div>
                 
                 {stat.converted > 0 && (
                    <div className="text-center mt-4">
                      <span className="inline-flex items-center justify-center text-[10px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                        {((stat.converted / stat.total) * 100).toFixed(0)}% Conversion Rate
                      </span>
                    </div>
                 )}
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      {/* CREATE / EDIT LEAD MODAL */}
      <Dialog open={openCreate || openEdit} onOpenChange={(open) => {
        if (!open) {
          setOpenCreate(false)
          setOpenEdit(false)
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{openEdit ? "Edit Lead" : "Add New Lead"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label>Lead Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="E.g. Jane Smith"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(val) => setForm({ ...form, source: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="old student">Old Student</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="ads">Ads</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Current Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(val) => setForm({ ...form, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isReferral && (
              <div className="space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-100">
                <Label className="text-purple-800">Who referred them?</Label>
                <Select
                  value={form.referred_by}
                  onValueChange={(val) => setForm({ ...form, referred_by: val })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select a student..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific student</SelectItem>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.student_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Internal Comments / Notes</Label>
              <Textarea
                value={form.comments}
                onChange={(e) => setForm({ ...form, comments: e.target.value })}
                placeholder="What did you discuss? What are their goals?"
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenCreate(false); setOpenEdit(false); }}>Cancel</Button>
            <Button onClick={openEdit ? handleUpdateLead : handleCreateLead} disabled={loading}>
              {loading ? "Saving..." : (openEdit ? "Save Changes" : "Add Lead")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM MODAL */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{selectedLead?.name}</span>?
            </p>
            <p className="text-sm text-destructive mt-1 font-medium">This action cannot be undone.</p>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setOpenDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLead} disabled={loading}>
              {loading ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  )
}

export default AdminLeads
