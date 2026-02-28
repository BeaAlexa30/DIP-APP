import { NextRequest, NextResponse } from 'next/server'
import { runScoringPipeline } from '@/lib/scoring/AssessmentScoringEngine'
import { requirePermission } from '@/lib/auth/AccessControlGuard'
import { logActivity, getUserInfo } from '@/lib/activity/ActivityLogger'

export async function POST(req: NextRequest) {
  const auth = await requirePermission('runScoring')
  if (!auth.ok) return auth.response

  const { surveyId, frameworkVersion } = await req.json()

  if (!surveyId || !frameworkVersion) {
    return NextResponse.json({ error: 'surveyId and frameworkVersion are required.' }, { status: 400 })
  }

  try {
    const result = await runScoringPipeline({ surveyId, frameworkVersion })

    // Auto-generate AI insights after successful scoring
    try {
      const insightsRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/intelligence/create-analysis`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': req.headers.get('cookie') || '' // Forward auth cookies
        },
        body: JSON.stringify({ scoreRunId: result.scoreRunId }),
      })
      
      if (!insightsRes.ok) {
        console.warn('Auto-insight generation failed:', await insightsRes.text())
      }
    } catch (insightErr) {
      console.warn('Auto-insight generation error:', insightErr)
      // Don't fail the whole scoring run if insights fail
    }

    getUserInfo(auth.userId).then(u =>
      logActivity({ userId: auth.userId, userEmail: u.email, userName: u.name, action: 'run_scoring', details: { surveyId, scoreRunId: result.scoreRunId, healthScore: result.healthScore } })
    )

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
