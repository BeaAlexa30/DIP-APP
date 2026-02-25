import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { tokenId } = await req.json()
    if (!tokenId) return NextResponse.json({ error: 'tokenId required' }, { status: 400 })

    const supabase = await createServiceClient()

    // Fetch current count then increment
    const { data: token, error: fetchErr } = await supabase
      .from('survey_tokens')
      .select('response_count')
      .eq('id', tokenId)
      .single()

    if (fetchErr || !token) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 })
    }

    const { error: updateErr } = await supabase
      .from('survey_tokens')
      .update({ response_count: (token.response_count ?? 0) + 1 })
      .eq('id', tokenId)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
