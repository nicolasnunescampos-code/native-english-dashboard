import React from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { FeedbackPopup } from '@/components/FeedbackPopup'
import { TeacherWeeklyConfirmationBlocker } from '@/components/TeacherWeeklyConfirmationBlocker'
import { AdminLeadNotifier } from '@/components/AdminLeadNotifier'
import { StudentNotifier } from '@/components/student/StudentNotifier'
import { TeacherNotifier } from '@/components/teacher/TeacherNotifier'
import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'

interface DashboardLayoutProps {
  children?: React.ReactNode
  hideHeader?: boolean
  hideSidebar?: boolean
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  hideHeader = false,
  hideSidebar = false,
}) => {
  const { studentName, teacherName, role } = useAuth()

  const displayName =
    role === 'student'
      ? studentName
      : role === 'teacher'
        ? teacherName
        : 'Admin'

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const todayFormatted = format(new Date(), 'EEEE, MMM d')

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-transparent">
      {/* Floating Glass Sidebar */}
      {!hideSidebar && <Sidebar />}

      {/* Main Spatial Content Area */}
      <main className="flex-1 overflow-x-hidden">
        <div
          className={
            hideSidebar
              ? 'w-full'
              : 'px-4 py-5 sm:px-6 lg:px-8 max-w-[1600px] mx-auto'
          }
        >
          {/* Apple Liquid Glass Welcome Bar */}
          {!hideHeader && (
            <div className="mb-6 liquid-glass-card rounded-3xl px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center text-[11px] font-semibold uppercase tracking-widest text-sky-600 dark:text-sky-400">
                  <span>{role || 'Workspace'} Portal</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  {greeting}, {displayName} 👋
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Welcome back to your Native English workspace
                </p>
              </div>

              <div className="flex items-center gap-2.5 self-start sm:self-center">
                <div className="liquid-glass-pill rounded-2xl px-4 py-2 flex items-center gap-2 text-xs font-semibold text-foreground/85">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span>{todayFormatted}</span>
                </div>
              </div>
            </div>
          )}

          {/* Page Content */}
          <div className="w-full animate-fade-in">
            {children || <Outlet />}
          </div>
        </div>
      </main>
      
      {/* Popups and Blocker Modals that trigger conditionally */}
      <FeedbackPopup />
      <TeacherWeeklyConfirmationBlocker />
      {role === 'admin' && <AdminLeadNotifier />}
      {role === 'student' && <StudentNotifier />}
      {role === 'teacher' && <TeacherNotifier />}
    </div>
  )
}
