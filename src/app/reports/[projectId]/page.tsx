import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import type { Database } from '@/types/DatabaseSchemaDefinitions'
import ReportExportButton from '@/components/reports/ReportDownloadController'
import ShareReportButton from '@/components/reports/ReportSharingManager'
import AIInsightsPanel from '@/components/dashboard/AIInsightsPanel'
import type { ScoringResult } from '@/lib/scoring/AssessmentScoringEngine'

type ScoreResultWithCategory = Database['public']['Tables']['score_results']['Row'] & {
  framework_categories: { name: string } | null
}

export default async function ReportPage({ 
  params,
  searchParams 
}: { 
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ surveyId?: string }>
}) {
  const { projectId } = await params
  const { surveyId } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const serviceClient = await createServiceClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.role === 'admin'

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (!project) notFound()

  // Get survey - either by surveyId param or latest survey for the project
  let survey
  if (surveyId) {
    const { data } = await supabase
      .from('surveys')
      .select('id, pack_version_snapshot')
      .eq('id', surveyId)
      .eq('project_id', projectId) // Ensure survey belongs to this project
      .single()
    survey = data
  } else {
    const { data } = await supabase
      .from('surveys')
      .select('id, pack_version_snapshot')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    survey = data
  }

  if (!survey) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No survey found for this project.</p>
      </div>
    )
  }

  const { data: scoreRun } = await supabase
    .from('score_runs')
    .select('*')
    .eq('survey_id', survey.id)
    .order('executed_at', { ascending: false })
    .limit(1)
    .single()

  if (!scoreRun) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No score run found. Please run the scoring engine first.</p>
      </div>
    )
  }

  const [{ data: execResult }, { data: indexResults }, { data: categoryResults }, { data: issueRankings }, { data: aiInsights }] =
    await Promise.all([
      supabase.from('executive_results').select('*').eq('score_run_id', scoreRun.id).single(),
      supabase.from('index_results').select('*').eq('score_run_id', scoreRun.id),
      supabase.from('score_results').select('*, framework_categories(name)').eq('score_run_id', scoreRun.id),
      supabase.from('issue_rankings').select('*').eq('score_run_id', scoreRun.id).order('priority_score', { ascending: false }),
      supabase.from('ai_insights').select('*').eq('score_run_id', scoreRun.id).order('created_at', { ascending: false }).limit(1).single(),
    ])

  const scoring: ScoringResult = {
    scoreRunId: scoreRun.id,
    surveyId: survey.id,
    frameworkVersion: scoreRun.framework_version,
    checksum: scoreRun.checksum,
    responseCount: scoreRun.response_count,
    executedAt: new Date(scoreRun.executed_at),
    categoryScores: ((categoryResults ?? []) as unknown as ScoreResultWithCategory[]).map(r => ({
      categoryId: r.category_id,
      categoryName: r.ai_category_name ?? (r as ScoreResultWithCategory).framework_categories?.name ?? r.category_id ?? '',
      rawScore: r.raw_score,
      minPossible: r.min_possible,
      maxPossible: r.max_possible,
      normalizedScore: r.normalized_score,
    })),
    indexScores: (indexResults ?? []).map(r => ({
      indexKey: r.index_key,
      score0100: r.score_0_100,
      higherIsBetter: r.higher_is_better,
      label: r.index_key,
    })),
    healthScore: execResult?.health_score_0_100 ?? 0,
    issueRankings: (issueRankings ?? []).map(r => ({
      driverTag: r.driver_tag,
      risk: r.risk,
      friction: r.friction,
      frequency: r.frequency,
      priorityScore: r.priority_score,
      description: r.description ?? '',
    })),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Report — {project.client_name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Framework v{scoring.frameworkVersion} · {scoring.responseCount} responses
            </p>
          </div>
          <div className="flex gap-3">
            {isAdmin && (
              <ShareReportButton
                projectId={project.id}
                scoreRunId={scoring.scoreRunId}
              />
            )}
            <ReportExportButton
              projectName={project.client_name}
              industry={project.industry}
              goal={project.goal}
              frameworkVersion={scoring.frameworkVersion}
              scoring={scoring}
              aiInsightSummary={aiInsights?.summary_text ?? undefined}
              aiThemes={Array.isArray(aiInsights?.themes_json) ? aiInsights.themes_json as string[] : undefined}
              fullAnalysis={(aiInsights?.model_metadata as any)?.fullAnalysis ?? undefined}
            />
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
        {/* Executive Health */}
        <div className={`rounded-2xl border p-8 ${
          scoring.healthScore >= 75 ? 'bg-green-50 border-green-200' :
          scoring.healthScore >= 50 ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Executive Health Score</h2>
          <p className={`text-7xl font-bold ${
            scoring.healthScore >= 75 ? 'text-green-600' :
            scoring.healthScore >= 50 ? 'text-yellow-500' :
            'text-red-600'
          }`}>
            {scoring.healthScore.toFixed(1)}
          </p>
          <p className="text-sm text-gray-500 mt-2">out of 100 · {scoring.responseCount} respondents</p>
        </div>

        {/* Indexes */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-5">Index Scores</h2>
          <div className="space-y-4">
            {scoring.indexScores.map(idx => (
              <div key={idx.indexKey}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">
                    {idx.label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    {!idx.higherIsBetter && <span className="text-xs text-gray-400 ml-1">(higher = more risk)</span>}
                  </span>
                  <span className="font-semibold text-gray-900">{idx.score0100.toFixed(1)}</span>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-full rounded-full ${idx.higherIsBetter ? 'bg-blue-500' : 'bg-orange-500'}`}
                    style={{ width: `${idx.score0100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Category Breakdown</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Category</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500">Raw</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500">Min</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500">Max</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500">Score (0–100)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {scoring.categoryScores.map(cs => (
                <tr key={cs.categoryId ?? cs.categoryName}>
                  <td className="px-6 py-3 text-gray-700">{cs.categoryName}</td>
                  <td className="px-6 py-3 text-right text-gray-500">{cs.rawScore.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-gray-400">{cs.minPossible.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right text-gray-400">{cs.maxPossible.toFixed(2)}</td>
                  <td className="px-6 py-3 text-right font-semibold text-gray-900">{cs.normalizedScore.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Issues */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Ranked Issues — Priority View</h2>
            <p className="text-xs text-gray-400 mt-0.5">Priority = 0.4×Risk + 0.4×Friction + 0.2×Frequency</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">#</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Driver</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500">Risk</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500">Friction</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {scoring.issueRankings.slice(0, 10).map((ir, i) => (
                <tr key={ir.driverTag}>
                  <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-6 py-3 text-gray-700 capitalize">{ir.driverTag.replace(/_/g, ' ')}</td>
                  <td className="px-6 py-3 text-right text-gray-500">{ir.risk.toFixed(1)}%</td>
                  <td className="px-6 py-3 text-right text-gray-500">{ir.friction.toFixed(1)}%</td>
                  <td className="px-6 py-3 text-right font-bold text-gray-900">{ir.priorityScore.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Insights — 5-Dimensional Analysis */}
        {aiInsights ? (() => {
          const meta = aiInsights.model_metadata as any
          const full = meta?.fullAnalysis
          const isFallback = meta?.isFallback === true || meta?.model === 'deterministic-fallback'
          const tabs = [
            { key: 'descriptive',  label: 'What happened?',     icon: '📊' },
            { key: 'diagnostic',   label: 'Why?',               icon: '🔍' },
            { key: 'predictive',   label: 'What might happen?', icon: '🔮' },
            { key: 'prescriptive', label: 'What to do?',        icon: '🎯' },
            { key: 'kpi',          label: 'KPI View',            icon: '📈' },
          ]
          return (
            <AIInsightsPanel
              aiInsights={aiInsights}
              full={full}
              isFallback={isFallback}
              tabs={tabs}
              scoreRunId={scoring.scoreRunId}
            />
          )
        })() : null}

        {/* Audit */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-400 font-mono">
          <p>Score Run: {scoring.scoreRunId}</p>
          <p>Checksum: {scoring.checksum}</p>
          <p>Framework: v{scoring.frameworkVersion}</p>
          <p>Executed: {scoring.executedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at {scoring.executedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </div>
  )
}
