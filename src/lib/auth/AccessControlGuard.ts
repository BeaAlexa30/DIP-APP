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
    .select('role')
    .eq('id', user.id)
    .single()

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
