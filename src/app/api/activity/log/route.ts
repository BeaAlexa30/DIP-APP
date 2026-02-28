import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/ServerSideDbConnector'
import { logActivity } from '@/lib/activity/ActivityLogger'
import type { ActivityAction } from '@/lib/activity/ActivityLogger'

/**
 * POST /api/activity/log
 * Used by client components (login page, PDF export) to log events
 * that happen client-side and have no server route to instrument.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { action: ActivityAction; details?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowedClientActions: ActivityAction[] = ['login', 'export_pdf', 'change_password']
  if (!allowedClientActions.includes(body.action)) {
    return NextResponse.json({ error: 'Action not allowed via client route' }, { status: 403 })
  }

  await logActivity({
    userId: user.id,
    userEmail: user.email ?? '',
    userName: user.user_metadata?.full_name ?? null,
    action: body.action,
    details: body.details,
  })

  return NextResponse.json({ ok: true })
}
