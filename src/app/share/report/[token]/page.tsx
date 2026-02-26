import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import type { Database } from '@/types/DatabaseSchemaDefinitions'
import type { ScoringResult } from '@/lib/scoring/AssessmentScoringEngine'
import CategoryChart from '@/components/dashboard/AnalyticsCategoryVisualizer'
import IndexScoreCard from '@/components/dashboard/MetricsOverviewCard'
import IssueRankingTable from '@/components/dashboard/PriorityIssuesDisplay'
import ReportExportButton from '@/components/reports/ReportDownloadController'

type ScoreResultWithCategory = Database['public']['Tables']['score_results']['Row'] & {
  framework_categories: { name: string } | null
}

export default async function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const serviceClient = await createServiceClient()

  // Fetch report share by token
  const { data: reportShare, error: shareError } = await serviceClient
    .from('report_shares')
    .select(`
      *,
      projects(*),
      score_runs(*)
    `)
    .eq('token', token)
    .single()

  if (shareError || !reportShare || !(reportShare as any).is_active) {
    notFound()
  }

  // Check expiration
  if ((reportShare as any).expires_at && new Date((reportShare as any).expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Expired</h1>
          <p className="text-gray-500 text-sm">
            This shareable report link has expired. Please contact the report owner for a new link.
          </p>
        </div>
      </div>
    )
  }

  // Increment view count (non-blocking)
  serviceClient.rpc('increment_report_view', { share_token: token } as any).then()

  const project = (reportShare as any).projects
  const scoreRun = (reportShare as any).score_runs

  // Fetch scoring data
  const [{ data: execResult }, { data: indexResults }, { data: categoryResults }, { data: issueRankings }, { data: aiInsights }] =
    await Promise.all([
      serviceClient.from('executive_results').select('*').eq('score_run_id', scoreRun.id).single(),
      serviceClient.from('index_results').select('*').eq('score_run_id', scoreRun.id),
      serviceClient.from('score_results').select('*, framework_categories(name)').eq('score_run_id', scoreRun.id),
      serviceClient.from('issue_rankings').select('*').eq('score_run_id', scoreRun.id).order('priority_score', { ascending: false }),
      serviceClient.from('ai_insights').select('*').eq('score_run_id', scoreRun.id).order('created_at', { ascending: false }).limit(1).single(),
    ])

  const scoring: ScoringResult = {
    scoreRunId: scoreRun.id,
    surveyId: scoreRun.survey_id,
    frameworkVersion: scoreRun.framework_version,
    checksum: scoreRun.checksum,
    responseCount: scoreRun.response_count,
    executedAt: new Date(scoreRun.executed_at),
    categoryScores: (categoryResults ?? []).map((r: any) => ({
      categoryId: r.category_id,
      categoryName: (r as ScoreResultWithCategory).framework_categories?.name ?? r.category_id,
      rawScore: r.raw_score,
      minPossible: r.min_possible,
      maxPossible: r.max_possible,
      normalizedScore: r.normalized_score,
    })),
    indexScores: (indexResults ?? []).map((r: any) => ({
      indexKey: r.index_key,
      score0100: r.score_0_100,
      higherIsBetter: r.higher_is_better,
      label: r.index_key,
    })),
    healthScore: (execResult as any)?.health_score_0_100 ?? 0,
    issueRankings: (issueRankings ?? []).map((r: any) => ({
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
      {/* Header with branding */}
      <div className="bg-gradient-to-r from-gray-900 to-blue-900 text-white px-8 py-6 border-b-4 border-blue-500">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-500 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-xl font-bold">DIP</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Decision Intelligence Report</h1>
              <p className="text-blue-200 text-sm">Shareable Report View</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold">{project.client_name}</p>
              <p className="text-xs text-blue-200 mt-1">
                Framework v{scoring.frameworkVersion} · {scoring.responseCount} responses · Generated {new Date(scoreRun.executed_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </p>
            </div>
            <ReportExportButton
              projectName={project.client_name}
              industry={project.industry}
              goal={project.goal}
              frameworkVersion={scoring.frameworkVersion}
              scoring={scoring}
              aiInsightSummary={(aiInsights as any)?.summary_text ?? undefined}
              aiThemes={Array.isArray((aiInsights as any)?.themes_json) ? (aiInsights as any).themes_json as string[] : undefined}
            />
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Executive Health Score */}
          <div className={`lg:col-span-1 rounded-2xl border p-8 ${
            scoring.healthScore >= 75 ? 'bg-green-50 border-green-200' :
            scoring.healthScore >= 50 ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Health Score</h2>
            <p className={`text-6xl font-bold ${
              scoring.healthScore >= 75 ? 'text-green-600' :
              scoring.healthScore >= 50 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {scoring.healthScore.toFixed(1)}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {scoring.healthScore >= 75 ? 'Healthy' : scoring.healthScore >= 50 ? 'Needs Attention' : 'At Risk'}
            </p>
          </div>

          {/* Index Scores */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scoring.indexScores.map(idx => (
              <IndexScoreCard
                key={idx.indexKey}
                indexKey={idx.indexKey}
                score={idx.score0100}
                higherIsBetter={idx.higherIsBetter}
              />
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-5">Category Breakdown</h2>
          <CategoryChart
            categories={scoring.categoryScores.map(cat => ({
              name: cat.categoryName,
              score: cat.normalizedScore,
            }))}
          />
        </div>

        {/* Issue Rankings */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-5">Priority Issues</h2>
          <IssueRankingTable 
            issues={scoring.issueRankings.map((issue, i) => ({
              id: `issue-${i}`,
              driver_tag: issue.driverTag,
              risk: issue.risk,
              friction: issue.friction,
              frequency: issue.frequency,
              priority_score: issue.priorityScore,
              description: issue.description,
            }))} 
          />
        </div>

        {/* AI Insights */}
        {(aiInsights as any)?.summary_text && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✨</span>
              <h2 className="text-sm font-semibold text-purple-900">AI-Generated Insights</h2>
              <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">Non-Scoring</span>
            </div>
            <p className="text-sm text-purple-900 leading-relaxed whitespace-pre-wrap">
              {(aiInsights as any).summary_text}
            </p>
            {Array.isArray((aiInsights as any).themes_json) && ((aiInsights as any).themes_json as string[]).length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-purple-700 mb-2">Key Themes:</p>
                <ul className="space-y-1">
                  {((aiInsights as any).themes_json as string[]).map((theme, i) => (
                    <li key={i} className="text-sm text-purple-800 flex items-start gap-2">
                      <span className="text-purple-400 mt-1">●</span>
                      <span>{theme}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            This is a read-only shareable report. For full access and analysis tools, contact the report owner.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Viewed {(reportShare as any).view_count + 1} times
            {(reportShare as any).expires_at && ` · Expires ${new Date((reportShare as any).expires_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}`}
          </p>
        </div>
      </div>
    </div>
  )
}
