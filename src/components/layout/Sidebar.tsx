import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import {
  Home,
  BookOpen,
  History,
  CreditCard,
  ScrollText,
  Calendar,
  Edit,
  Users,
  Megaphone,
  LogOut,
  Film,
  Menu,
  X,
  Play,
  User,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Wallet,
  FileText,
  RotateCcw,
  LayoutDashboard,
  TrendingUp,
  GraduationCap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModeToggle } from '@/components/mode-toggle'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  subItems?: NavItem[]
}

const studentNavItems: NavItem[] = [
  { label: 'Home', path: '/student', icon: <Home className="h-5 w-5" /> },
  { label: 'Classes', path: '/student/classes', icon: <Calendar className="h-5 w-5" /> },
  { label: 'Exams', path: '/student/exams', icon: <GraduationCap className="h-5 w-5" /> },
  { label: 'Materials', path: '/student/materials', icon: <BookOpen className="h-5 w-5" /> },
  { label: 'History', path: '/student/history', icon: <History className="h-5 w-5" /> },
  { label: 'Reports', path: '/student/reports', icon: <FileText className="h-5 w-5" /> },
  { label: 'Messages', path: '/student/messages', icon: <MessageSquare className="h-5 w-5" /> },
  { label: 'Videos', path: '/student/videos', icon: <Play className="h-5 w-5" /> },
  { label: 'Announcements', path: '/student/announcements', icon: <Megaphone className="h-5 w-5" /> },
  { label: 'Rules', path: '/student/rules', icon: <ScrollText className="h-5 w-5" /> },
  { label: 'Payments', path: '/student/payments', icon: <CreditCard className="h-5 w-5" /> },
  { label: 'Recuperations', path: '/student/recuperations', icon: <RotateCcw className="h-5 w-5" /> },
  { label: 'Profile', path: '/student/profile', icon: <User className="h-5 w-5" /> },
]

const teacherNavItems: NavItem[] = [
  { label: 'Home', path: '/teacher', icon: <Home className="h-5 w-5" /> },
  { label: 'Weekly Schedule', path: '/teacher/schedule', icon: <Calendar className="h-5 w-5" /> },
  { label: 'Calendar', path: '/teacher/calendar', icon: <Calendar className="h-5 w-5" /> },
  // { label: 'Grade Classes', path: '/teacher/grade', icon: <Edit className="h-5 w-5" /> },
  { label: 'Students', path: '/teacher/students', icon: <Users className="h-5 w-5" /> },
  { label: 'Materials', path: '/teacher/materials', icon: <BookOpen className="h-5 w-5" /> },
  { label: 'Videos', path: '/teacher/videos', icon: <Play className="h-5 w-5" /> },
  { label: 'Messages', path: '/teacher/messages', icon: <MessageSquare className="h-5 w-5" /> },
  { label: 'Rules', path: '/teacher/rules', icon: <ScrollText className="h-5 w-5" /> },
]

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-5 w-5" /> },
  { label: 'Payments', path: '/admin/payments', icon: <CreditCard className="h-5 w-5" /> },
  {
    label: 'Classes',
    path: '#classes',
    icon: <ScrollText className="h-5 w-5" />,
    subItems: [
      { label: 'All Classes', path: '/admin/classes', icon: <Calendar className="h-5 w-5" /> },
      { label: 'Calendar View', path: '/admin/calendar', icon: <Calendar className="h-5 w-5" /> },
      { label: 'Grades', path: '/admin/grades', icon: <Edit className="h-5 w-5" /> },
      { label: 'Recuperations', path: '/admin/recuperations', icon: <RotateCcw className="h-5 w-5" /> },
      { label: 'Exams', path: '/admin/exams', icon: <GraduationCap className="h-5 w-5" /> },
    ]
  },
  { label: 'Leads', path: '/admin/leads', icon: <TrendingUp className="h-5 w-5" /> },
  { label: 'Announcements', path: '/admin/announcements', icon: <Megaphone className="h-5 w-5" /> },
  { label: 'Messages', path: '/admin/messages', icon: <MessageSquare className="h-5 w-5" /> },
  { label: 'Rules', path: '/admin/rules', icon: <ScrollText className="h-5 w-5" /> },
  {
    label: 'Media',
    path: '#media',
    icon: <Film className="h-5 w-5" />,
    subItems: [
      { label: 'Materials', path: '/admin/materials', icon: <BookOpen className="h-5 w-5" /> },
      { label: 'Videos', path: '/admin/videos', icon: <Play className="h-5 w-5" /> },
      { label: 'Audios', path: '/admin/audios', icon: <Megaphone className="h-5 w-5" /> },
    ]
  },
  {
    label: 'Users',
    path: '#users',
    icon: <Users className="h-5 w-5" />,
    subItems: [
      { label: 'Students', path: '/admin/students', icon: <User className="h-5 w-5" /> },
      { label: 'Teachers', path: '/admin/teachers', icon: <User className="h-5 w-5" /> },
      { label: 'Admins', path: '/admin/admins', icon: <Users className="h-5 w-5" /> },
    ]
  },
  {
    label: 'Tracking',
    path: '#tracking',
    icon: <FileText className="h-5 w-5" />,
    subItems: [
      { label: 'Progress', path: '/admin/progress', icon: <ScrollText className="h-5 w-5" /> },
      { label: 'Student Reports', path: '/admin/reports', icon: <FileText className="h-5 w-5" /> },
    ]
  },
  { label: 'Teacher Payments', path: '/admin/teacher-payments', icon: <Wallet className="h-5 w-5" /> },
]

