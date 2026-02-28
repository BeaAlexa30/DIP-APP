/**
 * POST /api/auth/change-password
 * Updates the authenticated user's password and clears password_change_required.
 * Body: { newPassword: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { logActivity } from '@/lib/activity/ActivityLogger'

export async function POST(req: NextRequest) {
  const { newPassword } = await req.json()

  if (!newPassword || newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  // Update password via Supabase admin API
  const db = await createServiceClient()
  const { error } = await db.auth.admin.updateUserById(user.id, { password: newPassword })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Clear the temporary password flag
  await db.from('profiles').update({ password_change_required: false }).eq('id', user.id)

  logActivity({
    userId: user.id,
    userEmail: user.email ?? '',
    action: 'change_password',
  })

  return NextResponse.json({ success: true })
}
