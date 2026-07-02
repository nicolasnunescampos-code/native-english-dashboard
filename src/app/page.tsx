'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { dashboardPathForRole } from '@/components/auth/RoleGuard'

export default function HomePage() {
  const { user, role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(user && role ? dashboardPathForRole(role) : '/login')
  }, [user, role, loading, router])

  return <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>
}
