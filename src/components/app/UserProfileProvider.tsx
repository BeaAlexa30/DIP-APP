'use client'

import { createContext, useContext } from 'react'
import type { UserProfile } from '@/lib/auth/UserPermissionDefinitions'
import { can, type Permission } from '@/lib/auth/UserPermissionDefinitions'

interface ProfileContextValue {
  profile: UserProfile | null
}

const ProfileContext = createContext<ProfileContextValue>({ profile: null })

export function ProfileProvider({
  profile,
  children,
}: {
  profile: UserProfile | null
  children: React.ReactNode
}) {
  return (
    <ProfileContext.Provider value={{ profile }}>
      {children}
    </ProfileContext.Provider>
  )
}

/** Hook for accessing the current user profile in client components */
export function useProfile() {
  return useContext(ProfileContext)
}

/** Hook for permission checks in client components */
export function useCan(permission: Permission): boolean {
  const { profile } = useProfile()
  return can(profile?.role, permission)
}
