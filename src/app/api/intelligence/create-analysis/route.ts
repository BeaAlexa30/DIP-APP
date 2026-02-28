import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import type { Database } from '@/types/DatabaseSchemaDefinitions'
import { generateAIInsights, generateFallbackInsights } from '@/lib/ai/IntelligenceAnalyticsProcessor'
import type { ScoringResult } from '@/lib/scoring/AssessmentScoringEngine'
import { requirePermission } from '@/lib/auth/AccessControlGuard'

type ScoreResultWithCategory = Database['public']['Tables']['score_results']['Row'] & {
  ai_category_name: string | null
  framework_categories: { name: string } | null
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('generateInsights')
  if (!auth.ok) return auth.response

  const { scoreRunId } = await req.json()
  if (!scoreRunId) return NextResponse.json({ error: 'scoreRunId required' }, { status: 400 })

  // All DB reads + writes use service client to bypass RLS
  const db = await createServiceClient()

  // Load scoring result from DB
  const [runRes, catsRes, idxRes, execRes, issueRes] = await Promise.all([
    db.from('score_runs').select('*').eq('id', scoreRunId).single(),
    db.from('score_results').select('*, framework_categories(name)').eq('score_run_id', scoreRunId),
    db.from('index_results').select('*').eq('score_run_id', scoreRunId),
    db.from('executive_results').select('*').eq('score_run_id', scoreRunId).single(),
    db.from('issue_rankings').select('*').eq('score_run_id', scoreRunId).order('priority_score', { ascending: false }),
  ])

  if (!runRes.data) return NextResponse.json({ error: 'Score run not found' }, { status: 404 })

  const scoring: ScoringResult = {
    scoreRunId,
    surveyId: runRes.data.survey_id,
    frameworkVersion: runRes.data.framework_version,
    checksum: runRes.data.checksum,
    responseCount: runRes.data.response_count,
    executedAt: new Date(runRes.data.executed_at),
    categoryScores: ((catsRes.data ?? []) as unknown as ScoreResultWithCategory[]).map(r => ({
      categoryId: r.category_id,
      categoryName: r.ai_category_name ?? r.framework_categories?.name ?? r.category_id ?? '',
      rawScore: r.raw_score,
      minPossible: r.min_possible,
      maxPossible: r.max_possible,
      normalizedScore: r.normalized_score,
    })),
    indexScores: (idxRes.data ?? []).map(r => ({
      indexKey: r.index_key,
      score0100: r.score_0_100,
      higherIsBetter: r.higher_is_better,
      label: r.index_key,
    })),
    healthScore: execRes.data?.health_score_0_100 ?? 0,
    issueRankings: (issueRes.data ?? []).map(r => ({
      driverTag: r.driver_tag,
      risk: r.risk,
      friction: r.friction,
      frequency: r.frequency,
      priorityScore: r.priority_score,
      description: r.description ?? '',
    })),
  }

  try {
    const insights = await generateAIInsights(scoring)

    // Persist via service client (bypasses RLS)
    const { error: insertErr } = await db.from('ai_insights').insert({
      score_run_id: scoreRunId,
      summary_text: insights.summaryText,
      themes_json: insights.themes,
      model_metadata: {
        ...insights.modelMetadata,
        fullAnalysis: {
          descriptive: insights.descriptive,
          diagnostic: insights.diagnostic,
          predictive: insights.predictive,
          prescriptive: insights.prescriptive,
          kpi: insights.kpi,
        },
      } as any,
    })

    if (insertErr) {
      console.error('[insights] insert error:', insertErr)
      return NextResponse.json({ error: `Failed to save insights: ${insertErr.message}` }, { status: 500 })
    }

    return NextResponse.json(insights)
  } catch (err: any) {
    console.error('[insights] generation error:', err)
    // Groq-specific errors — fall back to deterministic analysis
    console.warn('[insights] falling back to deterministic analysis:', err.message)
    try {
      const fallback = generateFallbackInsights(scoring)
      const { error: insertErr } = await db.from('ai_insights').insert({
        score_run_id: scoreRunId,
        summary_text: fallback.summaryText,
        themes_json: fallback.themes,
        model_metadata: {
          ...fallback.modelMetadata,
          fullAnalysis: {
            descriptive: fallback.descriptive,
            diagnostic: fallback.diagnostic,
            predictive: fallback.predictive,
            prescriptive: fallback.prescriptive,
            kpi: fallback.kpi,
          },
        } as any,
      })
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
      return NextResponse.json(fallback)
    } catch (fbErr: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  }
}
