import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { getCurrentProfile } from '@/lib/auth/UserProfileRetriever'
import { can } from '@/lib/auth/UserPermissionDefinitions'
import { logActivity } from '@/lib/activity/ActivityLogger'

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

  const authClient2 = await createClient()
  const { data: { user: patchUser } } = await authClient2.auth.getUser()
  if (patchUser) {
    logActivity({
      userId: patchUser.id,
      userEmail: profile?.email ?? patchUser.email ?? '',
      userName: profile?.full_name ?? null,
      action: 'toggle_framework',
      details: { packId: id, packName: data?.name ?? '', active: body.active },
    })
  }

  return NextResponse.json({ ok: true, data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const profile = await getCurrentProfile()
  if (!can(profile?.role, 'manageFramework')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Resolve the user ID for activity logging
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()

  // Use service client to bypass RLS for cascading deletes
  const supabase = await createServiceClient()

  // Capture pack name before deleting for the log
  const { data: packMeta } = await supabase
    .from('framework_packs')
    .select('name, version')
    .eq('id', id)
    .single()

  // surveys.pack_id has ON DELETE RESTRICT, so we must delete surveys first.
  // Deleting a survey cascades to: survey_tokens, responses, response_answers,
  // score_runs, score_results, index_results, executive_results, issue_rankings, ai_insights.
  const { data: surveys, error: surveyFetchErr } = await supabase
    .from('surveys')
    .select('id')
    .eq('pack_id', id)

  if (surveyFetchErr) {
    return NextResponse.json({ error: surveyFetchErr.message }, { status: 500 })
  }

  if (surveys && surveys.length > 0) {
    const surveyIds = surveys.map((s) => s.id)
    const { error: surveyDelErr } = await supabase
      .from('surveys')
      .delete()
      .in('id', surveyIds)

    if (surveyDelErr) {
      return NextResponse.json({ error: `Failed to delete linked surveys: ${surveyDelErr.message}` }, { status: 500 })
    }
  }

  // Now delete the pack itself
  const { error: packDelErr } = await supabase
    .from('framework_packs')
    .delete()
    .eq('id', id)

  if (packDelErr) {
    return NextResponse.json({ error: packDelErr.message }, { status: 500 })
  }

  if (user) {
    logActivity({
      userId: user.id,
      userEmail: profile?.email ?? user.email ?? '',
      userName: profile?.full_name ?? null,
      action: 'delete_framework',
      details: { packId: id, packName: packMeta?.name ?? '', packVersion: packMeta?.version ?? '' },
    })
  }

  return NextResponse.json({ ok: true })
}
