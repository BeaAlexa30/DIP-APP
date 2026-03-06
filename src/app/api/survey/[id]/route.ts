import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'

/**
 * DELETE /api/survey/[id]
 * Delete a survey (and its tokens/responses via cascade) — admin only.
 * Only custom surveys (pack_id IS NULL) can be deleted through this endpoint.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission('manageFramework')
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Missing survey id' }, { status: 400 })

  const supabase = await createServiceClient()

  // Safety: only allow deleting custom surveys (pack_id IS NULL)
  const { data: survey, error: fetchErr } = await supabase
    .from('surveys')
    .select('id, pack_id')
    .eq('id', id)
    .single()

  if (fetchErr || !survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }

  if (survey.pack_id !== null) {
    return NextResponse.json(
      { error: 'Only custom surveys can be deleted from here. Use the project page to manage framework-backed surveys.' },
      { status: 403 }
    )
  }

  const { error: deleteErr } = await supabase
    .from('surveys')
    .delete()
    .eq('id', id)

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
