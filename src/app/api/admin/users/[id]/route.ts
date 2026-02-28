/**
 * PATCH /api/admin/users/[id]
 * Body:
 *   { action: 'approve' | 'reject' }         — update approval status
 *   { action: 'setActive' | 'setInactive' }  — toggle login ability
 *   { action: 'edit', fullName: string }      — update display name
 *
 * DELETE /api/admin/users/[id]
 *   — permanently delete the user (auth + profile)
 *
 * Admin only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'
import { logActivity, getUserInfo } from '@/lib/activity/ActivityLogger'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requirePermission('manageSettings')
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await req.json()
  const { action } = body

  const db = await createServiceClient()

  // ── Approve / Reject ──────────────────────────────────────────────────────
  if (action === 'approve' || action === 'reject') {
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    const { error } = await db
      .from('profiles')
      .update({ status: newStatus })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    getUserInfo(auth.userId).then(u =>
      logActivity({ userId: auth.userId, userEmail: u.email, userName: u.name, action: action === 'approve' ? 'approve_user' : 'reject_user', details: { targetUserId: id } })
    )
    return NextResponse.json({ success: true, status: newStatus })
  }

  // ── Activate / Deactivate ─────────────────────────────────────────────────
  if (action === 'setActive' || action === 'setInactive') {
    const is_active = action === 'setActive'
    const { error } = await db
      .from('profiles')
      .update({ is_active })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    getUserInfo(auth.userId).then(u =>
      logActivity({ userId: auth.userId, userEmail: u.email, userName: u.name, action: is_active ? 'set_active' : 'set_inactive', details: { targetUserId: id } })
    )
    return NextResponse.json({ success: true, is_active })
  }

  // ── Edit name ────────────────────────────────────────────────────────────
  if (action === 'edit') {
    const { fullName } = body
    if (typeof fullName !== 'string' || !fullName.trim()) {
      return NextResponse.json({ error: 'fullName is required.' }, { status: 400 })
    }
    const { error } = await db
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    getUserInfo(auth.userId).then(u =>
      logActivity({ userId: auth.userId, userEmail: u.email, userName: u.name, action: 'edit_user', details: { targetUserId: id, newName: fullName.trim() } })
    )
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const auth = await requirePermission('manageSettings')
  if (!auth.ok) return auth.response

  const { id } = await params

  // Prevent admin from deleting their own account
  if (id === auth.userId) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 })
  }

  const db = await createServiceClient()

  // Capture deleted user info before deletion for the log
  const deletedUserInfo = await getUserInfo(id)

  // Delete from Supabase Auth (cascades to profiles if FK is set, but we also do it manually)
  const { error: authError } = await db.auth.admin.deleteUser(id)
  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Delete profile row (in case no cascade)
  await db.from('profiles').delete().eq('id', id)

  getUserInfo(auth.userId).then(u =>
    logActivity({ userId: auth.userId, userEmail: u.email, userName: u.name, action: 'delete_user', details: { deletedUserId: id, deletedUserEmail: deletedUserInfo.email } })
  )

  return NextResponse.json({ success: true })
}
