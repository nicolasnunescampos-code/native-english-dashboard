'use client'

import { RoleGuard } from '@/components/auth/RoleGuard'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['student']}>
      <DashboardLayout>{children}</DashboardLayout>
    </RoleGuard>
  )
}
