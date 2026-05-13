import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'

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

    // When archiving a project, close all its surveys
    if (newStatus === 'archived' && oldStatus !== 'archived') {
      const { error: surveyError } = await supabase
        .from('surveys')
        .update({ 
          status: 'closed', 
          updated_at: new Date().toISOString() 
        })
        .eq('project_id', id)
        .in('status', ['draft', 'published']) // Only close non-closed surveys

      if (surveyError) {
        console.error('Failed to close surveys:', surveyError)
        // Don't fail the whole request, just log the error
      }
    }

    // When unarchiving a project, reopen its closed surveys
    if (newStatus !== 'archived' && oldStatus === 'archived') {
      const { error: surveyError } = await supabase
        .from('surveys')
        .update({ 
          status: 'published', 
          updated_at: new Date().toISOString() 
        })
        .eq('project_id', id)
        .eq('status', 'closed') // Only reopen closed surveys

      if (surveyError) {
        console.error('Failed to reopen surveys:', surveyError)
        // Don't fail the whole request, just log the error
      }
    }
  }

  return NextResponse.json({ project: data })
}
