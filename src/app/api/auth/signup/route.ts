/**
 * POST /api/auth/signup
 * Handles analyst/admin sign-up server-side.
 *
 * Body: { email, password, role, fullName?, adminCreated? }
 * - adminCreated: true  → called from Settings; account is immediately approved
 * - adminCreated: false → self-signup from login page; analyst starts as pending
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'
import { logActivity } from '@/lib/activity/ActivityLogger'

export async function POST(req: NextRequest) {
  const { email, password, role = 'analyst', fullName = '', adminCreated = false } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  // Only admins can create accounts via the settings panel
  if (adminCreated) {
    const auth = await requirePermission('manageSettings')
    if (!auth.ok) return auth.response
  }

  const db = await createServiceClient()

  // Clean up any orphaned profile row for this email
  await db.from('profiles').delete().eq('email', email)

  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    user_metadata: { role, full_name: fullName },
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const userId = data.user?.id

  // When admin creates the account, immediately approve it and flag temporary password
  if (adminCreated && userId) {
    await db.from('profiles').update({
      status: 'approved',
      password_change_required: true,
    }).eq('id', userId)
  }

  // Log account creation (works for both admin-created and self-signup)
  if (userId) {
    logActivity({
      userId,
      userEmail: email,
      userName: fullName || null,
      action: 'create_account',
      details: { role, adminCreated },
    })
  }

  return NextResponse.json({ success: true, userId })
}
