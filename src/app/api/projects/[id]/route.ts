import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'
import { logActivity, getUserInfo } from '@/lib/activity/ActivityLogger'

/**
 * PUT /api/projects/[id]
 * Update project fields (full edit or status-only archive/reopen).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('editProject')
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing project id' }, { status: 400 })

  const body = await req.json()

  // Allowlist updatable fields
  const allowed = [
    'client_name',
    'industry',
    'goal',
    'stage',
    'channels',
    'target_audience',
    'status',
  ] as const

  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  updates.updated_at = new Date().toISOString()

  const supabase = await createServiceClient()

  // Get current project status before updating
  const { data: currentProject } = await supabase
    .from('projects')
    .select('status')
    .eq('id', id)
    .single()

  const { data, error } = await supabase
    .from('projects')
    .update(updates as any)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Failed to update project:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Handle survey status changes when project is archived/unarchived
  if (updates.status && currentProject) {
    const oldStatus = currentProject.status
    const newStatus = updates.status
    const now = new Date().toISOString()

    // ── Archiving: close ALL open surveys ───────────────────────
    if (newStatus === 'archived' && oldStatus !== 'archived') {
      // Step 1 — Collect surveys that are currently open so we can
      //          save their individual statuses for proper restore later.
      const { data: openSurveys } = await supabase
        .from('surveys')
        .select('id, status')
        .eq('project_id', id)
        .in('status', ['draft', 'published'])

      if (openSurveys && openSurveys.length > 0) {
        // Step 2 — Close every open survey (status update only, no extra columns).
        const { error: closeErr } = await supabase
          .from('surveys')
          .update({ status: 'closed', updated_at: now })
          .eq('project_id', id)
          .in('status', ['draft', 'published'])

        if (closeErr) {
          console.error('[archive] failed to close surveys:', closeErr)
        } else {
          console.log(`[archive] closed ${openSurveys.length} survey(s) for project ${id}`)
        }

        // Step 3 — Optionally record pre-archive status per survey.
        //          This uses the migration-added column; skip silently if column
        //          does not exist yet (try/catch per row approach via rpc or
        //          a single bulk update per original status value).
        for (const s of openSurveys) {
          await supabase
            .from('surveys')
            .update({ pre_archive_status: s.status, updated_at: now } as any)
            .eq('id', s.id)
          // Ignore errors — column may not exist if migration is pending
        }
      }
    }

    // ── Un-archiving: reopen surveys that were open before archive ──
    if (newStatus !== 'archived' && oldStatus === 'archived') {
      // First try to restore using saved pre_archive_status (migration applied)
      const { data: savedSurveys, error: fetchErr } = await supabase
        .from('surveys')
        .select('id, pre_archive_status' as any)
        .eq('project_id', id)
        .not('pre_archive_status' as any, 'is', null)

      if (!fetchErr && savedSurveys && savedSurveys.length > 0) {
        // Restore each survey to its exact pre-archive status
        for (const s of savedSurveys as any[]) {
          const { error: restoreErr } = await supabase
            .from('surveys')
            .update({ status: s.pre_archive_status, pre_archive_status: null, updated_at: now } as any)
            .eq('id', s.id)
          if (restoreErr) console.error(`[unarchive] failed to restore survey ${s.id}:`, restoreErr)
        }
        console.log(`[unarchive] restored ${savedSurveys.length} survey(s) for project ${id}`)
      } else {
        // Fallback (migration not applied): reopen ALL closed surveys as 'published'
        const { error: reopenErr } = await supabase
          .from('surveys')
          .update({ status: 'published', updated_at: now })
          .eq('project_id', id)
          .eq('status', 'closed')
        if (reopenErr) console.error('[unarchive] fallback reopen failed:', reopenErr)
        else console.log(`[unarchive] fallback: reopened all closed surveys for project ${id}`)
      }
    }
  }

  const isArchiveAction = updates.status === 'archived'
  const logAction = isArchiveAction ? 'archive_project' : 'edit_project'
  getUserInfo(auth.userId).then(u =>
    logActivity({
      userId: auth.userId,
      userEmail: u.email,
      userName: u.name,
      action: logAction,
      details: {
        projectId: id,
        clientName: (data as any)?.client_name ?? '',
        ...(updates.status ? { status: String(updates.status) } : {}),
      },
    })
  )

  return NextResponse.json({ project: data })
}

/**
 * DELETE /api/projects/[id]
 * Permanently deletes a project and all its child data (surveys, assessments, etc.)
 * Admin only.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('deleteProject')
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing project id' }, { status: 400 })

  const supabase = await createServiceClient()

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Failed to delete project:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  getUserInfo(auth.userId).then(u =>
    logActivity({ userId: auth.userId, userEmail: u.email, userName: u.name, action: 'delete_project', details: { projectId: id } })
  )

  return NextResponse.json({ success: true })
}
