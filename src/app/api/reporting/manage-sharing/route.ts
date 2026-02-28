import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'
import { randomBytes } from 'crypto'
import { logActivity, getUserInfo } from '@/lib/activity/ActivityLogger'

/**
 * POST /api/reports/share
 * Generate a shareable report link
 */
export async function POST(req: NextRequest) {
  const authResult = await requirePermission('shareReport')
  if (!authResult.ok) return authResult.response
  
  const body = await req.json()
  const { projectId, scoreRunId, expiresInDays } = body

  if (!projectId || !scoreRunId) {
    return Response.json({ error: 'Missing projectId or scoreRunId' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()

  // Verify the score run exists and belongs to the project
  const { data: scoreRun, error: scoreRunError } = await serviceClient
    .from('score_runs')
    .select('id, survey_id, surveys(project_id)')
    .eq('id', scoreRunId)
    .single()

  if (scoreRunError || !scoreRun) {
    return Response.json({ error: 'Score run not found' }, { status: 404 })
  }

  const actualProjectId = (scoreRun as any).surveys?.project_id
  if (actualProjectId !== projectId) {
    return Response.json({ error: 'Score run does not belong to this project' }, { status: 400 })
  }

  // Generate a secure random token
  const token = randomBytes(32).toString('base64url')

  // Calculate expiration
  let expiresAt: Date | null = null
  if (expiresInDays && expiresInDays > 0) {
    expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)
  }

  // Create report share
  const { data: share, error: shareError } = await serviceClient
    .from('report_shares')
    .insert({
      project_id: projectId,
      score_run_id: scoreRunId,
      token,
      created_by: authResult.userId,
      expires_at: expiresAt?.toISOString() ?? null,
      is_active: true,
    } as any)
    .select()
    .single()

  if (shareError || !share) {
    console.error('Failed to create report share:', shareError)
    return Response.json({ error: 'Failed to create shareable link' }, { status: 500 })
  }

  // Generate the shareable URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const shareUrl = `${baseUrl}/share/report/${token}`

  getUserInfo(authResult.userId).then(u =>
    logActivity({ userId: authResult.userId, userEmail: u.email, userName: u.name, action: 'share_report', details: { projectId, scoreRunId, shareUrl } })
  )

  return Response.json({
    success: true,
    share: {
      id: (share as any).id,
      token: (share as any).token,
      url: shareUrl,
      expiresAt: (share as any).expires_at,
      createdAt: (share as any).created_at,
    },
  })
}

/**
 * GET /api/reports/share?projectId=xxx
 * List all shareable links for a project
 */
export async function GET(req: NextRequest) {
  await requirePermission('viewReports')
  
  const searchParams = req.nextUrl.searchParams
  const projectId = searchParams.get('projectId')
  const scoreRunId = searchParams.get('scoreRunId')

  if (!projectId) {
    return Response.json({ error: 'Missing projectId' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()

  let query = serviceClient
    .from('report_shares')
    .select('*, score_runs(executed_at, response_count)')
    .eq('project_id', projectId)

  if (scoreRunId) {
    query = query.eq('score_run_id', scoreRunId)
  }

  const { data: shares, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch report shares:', error)
    return Response.json({ error: 'Failed to fetch shareable links' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const sharesWithUrls = (shares ?? []).map((share: any) => ({
    id: share.id,
    token: share.token,
    url: `${baseUrl}/share/report/${share.token}`,
    expiresAt: share.expires_at,
    createdAt: share.created_at,
    viewCount: share.view_count,
    isActive: share.is_active,
  }))

  return Response.json({ shares: sharesWithUrls })
}

/**
 * DELETE /api/reports/share?id=xxx
 * Deactivate a shareable link
 */
export async function DELETE(req: NextRequest) {
  const deleteAuth = await requirePermission('shareReport')
  if (!deleteAuth.ok) return deleteAuth.response
  
  const searchParams = req.nextUrl.searchParams
  const id = searchParams.get('id')

  if (!id) {
    return Response.json({ error: 'Missing share id' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()

  const { error } = await (serviceClient as any)
    .from('report_shares')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('Failed to deactivate report share:', error)
    return Response.json({ error: 'Failed to deactivate link' }, { status: 500 })
  }

  getUserInfo(deleteAuth.userId).then(u =>
    logActivity({ userId: deleteAuth.userId, userEmail: u.email, userName: u.name, action: 'deactivate_share', details: { shareId: id } })
  )

  return Response.json({ success: true })
}
