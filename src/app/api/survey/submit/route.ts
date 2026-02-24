import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

interface AnswerRow {
  questionId: string
  valueKey: string
}

export async function POST(req: NextRequest) {
  try {
    const { surveyId, tokenId, answers, respondentMeta } = await req.json()

    if (!surveyId || !tokenId || !answers) {
      return NextResponse.json({ error: 'surveyId, tokenId, and answers are required' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Validate token belongs to survey
    const { data: token, error: tokenErr } = await supabase
      .from('survey_tokens')
      .select('id, survey_id, response_count')
      .eq('id', tokenId)
      .eq('survey_id', surveyId)
      .single() as { data: any; error: any }

    if (tokenErr || !token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Create response
    const { data: response, error: respErr } = await supabase
      .from('responses')
      .insert({
        survey_id: surveyId,
        token_id: tokenId,
        respondent_meta: respondentMeta ?? null,
      } as any)
      .select('id')
      .single() as { data: any; error: any }

    if (respErr || !response) {
      return NextResponse.json({ error: respErr?.message ?? 'Failed to create response' }, { status: 500 })
    }

    // Insert answers
    const answerRows = (answers as AnswerRow[]).map(a => ({
      response_id: response.id,
      question_id: a.questionId,
      option_value_key: a.valueKey,
    }))

    if (answerRows.length > 0) {
      const { error: ansErr } = await (supabase.from('response_answers') as any).insert(answerRows)
      if (ansErr) {
        return NextResponse.json({ error: ansErr.message }, { status: 500 })
      }
    }

    // Increment token response count
    await (supabase.from('survey_tokens') as any)
      .update({ response_count: (token.response_count ?? 0) + 1 })
      .eq('id', tokenId)

    return NextResponse.json({ ok: true, responseId: response.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
