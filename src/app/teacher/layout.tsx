'use client'

import { RoleGuard } from '@/components/auth/RoleGuard'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['teacher']}>
      <DashboardLayout>{children}</DashboardLayout>
    </RoleGuard>
  )
}
