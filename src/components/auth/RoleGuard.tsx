'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export const dashboardPathForRole = (role: string | null | undefined) => {
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : null

  if (normalizedRole === 'admin') {
    return '/admin'
  } else if (normalizedRole === 'teacher') {
    return '/teacher'
  } else if (normalizedRole === 'student') {
    return '/student'
  }

  return '/login'
}

const FullScreenLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">Loading...</div>
)

export const RoleGuard = ({
  children,
  allowedRoles,
}: {
  children: React.ReactNode
  allowedRoles: string[]
}) => {
  const { user, role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    // Not signed in, or no valid role: block access
    if (!user || !role) {
      router.replace('/login')
      return
    }

    // Role mismatch: redirect to the user's correct dashboard
    if (!allowedRoles.includes(role)) {
      router.replace(dashboardPathForRole(role))
    }
  }, [user, role, loading, allowedRoles, router])

  if (loading || !user || !role || !allowedRoles.includes(role)) {
    return <FullScreenLoading />
  }

  return <>{children}</>
}
