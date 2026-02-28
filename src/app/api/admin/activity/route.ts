import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/AccessControlGuard'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'

export async function GET(request: NextRequest) {
  const auth = await requirePermission('manageSettings')
  if (!auth.ok) return auth.response

  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = 50
  const offset = (page - 1) * limit
  const action = searchParams.get('action') ?? ''
  const userEmail = searchParams.get('user') ?? ''

  const db = await createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db as any)
    .from('activity_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (action) query = query.eq('action', action)
  if (userEmail) query = query.ilike('user_email', `%${userEmail}%`)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs: data ?? [], total: count ?? 0, page, limit })
}
