/**
 * GET /api/admin/users
 * Returns all analyst profiles with their approval status.
 * Admin only.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'

export async function GET() {
  const auth = await requirePermission('manageSettings')
  if (!auth.ok) return auth.response

  const db = await createServiceClient()
  const { data, error } = await db
    .from('profiles')
    .select('id, email, full_name, role, status, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ users: data ?? [] })
}
