import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/ServerSideDbConnector'
import { getCurrentProfile } from '@/lib/auth/UserProfileRetriever'
import { can } from '@/lib/auth/UserPermissionDefinitions'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const profile = await getCurrentProfile()
  if (!can(profile?.role, 'manageFramework')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload — `active` must be boolean' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('framework_packs')
    .update({ active: body.active })
    .eq('id', id)
    .select('id, name, version, active')
    .single()

  if (error) {
    console.error('[Framework PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data })
}
