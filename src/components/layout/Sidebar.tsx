import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  TrendingDown,
  GraduationCap,
  Bot,
  CheckCircle2,
  Mic,
  Smartphone,
  Zap,
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
  { label: 'Home', path: '/student', icon: <Home className="h-4 w-4" /> },
  { label: 'Native Quest', path: '/student/grammar-rush', icon: <Zap className="h-4 w-4" /> },
  { label: 'Classes', path: '/student/classes', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Video Course', path: '/student/video-course', icon: <Film className="h-4 w-4" /> },
  { label: 'History', path: '/student/history', icon: <History className="h-4 w-4" /> },
  { 
    label: 'Materials', 
    path: '#materials', 
    icon: <BookOpen className="h-4 w-4" />,
    subItems: [
      { label: 'Books', path: '/student/materials', icon: <BookOpen className="h-4 w-4" /> },
      { label: 'Work Book', path: '/student/materials?category=Workbook', icon: <FileText className="h-4 w-4" /> },
      { label: 'Audios', path: '/student/audios', icon: <Megaphone className="h-4 w-4" /> },
    ]
  },
  { label: 'Exams', path: '/student/exams', icon: <GraduationCap className="h-4 w-4" /> },
  { label: 'Native Buddy', path: '/student/buddy', icon: <Bot className="h-4 w-4" /> },
  { label: 'Messages', path: '/student/messages', icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Rules', path: '/student/rules', icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Payments', path: '/student/payments', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Recuperations', path: '/student/recuperations', icon: <RotateCcw className="h-4 w-4" /> },
  { label: 'Profile', path: '/student/profile', icon: <User className="h-4 w-4" /> },
]

const teacherNavItems: NavItem[] = [
  { label: 'Home', path: '/teacher', icon: <Home className="h-4 w-4" /> },
  { label: 'Classes', path: '/teacher/schedule', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Students', path: '/teacher/students', icon: <Users className="h-4 w-4" /> },
  { label: 'Native Quest', path: '/teacher/grammar-rush-tracking', icon: <Zap className="h-4 w-4" /> },
  { 
    label: 'Materials', 
    path: '#materials', 
    icon: <BookOpen className="h-4 w-4" />,
    subItems: [
      { label: 'Books', path: '/teacher/materials', icon: <BookOpen className="h-4 w-4" /> },
      { label: 'Work Book', path: '/teacher/materials?category=Workbook', icon: <FileText className="h-4 w-4" /> },
      { label: 'Audios', path: '/teacher/audios', icon: <Megaphone className="h-4 w-4" /> },
    ]
  },
  { label: 'Video Course', path: '/teacher/video-course', icon: <Film className="h-4 w-4" /> },
  { label: 'Messages', path: '/teacher/messages', icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Rules', path: '/teacher/rules', icon: <ScrollText className="h-4 w-4" /> },
  { label: 'Profile', path: '/teacher/profile', icon: <User className="h-4 w-4" /> },
]

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Student Cards', path: '/admin/student-history', icon: <Users className="h-4 w-4" /> },
  { label: 'Native Quest Rank', path: '/admin/grammar-rush-tracking', icon: <Zap className="h-4 w-4" /> },
  { label: 'Payments', path: '/admin/payments', icon: <CreditCard className="h-4 w-4" /> },
  { label: 'Expenses', path: '/admin/expenses', icon: <TrendingDown className="h-4 w-4" /> },
  {
    label: 'Classes',
    path: '#classes',
    icon: <ScrollText className="h-4 w-4" />,
    subItems: [
      { label: 'Calendar View', path: '/admin/calendar', icon: <Calendar className="h-4 w-4" /> },
      { label: 'Grades', path: '/admin/grades', icon: <Edit className="h-4 w-4" /> },
      { label: 'Recuperations', path: '/admin/recuperations', icon: <RotateCcw className="h-4 w-4" /> },
      { label: 'Exams', path: '/admin/exams', icon: <GraduationCap className="h-4 w-4" /> },
    ]
  },
  { label: 'Leads', path: '/admin/leads', icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'Announcements', path: '/admin/announcements', icon: <Megaphone className="h-4 w-4" /> },
  { label: 'Messages', path: '/admin/messages', icon: <MessageSquare className="h-4 w-4" /> },
  { label: 'Rules', path: '/admin/rules', icon: <ScrollText className="h-4 w-4" /> },
  {
    label: 'Media',
    path: '#media',
    icon: <Film className="h-4 w-4" />,
    subItems: [
      { label: 'Materials', path: '/admin/materials', icon: <BookOpen className="h-4 w-4" /> },
      { label: 'Worksheets', path: '/admin/worksheets', icon: <FileText className="h-4 w-4" /> },
      { label: 'Native Quest', path: '/admin/grammar-rush-questions', icon: <Zap className="h-4 w-4" /> },
      { label: 'Audios', path: '/admin/audios', icon: <Megaphone className="h-4 w-4" /> },
    ]
  },
  { label: 'Video Course', path: '/admin/video-course', icon: <Play className="h-4 w-4" /> },
  {
    label: 'Users',
    path: '#users',
    icon: <Users className="h-4 w-4" />,
    subItems: [
      { label: 'Students', path: '/admin/students', icon: <User className="h-4 w-4" /> },
      { label: 'Teachers', path: '/admin/teachers', icon: <User className="h-4 w-4" /> },
      { label: 'Admins', path: '/admin/admins', icon: <Users className="h-4 w-4" /> },
    ]
  },
  {
    label: 'Tracking',
    path: '#tracking',
    icon: <FileText className="h-4 w-4" />,
    subItems: [
      { label: 'Native Quest', path: '/admin/grammar-rush-tracking', icon: <Zap className="h-4 w-4" /> },
      { label: 'Progress', path: '/admin/progress', icon: <ScrollText className="h-4 w-4" /> },
      { label: 'Feedback Responses', path: '/admin/feedback', icon: <MessageSquare className="h-4 w-4" /> },
      { label: 'Teacher Payments', path: '/admin/teacher-payments', icon: <Wallet className="h-4 w-4" /> },
      { label: 'Confirmations', path: '/admin/confirmations', icon: <CheckCircle2 className="h-4 w-4" /> },
    ]
  },
]

export const Sidebar: React.FC = () => {
  const location = useLocation()
  const { role, signOut, user, studentName, teacherName, rulesAgreed } = useAuth()
  const [open, setOpen] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const [pendingLeadsCount, setPendingLeadsCount] = useState(0)
  const [pendingRecupsCount, setPendingRecupsCount] = useState(0)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Classes: false,
    Users: false,
    Media: false,
    Tracking: false,
    Materials: false,
  })

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  React.useEffect(() => {
    if (role !== 'admin') return

    const fetchPendingLeads = async () => {
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_contact')

      setPendingLeadsCount(count || 0)
    }

    fetchPendingLeads()

    const channel = supabase
      .channel('sidebar_pending_leads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        () => {
          fetchPendingLeads()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [role])

  React.useEffect(() => {
    if (role !== 'admin') return

    const fetchPendingRecups = async () => {
      const { count } = await supabase
        .from('recuperation_classes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      setPendingRecupsCount(count || 0)
    }

    fetchPendingRecups()

    const channel = supabase
      .channel('sidebar_pending_recuperations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recuperation_classes',
        },
        () => {
          fetchPendingRecups()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [role])

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

  const navItems =
    role === 'admin'
      ? adminNavItems
      : role === 'teacher'
        ? teacherNavItems
        : studentNavItems

  const dashboardLabel =
    role === 'admin'
      ? 'Admin Workspace'
      : role === 'teacher'
        ? 'Teacher Studio'
        : 'Student Portal'

  const displayName =
    role === 'student'
      ? studentName
      : role === 'teacher'
        ? teacherName
        : 'Admin'

  const initials = (displayName || 'NE')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')

  const SidebarContent = (
    <>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-white/40 dark:border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-3.5 overflow-hidden">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400/25 via-sky-500/20 to-blue-500/25 backdrop-blur-xl border border-sky-300/60 dark:border-sky-400/35 flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_6px_16px_-4px_rgba(14,165,233,0.22)]">
            <span className="text-sky-600 dark:text-sky-300 font-extrabold text-base tracking-tight">NE</span>
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold truncate text-base tracking-tight text-foreground">Native English</h1>
            <p className="text-[11px] font-medium text-muted-foreground truncate">{dashboardLabel}</p>
          </div>
        </div>
        <div className="hidden md:block">
          <ModeToggle />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        <ul className="space-y-1">
          {navItems.map(item => {
            if (item.subItems) {
              const isOpen = openGroups[item.label]
              return (
                <li key={item.label} className="flex flex-col">
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={cn(
                      'group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium w-full text-left transition-all duration-200',
                      isOpen
                        ? 'bg-white/60 dark:bg-white/[0.07] text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] dark:shadow-none'
                        : 'text-muted-foreground hover:bg-white/45 dark:hover:bg-white/[0.05] hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-white/70 dark:bg-white/[0.08] text-foreground/80 group-hover:text-primary shadow-sm transition-colors">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {item.label === 'Classes' && pendingRecupsCount > 0 && !isOpen && (
                        <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                          {pendingRecupsCount}
                        </span>
                      )}
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-primary transition-transform" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 opacity-60 transition-transform" />
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <ul className="mt-1.5 mb-1 space-y-1 ml-5 border-l border-primary/25 dark:border-white/15 pl-3">
                      {item.subItems.map(subItem => {
                        const isSubActive = subItem.path.includes('?')
                          ? location.pathname + location.search === subItem.path
                          : location.pathname === subItem.path && (!location.search || !location.search.includes('category=Workbook'));

                        return (
                          <li key={subItem.path}>
                            <NavLink
                              to={subItem.path}
                              end
                              onClick={() => setOpen(false)}
                              className={cn(
                                'flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200',
                                isSubActive
                                  ? 'liquid-nav-active text-sky-700 dark:text-sky-200'
                                  : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-white/[0.06] hover:text-foreground'
                              )}
                            >
                              <div className="flex items-center gap-2.5 w-full">
                                {subItem.icon}
                                <span>{subItem.label}</span>
                                {subItem.label === 'Recuperations' && pendingRecupsCount > 0 && (
                                  <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto shadow-sm">
                                    {pendingRecupsCount}
                                  </span>
                                )}
                              </div>
                            </NavLink>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              )
            }

            const isRootDashboard =
              item.path === '/student' || item.path === '/teacher' || item.path === '/admin'

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={isRootDashboard}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'liquid-nav-active text-sky-700 dark:text-sky-200 font-semibold'
                        : 'text-muted-foreground hover:bg-white/50 dark:hover:bg-white/[0.06] hover:text-foreground'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 w-full">
                        <span
                          className={cn(
                            'flex items-center justify-center w-7 h-7 rounded-xl transition-all',
                            isActive
                              ? 'bg-sky-500/20 dark:bg-sky-400/20 text-sky-600 dark:text-sky-300 border border-white/65 dark:border-white/15 shadow-sm'
                              : 'bg-white/70 dark:bg-white/[0.08] text-foreground/80 group-hover:text-primary shadow-sm'
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>

                        {item.label === 'Messages' && totalUnread > 0 && (
                          <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto shrink-0 shadow-[0_2px_8px_rgba(16,185,129,0.5)]">
                            {totalUnread}
                          </span>
                        )}
                        {item.label === 'Leads' && pendingLeadsCount > 0 && (
                          <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto shrink-0 shadow-[0_2px_8px_rgba(245,158,11,0.5)] animate-pulse">
                            {pendingLeadsCount}
                          </span>
                        )}
                      </div>
                      {role === 'student' && item.label === 'Rules' && rulesAgreed === false && (
                        <div
                          className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shrink-0 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                          title="Please agree to the rules"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom Glass User Pod */}
      <div className="p-3.5 border-t border-white/40 dark:border-white/[0.08] shrink-0 space-y-2">
        <div className="liquid-glass-pill rounded-2xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 dark:bg-sky-400/20 border border-sky-400/30 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-300 font-bold text-xs">
            {initials}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center text-[11px] font-semibold px-2 rounded-xl text-primary border-primary/25 hover:bg-primary/10"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-pwa-install'))
            }}
            title="Install App (PWA)"
          >
            <Smartphone className="h-3.5 w-3.5 mr-1 text-primary shrink-0" />
            <span className="truncate">Install App</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-center text-[11px] font-semibold px-2 rounded-xl hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="h-3.5 w-3.5 mr-1 shrink-0" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile floating glass top bar */}
      <div className="md:hidden sticky top-3 z-40 mx-3 mt-3 flex items-center justify-between px-4 py-3 rounded-2xl liquid-glass-sidebar">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-300/60 flex items-center justify-center shadow-sm">
            <span className="text-sky-600 dark:text-sky-300 font-bold text-xs">NE</span>
          </div>
          <span className="font-bold text-sm tracking-tight">Native English</span>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-full liquid-glass-pill"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile spatial glass drawer */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md md:hidden animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <aside
            className="absolute left-3 top-3 bottom-3 w-[276px] rounded-[28px] liquid-glass-sidebar flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-end px-3 pt-3 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/10"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Floating Apple Liquid Glass Sidebar */}
      <aside className="hidden md:flex flex-col w-[268px] shrink-0 my-3.5 ml-3.5 h-[calc(100vh-1.75rem)] sticky top-3.5 rounded-[28px] liquid-glass-sidebar overflow-hidden">
        {SidebarContent}
      </aside>
    </>
  )
}
