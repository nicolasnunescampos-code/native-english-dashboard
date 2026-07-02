'use client'

import { RoleGuard } from '@/components/auth/RoleGuard'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <DashboardLayout>{children}</DashboardLayout>
    </RoleGuard>
  )
}
