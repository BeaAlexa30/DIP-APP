import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runScoringPipeline } from '@/lib/scoring/engine'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { surveyId, frameworkVersion } = await req.json()

  if (!surveyId || !frameworkVersion) {
    return NextResponse.json({ error: 'surveyId and frameworkVersion are required.' }, { status: 400 })
  }

  try {
    const result = await runScoringPipeline({ surveyId, frameworkVersion })

    return NextResponse.json({
      scoreRunId: result.scoreRunId,
      checksum: result.checksum,
      responseCount: result.responseCount,
      healthScore: result.healthScore,
      indexScores: result.indexScores,
      categoryScores: result.categoryScores,
      issueRankings: result.issueRankings,
      executedAt: result.executedAt,
    })
  } catch (err: any) {
    console.error('Scoring error:', err)
    return NextResponse.json({ error: err.message ?? 'Scoring failed.' }, { status: 500 })
  }
}
