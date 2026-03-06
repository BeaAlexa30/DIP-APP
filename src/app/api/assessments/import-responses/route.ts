import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'

export async function POST(req: NextRequest) {
  const auth = await requirePermission('editProject')
  if (!auth.ok) return auth.response

  try {
    const { surveyId, rows } = await req.json() as {
      surveyId: string
      rows: Array<Record<string, string>>
    }

    if (!surveyId || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'surveyId and rows are required' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Validate survey exists
    const { data: survey, error: surveyErr } = await supabase
      .from('surveys')
      .select('id')
      .eq('id', surveyId)
      .single()

    if (surveyErr || !survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
    }

    const importedAt = new Date().toISOString()
    let importedCount = 0

    for (const row of rows) {
      // Skip completely empty rows
      const values = Object.values(row)
      if (values.every(v => !v?.trim())) continue

      // Build ai_survey_answers from the row — one entry per column
      const ai_survey_answers = Object.entries(row)
        .filter(([prompt]) => prompt.trim() !== '')
        .map(([prompt, value], i) => ({
          questionId: `import-col-${i}`,
          questionPrompt: prompt,
          valueKey: null as null,
          freeText: value?.trim() || null,
        }))

      const { error: respErr } = await supabase
        .from('responses')
        .insert({
          survey_id: surveyId,
          token_id: null,
          respondent_meta: {
            importedAt,
            importedFrom: 'csv',
            ai_survey_answers,
          },
        })

      if (!respErr) importedCount++
    }

    return NextResponse.json({ ok: true, count: importedCount })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
