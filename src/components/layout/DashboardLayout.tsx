'use client';

import React from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { useAuth } from '@/contexts/AuthContext'

interface DashboardLayoutProps {
  children?: React.ReactNode
  hideHeader?: boolean
}

// Routes that render their own full-bleed UI and hide the greeting header.
const shouldHideHeader = (pathname: string) =>
  pathname.endsWith('/videos') ||
  pathname.endsWith('/messages') ||
  /\/exams\/[^/]+$/.test(pathname)

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, hideHeader }) => {
  const { studentName, teacherName, role } = useAuth()
  const pathname = usePathname()

  const displayName =
    role === 'student'
      ? studentName
      : role === 'teacher'
        ? teacherName
        : 'Admin'

  const headerHidden = hideHeader ?? shouldHideHeader(pathname ?? '')

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {/* Header */}
          {!headerHidden && (
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                Hi, {displayName} 👋
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Welcome to your dashboard
              </p>
            </div>
          )}

          {/* Page Content */}
          <div className="w-full">{children}</div>
        </div>
      </main>
    </div>
  )
}
