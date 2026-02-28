import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/AccessControlGuard'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'

export async function GET() {
  const auth = await requirePermission('manageSettings')
  if (!auth.ok) return auth.response

  const db = await createServiceClient()

  const { data, error, count } = await db
    .from('profiles')
    .select('id, email, full_name, role, created_at', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pending: data ?? [], total: count ?? 0 })
}
