import { notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import SurveyManager from '@/components/app/SurveyManager'
import ScoreRunTrigger from '@/components/app/ScoreRunTrigger'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const [projectRes, packsRes, surveysRes] = await Promise.all([
    serviceClient.from('projects').select('*').eq('id', id).single(),
    supabase.from('framework_packs').select('id, name, version, description').eq('active', true),
    serviceClient
      .from('surveys')
      .select('*, survey_tokens(id, token, expires_at, max_responses, response_count)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ])

  const project = projectRes.data as any
  const packs = packsRes.data as any[]
  const surveys = surveysRes.data as any[]

  if (!project) notFound()

  const activeSurvey = surveys?.[0] ?? null

  // Count responses directly from responses table (reliable, no RPC dependency)
  const responseCount = activeSurvey
    ? ((await serviceClient
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .eq('survey_id', activeSurvey.id)
      ).count ?? 0)
    : 0

  // Load latest score run
  const latestScoreRun: any = activeSurvey
    ? (await serviceClient
        .from('score_runs')
        .select('id, executed_at, checksum, response_count')
        .eq('survey_id', activeSurvey.id)
        .order('executed_at', { ascending: false })
        .limit(1)
        .single()
      ).data
    : null

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/app/projects" className="text-gray-400 hover:text-gray-600 text-sm">Projects</Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-600 text-sm">{project.client_name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{project.client_name}</h1>
          <p className="text-gray-500 text-sm mt-1">{project.goal ?? 'No goal set'}</p>
        </div>
        <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${
          project.status === 'active' ? 'bg-green-100 text-green-700' :
          project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {project.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Project Details</h2>
            <dl className="space-y-3 text-sm">
              {project.industry && (
                <div>
                  <dt className="text-gray-400 text-xs">Industry</dt>
                  <dd className="text-gray-700 font-medium">{project.industry}</dd>
                </div>
              )}
              {project.stage && (
                <div>
                  <dt className="text-gray-400 text-xs">Stage</dt>
                  <dd className="text-gray-700 font-medium">{project.stage}</dd>
                </div>
              )}
              {project.channels?.length > 0 && (
                <div>
                  <dt className="text-gray-400 text-xs">Channels</dt>
                  <dd className="flex flex-wrap gap-1 mt-1">
                    {project.channels.map((ch: string) => (
                      <span key={ch} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{ch}</span>
                    ))}
                  </dd>
                </div>
              )}
              {project.target_audience && (
                <div>
                  <dt className="text-gray-400 text-xs">Target Audience</dt>
                  <dd className="text-gray-700 font-medium">{project.target_audience}</dd>
                </div>
              )}
              <div>
                <dt className="text-gray-400 text-xs">Created</dt>
                <dd className="text-gray-700 font-medium">
                  {new Date(project.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Score Run Info */}
          {latestScoreRun && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Latest Score Run</h2>
              <div className="text-xs space-y-2 text-gray-500">
                <p>Responses: <span className="text-gray-700 font-medium">{latestScoreRun.response_count}</span></p>
                <p>Run: <span className="text-gray-700 font-medium">{new Date(latestScoreRun.executed_at).toLocaleString()}</span></p>
                <p className="break-all">
                  Checksum: <span className="text-gray-400 font-mono text-xs">{latestScoreRun.checksum.slice(0, 16)}…</span>
                </p>
              </div>
              <div className="mt-4 space-y-2">
                <Link
                  href={`/app/projects/${project.id}/dashboard`}
                  className="block w-full text-center bg-blue-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Dashboard →
                </Link>
                <Link
                  href={`/reports/${project.id}`}
                  className="block w-full text-center border border-gray-300 text-gray-700 text-xs font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Export Report
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Survey Manager */}
        <div className="lg:col-span-2 space-y-4">
          <SurveyManager
            project={project}
            packs={packs ?? []}
            activeSurvey={activeSurvey}
            responseCount={responseCount}
          />

          {/* Score Run Trigger */}
          {activeSurvey && responseCount > 0 && (
            <ScoreRunTrigger
              surveyId={activeSurvey.id}
              frameworkVersion={(activeSurvey.pack_version_snapshot as any)?.version ?? '1.0'}
              lastRunAt={latestScoreRun?.executed_at ?? null}
            />
          )}
        </div>
      </div>
    </div>
  )
}
