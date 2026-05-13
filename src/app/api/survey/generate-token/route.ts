import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'

export async function POST(req: NextRequest) {
  const auth = await requirePermission('assignFramework')
  if (!auth.ok) return auth.response

  try {
    const { surveyId } = await req.json()
    if (!surveyId) return NextResponse.json({ error: 'surveyId required' }, { status: 400 })

    const supabase = await createServiceClient()

    // Check if token already exists
    const { data: existing } = await supabase
      .from('survey_tokens')
      .select('id, token')
      .eq('survey_id', surveyId)
      .limit(1)
      .single()

    if (existing) {
      return NextResponse.json({ token: existing.token })
    }

    // Generate new token
    const bytes = new Uint8Array(24)
    globalThis.crypto.getRandomValues(bytes)
    const token = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

    const { data, error } = await supabase
      .from('survey_tokens')
      .insert({ survey_id: surveyId, token, max_responses: null, expires_at: null })
      .select('token')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ token: data.token })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
