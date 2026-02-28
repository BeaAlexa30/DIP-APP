/**
 * POST /api/assessments/submit-ai-response
 * ─────────────────────────────────────────────────────────────
 * Stores responses for AI-generated surveys.
 * Because AI questions are not rows in framework_questions, we
 * store all answers as JSONB in responses.respondent_meta so we
 * avoid the FK constraint on response_answers.question_id.
 * No login is required — open to anonymous respondents.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'

interface AiAnswer {
  questionId: string
  questionPrompt: string
  valueKey?: string
  freeText?: string
}

export async function POST(req: NextRequest) {
  try {
    const { surveyId, tokenId, answers, respondentMeta } = await req.json()

    if (!surveyId || !tokenId || !answers) {
      return NextResponse.json(
        { error: 'surveyId, tokenId, and answers are required' },
        { status: 400 },
      )
    }

    const supabase = await createServiceClient()

    // Validate token
    const { data: token, error: tokenErr } = await supabase
      .from('survey_tokens')
      .select('id, survey_id, response_count')
      .eq('id', tokenId)
      .eq('survey_id', surveyId)
      .single()

    if (tokenErr || !token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    // Store all AI answers inside respondent_meta JSONB (bypasses response_answers FK)
    const fullMeta = {
      ...(respondentMeta ?? {}),
      ai_survey_answers: answers as AiAnswer[],
    }

    const { data: response, error: respErr } = await supabase
      .from('responses')
      .insert({
        survey_id: surveyId,
        token_id: tokenId,
        respondent_meta: fullMeta as any,
      })
      .select('id')
      .single()

    if (respErr || !response) {
      return NextResponse.json(
        { error: respErr?.message ?? 'Failed to create response' },
        { status: 500 },
      )
    }

    // Increment response_count on token
    await supabase
      .from('survey_tokens')
      .update({ response_count: (token.response_count ?? 0) + 1 })
      .eq('id', tokenId)

    return NextResponse.json({ ok: true, responseId: response.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