export const Sidebar: React.FC = () => {
  const { role, signOut, user, studentName, teacherName, rulesAgreed } = useAuth()
  const [open, setOpen] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const [pendingReportsCount, setPendingReportsCount] = useState(0)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Classes: false,
    Users: false,
    Media: false,
    Tracking: false,
  })

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  React.useEffect(() => {
    if (!user?.id) return

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false)

      setTotalUnread(count || 0)
    }

    fetchUnread()

    const channel = supabase
      .channel('sidebar_unread_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnread()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  React.useEffect(() => {
    if (role !== 'admin') return

    const fetchPendingReports = async () => {
      const { count } = await supabase
        .from('monthly_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      
      setPendingReportsCount(count || 0)
    }

    fetchPendingReports()

    const channel = supabase
      .channel('sidebar_pending_reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'monthly_reports' },
        () => fetchPendingReports()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [role])

  const navItems =
    role === 'admin'
      ? adminNavItems
      : role === 'teacher'
        ? teacherNavItems
        : studentNavItems

  const dashboardLabel =
    role === 'admin'
      ? 'Admin Dashboard'
      : role === 'teacher'
        ? 'Teacher Dashboard'
        : 'Student Dashboard'

  const displayName =
    role === 'student'
      ? studentName
      : role === 'teacher'
        ? teacherName
        : 'Admin'

  const SidebarContent = (
    <>
      {/* Header */}
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-lg">NE</span>
          </div>
          <div className="overflow-hidden">
            <h1 className="font-semibold truncate text-lg">Native English</h1>
            <p className="text-xs text-muted-foreground truncate">{dashboardLabel}</p>
          </div>
        </div>
        <div className="hidden md:block">
          <ModeToggle />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(item => {
            if (item.subItems) {
              const isOpen = openGroups[item.label]
              return (
                <li key={item.label} className="flex flex-col">
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className="flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground w-full text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {role === 'admin' && item.label === 'Tracking' && pendingReportsCount > 0 && !isOpen && (
                        <div className="w-2 h-2 bg-destructive rounded-full animate-pulse shrink-0" title="Pending reports in this group" />
                      )}
                      {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    </div>
                  </button>
                  {isOpen && (
                    <ul className="mt-1 space-y-1 ml-[1.65rem] border-l-2 border-muted pl-4">
                      {item.subItems.map(subItem => (
                        <li key={subItem.path}>
                          <NavLink
                            to={subItem.path}
                            onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                                isActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )
                            }
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="flex items-center gap-3">
                                {subItem.icon}
                                {subItem.label}
                              </div>
                              {role === 'admin' && subItem.label === 'Student Reports' && pendingReportsCount > 0 && (
                                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse shrink-0 ml-auto" title="Pending reports to complete" />
                              )}
                            </div>
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            }

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )
                  }
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center gap-3">
                      {item.icon}
                      {item.label}
                    </div>
                    {item.label === 'Messages' && totalUnread > 0 && (
                      <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto shrink-0 shadow-sm">
                        {totalUnread}
                      </span>
                    )}
                  </div>
                  {role === 'student' && item.label === 'Rules' && rulesAgreed === false && (
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse shrink-0" title="Please agree to the rules" />
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border shrink-0">
        <div className="mb-3">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>

        <Button
          variant="secondary"
          className="w-full justify-start mt-2"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Logout
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="font-semibold">Native English</div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu />
          </Button>
        </div>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 h-full w-64 bg-card flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-end p-2 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X />
              </Button>
            </div>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen border-r bg-card">
        {SidebarContent}
      </aside>
    </>
  )
}
