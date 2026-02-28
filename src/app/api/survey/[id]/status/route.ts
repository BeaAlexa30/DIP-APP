import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'
import { logActivity, getUserInfo } from '@/lib/activity/ActivityLogger'

/**
 * PATCH /api/survey/[id]/status
 * Toggle survey status between 'published' and 'closed'.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('manageSurvey')
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing survey id' }, { status: 400 })

  const body = await req.json()
  const { status } = body

  if (!status || !['draft', 'published', 'closed'].includes(status)) {
    return NextResponse.json(
      { error: 'Invalid status. Must be draft, published, or closed.' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('surveys')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, status')
    .single()

  if (error) {
    console.error('Failed to update survey status:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  getUserInfo(auth.userId).then(u =>
    logActivity({ userId: auth.userId, userEmail: u.email, userName: u.name, action: 'survey_status_change', details: { surveyId: id, status } })
  )

  return NextResponse.json({ survey: data })
}
