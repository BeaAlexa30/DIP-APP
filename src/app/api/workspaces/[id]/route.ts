import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'

/**
 * GET /api/workspaces/[id]
 * Fetch org details.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('viewDashboard')
  if (!auth.ok) return auth.response

  const { id } = await params
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('orgs')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  return NextResponse.json({ workspace: data })
}

/**
 * PATCH /api/workspaces/[id]
 * Update org name.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('editProject')
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = await req.json()
  const { name } = body

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('orgs')
    .update({ name: name.trim() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Failed to update workspace:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ workspace: data })
}
