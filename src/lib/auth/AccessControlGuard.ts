import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { NextResponse } from 'next/server'
import type { UserRole } from '@/lib/auth/UserPermissionDefinitions'
import { can, type Permission } from '@/lib/auth/UserPermissionDefinitions'

/**
 * Checks auth + role permission for API route handlers.
 * Returns the user + role, or a NextResponse error to return immediately.
 */
export async function requirePermission(permission: Permission): Promise<
  | { ok: true; userId: string; role: UserRole }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const serviceClient = await createServiceClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role, status, is_active')
    .eq('id', user.id)
    .single()

  // Block pending / rejected accounts
  if (profile?.status === 'pending') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Your account is pending admin approval.' },
        { status: 403 }
      ),
    }
  }
  if (profile?.status === 'rejected') {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Your account access has been declined.' },
        { status: 403 }
      ),
    }
  }
  if (profile?.is_active === false) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Your account has been deactivated. Contact an administrator.' },
        { status: 403 }
      ),
    }
  }

  const role = (profile?.role ?? 'analyst') as UserRole

  if (!can(role, permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Forbidden: your role (${role}) cannot perform this action.` },
        { status: 403 }
      ),
    }
  }

  return { ok: true, userId: user.id, role }
}
