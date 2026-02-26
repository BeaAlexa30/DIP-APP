import { notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import type { Database } from '@/types/DatabaseSchemaDefinitions'
import type { Metadata } from 'next'
import Link from 'next/link'
import IndexScoreCard from '@/components/dashboard/MetricsOverviewCard'
import IssueRankingTable from '@/components/dashboard/PriorityIssuesDisplay'
import CategoryChart from '@/components/dashboard/AnalyticsCategoryVisualizer'
import GenerateInsightsButton from '@/components/dashboard/AIInsightGenerator'
import ScoreRunHistory from '@/components/dashboard/ExecutionHistoryTracker'
import DateRangeFilter from '@/components/dashboard/TimeperiodSelector'
import FrameworkSelector from '@/components/dashboard/AssessmentFrameworkPicker'

export const metadata: Metadata = {
  title: "Decision Dashboard - Decision Intelligence Platform",
  description: "View analytics and insights from your survey results",
  openGraph: {
    title: "Decision Dashboard - Decision Intelligence Platform",
    description: "View analytics and insights from your survey results",
    images: ['/images/PlatformBrandingLogo.png'],
  },
}

type ScoreResultWithCategory = Database['public']['Tables']['score_results']['Row'] & {
  framework_categories: { name: string } | null
}

export default async function ProjectDashboard({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>
  searchParams: Promise<{ surveyId?: string; runId?: string; startDate?: string; endDate?: string }>
}) {
  const { id } = await params
  const { surveyId, runId, startDate, endDate } = await searchParams
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const { data: project } = await serviceClient
    .from('projects')
    .select('id, client_name, industry')
    .eq('id', id)
    .single()

  if (!project) notFound()

  // Get survey - either by surveyId param or latest survey for the project
  let survey
  if (surveyId) {
    const { data } = await serviceClient
      .from('surveys')
      .select('id, pack_version_snapshot, pack_id')
      .eq('id', surveyId)
      .eq('project_id', id) // Ensure survey belongs to this project
      .single()
    survey = data
  } else {
    const { data } = await serviceClient
      .from('surveys')
      .select('id, pack_version_snapshot, pack_id')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    survey = data
  }

  if (!survey) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No survey found for this project.</p>
        <Link href={`/app/projects/${id}`} className="text-blue-600 hover:underline text-sm mt-2 inline-block">
          ← Back to project
        </Link>
      </div>
    )
  }

  // Get all surveys for framework selector
  const { data: allSurveys } = await serviceClient
    .from('surveys')
    .select('id, pack_id, pack_version_snapshot')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  // Fetch all score runs for history
  const { data: allScoreRuns } = await serviceClient
    .from('score_runs')
    .select('id, executed_at, checksum, response_count, framework_version')
    .eq('survey_id', survey.id)
    .order('executed_at', { ascending: false })

  let scoreRuns = allScoreRuns ?? []

  // Apply date range filter if provided
  if (startDate || endDate) {
    scoreRuns = scoreRuns.filter(run => {
      const runDate = new Date(run.executed_at)
      if (startDate && runDate < new Date(startDate)) return false
      if (endDate && runDate > new Date(endDate + 'T23:59:59')) return false
      return true
    })
  }

  // Determine which score run to display
  const scoreRun = runId 
    ? scoreRuns.find(r => r.id === runId) ?? scoreRuns[0]
    : scoreRuns[0]

  if (!scoreRun) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-base">No score run yet.</p>
        <p className="text-sm mt-1">Collect responses and run the scoring engine first.</p>
        <Link href={`/app/projects/${id}`} className="text-blue-600 hover:underline text-sm mt-3 inline-block">
          ← Back to project
        </Link>
      </div>
    )
  }

  const scoreRunId = scoreRun.id

  // Fetch live response count directly — sourceOfTruth
  const liveCount = ((await serviceClient
    .from('responses')
    .select('id', { count: 'exact', head: true })
    .eq('survey_id', survey.id)
  ).count ?? 0)

  const [execRes, indexRes, catRes, issueRes, aiRes] =
    await Promise.all([
      serviceClient.from('executive_results').select('*').eq('score_run_id', scoreRunId).single(),
      serviceClient.from('index_results').select('*').eq('score_run_id', scoreRunId),
      serviceClient.from('score_results').select('*, framework_categories(name)').eq('score_run_id', scoreRunId),
      serviceClient.from('issue_rankings').select('*').eq('score_run_id', scoreRunId).order('priority_score', { ascending: false }),
      serviceClient.from('ai_insights').select('*').eq('score_run_id', scoreRunId).order('created_at', { ascending: false }).limit(1).single(),
    ])
  const execResult = execRes.data
  const indexResults = indexRes.data ?? []
  const categoryResults = (catRes.data ?? []) as unknown as ScoreResultWithCategory[]
  const issueRankings = issueRes.data ?? []

  // Prepare score runs with health scores for history
  const scoreRunsWithHealth = await Promise.all(
    scoreRuns.map(async (run) => {
      const { data: exec } = await serviceClient
        .from('executive_results')
        .select('health_score_0_100')
        .eq('score_run_id', run.id)
        .single()
      return {
        id: run.id,
        executed_at: run.executed_at,
        response_count: run.response_count,
        checksum: run.checksum,
        health_score: exec?.health_score_0_100 ?? 0,
      }
    })
  )
  const aiInsights = aiRes.data

  const healthScore = execResult?.health_score_0_100 ?? 0
  const healthColor = healthScore >= 75 ? 'text-green-600' : healthScore >= 50 ? 'text-yellow-500' : 'text-red-600'
  const healthBg = healthScore >= 75 ? 'bg-green-50 border-green-200' : healthScore >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
  const healthLabel = healthScore >= 75 ? 'Healthy' : healthScore >= 50 ? 'Needs Attention' : 'At Risk'

  return (
    <div className="p-4 md:p-8">
      {/* Header: Vertical on mobile, Horizontal on desktop */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href={`/app/projects/${id}`} className="hover:text-gray-600">← {project.client_name}</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Decision Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {(survey.pack_version_snapshot as any)?.packName ?? 'Framework'} v{scoreRun.framework_version} · {liveCount} response{liveCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <DateRangeFilter projectId={id} />
          {scoreRunsWithHealth.length > 1 && (
            <ScoreRunHistory 
              scoreRuns={scoreRunsWithHealth} 
              currentRunId={scoreRun.id}
              projectId={id}
              surveyId={survey.id}
            />
          )}
          <Link
            href={`/reports/${id}?surveyId=${survey.id}`}
            className="w-full sm:w-auto text-center bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Export Report →
          </Link>
        </div>
      </div>

      {/* Framework Selector */}
      {allSurveys && allSurveys.length > 1 && (
        <FrameworkSelector
          surveys={allSurveys.map(s => ({
            id: s.id,
            pack_id: s.pack_id,
            pack_version_snapshot: s.pack_version_snapshot as any
          }))}
          currentSurveyId={survey.id}
          projectId={id}
        />
      )}

      {/* Warning: no live responses — stale score run */}
      {liveCount === 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">⚠ No responses found in the database</p>
          <p className="text-amber-700 text-xs leading-relaxed">
            Previous survey submissions may not have been saved (a bug was recently fixed).
            Please open the survey link again, complete all 21 questions, and click Submit.
            Once at least 1 response is recorded, go back to the project page, click <strong>Run Scoring</strong>, then return here.
          </p>
          <Link href={`/app/projects/${id}`} className="mt-2 inline-block text-xs font-medium text-amber-900 underline">
            ← Back to project page
          </Link>
        </div>
      )}

      {/* Executive Health Score */}
      <div className={`rounded-xl border p-6 mb-6 ${healthBg}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Executive Health Score</p>
            <p className="text-xs text-gray-400 mt-0.5">Trust×25% + Usability×25% + (100−ConvRisk)×20% + Experience×20% + Loyalty×10%</p>
            <p className="text-xs text-gray-400 mt-0.5">Conv. Risk is inverted — a score of 100 means high risk and contributes 0 to health</p>
          </div>
          <div className="text-right">
            <p className={`text-5xl font-bold ${healthColor}`}>{healthScore.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">{healthLabel}</p>
          </div>
        </div>
        <div className="mt-4 bg-white/60 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${healthScore >= 75 ? 'bg-green-500' : healthScore >= 50 ? 'bg-yellow-400' : 'bg-red-500'}`}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>

     {/* Index Score Cards: 1 col on mobile, 2 on small, 5 on xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        {(indexResults ?? []).map(idx => (
          <IndexScoreCard
            key={idx.index_key}
            indexKey={idx.index_key}
            score={idx.score_0_100}
            higherIsBetter={idx.higher_is_better}
          />
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Issue Rankings */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Ranked Issues</h2>
            <p className="text-xs text-gray-400 mt-0.5">Priority = 0.4×Risk + 0.4×Friction + 0.2×Frequency</p>
          </div>
          <IssueRankingTable issues={issueRankings ?? []} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Category Breakdown</h2>
          </div>
          <div className="p-4 md:p-6">
            <CategoryChart
              categories={(categoryResults ?? []).map(r => ({
                name: r.framework_categories?.name ?? r.category_id,
                score: r.normalized_score,
              }))}
            />
          </div>
        </div>
      </div>

      {/* AI Insights — clearly labeled non-scoring */}
      {aiInsights ? (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-purple-600 font-semibold text-sm">
                {(aiInsights.model_metadata as { model?: string })?.model === 'deterministic-fallback' ? 'Rule-Based Summary' : 'AI Summary'}
              </span>
              <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-medium">Non-Scoring</span>
              {(aiInsights.model_metadata as { model?: string })?.model === 'deterministic-fallback' && (
                <span className="text-xs bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
                  ⚠ AI quota exhausted — auto-generated from scores
                </span>
              )}
            </div>
            <GenerateInsightsButton scoreRunId={scoreRunId} />
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">{aiInsights.summary_text}</p>
          {aiInsights.themes_json && Array.isArray(aiInsights.themes_json) && (
            <div>
              <p className="text-xs font-medium text-purple-600 mb-2">Key Themes</p>
              <div className="flex flex-wrap gap-2">
                {(aiInsights.themes_json as string[]).map((theme, i) => (
                  <span key={i} className="text-xs bg-white border border-purple-200 text-purple-700 px-3 py-1 rounded-full">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-purple-700">AI Summary</p>
              <p className="text-xs text-purple-500 mt-0.5">No insights generated yet for this score run.</p>
            </div>
            <GenerateInsightsButton scoreRunId={scoreRunId} />
          </div>
        </div>
      )}

      {/* Audit Trail */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-400">
        <p className="font-medium text-gray-500 mb-1">Audit Trail</p>
        <p>Score Run ID: <span className="font-mono">{scoreRun.id}</span></p>
        <p>Checksum (SHA-256): <span className="font-mono">{scoreRun.checksum}</span></p>
        <p>Framework Version: {scoreRun.framework_version} · Executed: {new Date(scoreRun.executed_at).toISOString()}</p>
      </div>
    </div>
  )
}
