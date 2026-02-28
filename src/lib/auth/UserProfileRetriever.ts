import { cache } from 'react'
import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import type { UserProfile } from '@/lib/auth/UserPermissionDefinitions'

/**
 * React-cached server-side profile getter.
 * Safe to call in multiple Server Components — DB is only hit once per request.
 */
export const getCurrentProfile = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const serviceClient = await createServiceClient()
  const { data } = await serviceClient
    .from('profiles')
    .select('full_name, role, email, status')
    .eq('id', user.id)
    .single()

  if (!data) return null

  return {
    full_name: data.full_name,
    email: data.email,
    role: data.role as UserProfile['role'],
    status: data.status as 'pending' | 'approved' | 'rejected',
  }
})
