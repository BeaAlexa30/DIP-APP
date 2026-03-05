
import AddOrGenerateSurveyDialog from '@/components/app/AddOrGenerateSurveyDialog'
import ProjectActions from '@/components/app/ProjectManagementControls'
import SurveyBulkManager from '@/components/app/SurveyBulkManager'
import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import type { Database } from '@/types/DatabaseSchemaDefinitions'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Project = Database['public']['Tables']['projects']['Row']
type FrameworkPack = Pick<Database['public']['Tables']['framework_packs']['Row'], 'id' | 'name' | 'version' | 'description'>
type ScoreRun = Pick<Database['public']['Tables']['score_runs']['Row'], 'id' | 'executed_at' | 'checksum' | 'response_count'>

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const serviceClient = await createServiceClient()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await serviceClient.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = profile?.role === 'admin'

  const [projectRes, packsRes, surveysRes] = await Promise.all([
    serviceClient.from('projects').select('*').eq('id', id).single(),
    serviceClient.from('framework_packs').select('id, name, version, description').eq('active', true),
    serviceClient
      .from('surveys')
      .select('*, survey_tokens(id, token, expires_at, max_responses, response_count)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
  ])

  const project = projectRes.data as Project | null
  const packs = (packsRes.data ?? []) as FrameworkPack[]
  const surveys = (surveysRes.data ?? []) as unknown as Array<Database['public']['Tables']['surveys']['Row'] & { survey_tokens: Database['public']['Tables']['survey_tokens']['Row'][] }>

  if (!project) notFound()

  // Get response counts and score runs for each survey
  const surveysWithData = await Promise.all(
    surveys.map(async (survey) => {
      const responseCount = ((await serviceClient
        .from('responses')
        .select('id', { count: 'exact', head: true })
        .eq('survey_id', survey.id)
      ).count ?? 0)

      const scoreRunsResult = await serviceClient
        .from('score_runs')
        .select('id, executed_at, checksum, response_count')
        .eq('survey_id', survey.id)
        .order('executed_at', { ascending: false })
        .limit(1)

      const latestScoreRun = (scoreRunsResult.data as ScoreRun[] | null)?.[0] ?? null

      return { survey, responseCount, latestScoreRun }
    })
  )

  // Find the first survey with a score run for the header dashboard link
  const surveyWithScoreRun = surveysWithData.find(s => s.latestScoreRun !== null)

  return (
    <div className="px-4 sm:px-8 py-4 sm:py-6">
      {/* Navigation Bar */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 sm:px-6 py-3 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link href="/app/projects" className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors">
              Projects
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-gray-900 text-sm font-semibold">{project.client_name}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {surveyWithScoreRun && (
              <Link
                href={`/app/projects/${project.id}/dashboard?surveyId=${surveyWithScoreRun.survey.id}`}
                className="px-4 py-1.5 bg-[#009E9B] text-white text-sm font-medium rounded-lg hover:bg-[#00B3B0] transition-colors"
              >
                Decision Dashboard
              </Link>
            )}
            <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${project.status === 'active' ? 'bg-green-100 text-green-700' :
                project.status === 'completed' ? 'bg-[#009E9B]/10 text-[#007A78]' :
                  project.status === 'archived' ? 'bg-gray-200 text-gray-600' :
                    'bg-yellow-100 text-yellow-700'
              }`}>
              {project.status}
            </span>
          </div>
        </div>
      </div>

      {/* Archived banner */}
      {project.status === 'archived' && (
        <div className="bg-gray-100 border border-gray-300 rounded-xl px-6 py-4 mb-6 flex items-start gap-3">
          <span className="text-2xl mt-0.5">🗄</span>
          <div>
            <p className="text-sm font-semibold text-gray-700">This project is archived</p>
            <p className="text-xs text-gray-500 mt-0.5">
              All surveys are closed and no longer accepting responses. No new surveys can be created.
              An Admin can reopen the project to restore survey access.
            </p>
          </div>
        </div>
      )}

      {/* Content Container */}
      <div className="max-w-7xl mx-auto">
        {/* Project Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{project.client_name}</h1>
          <p className="text-gray-500 text-sm mt-1">{project.goal ?? 'No goal set'}</p>
        </div>

        {/* Project Info - Full Width */}
        <div className="mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Project Details</h2>
            <dl className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
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
              {project.channels && project.channels.length > 0 && (
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
                  {new Date(project.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 text-xs">Active Surveys</dt>
                <dd className="text-gray-700 font-medium">{surveys.length}</dd>
              </div>
            </dl>

            {/* Project Actions */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
              <ProjectActions project={project} />
            </div>
          </div>
        </div>

        {/* Surveys Section - Full Width Below */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900">Framework Surveys</h2>
            <span className="text-sm text-gray-500">{surveys.length} survey{surveys.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Survey Cards */}
          {surveysWithData.length > 0 ? (
            <>
              <SurveyBulkManager
                surveysWithData={surveysWithData as any}
                projectId={project.id}
                projectArchived={project.status === 'archived'}
              />

              {/* Add / Generate AI Survey — admin only, hidden when project is archived */}
              {isAdmin && project.status !== 'archived' && (
                <div className="mt-4">
                  <AddOrGenerateSurveyDialog
                    projectId={project.id}
                    projectName={project.client_name}
                    projectContext={{
                      industry: project.industry ?? null,
                      goal: project.goal ?? null,
                      stage: project.stage ?? null,
                      channels: project.channels ?? null,
                      target_audience: project.target_audience ?? null,
                    }}
                    packs={packs}
                    existingPackIds={surveys.map(s => s.pack_id)}
                  />
                </div>
              )}
            </>
          ) : (
            /* No surveys yet — hide selector when archived */
            project.status !== 'archived' ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-[#009E9B]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">📋</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No Surveys Yet</h3>
                  <p className="text-sm text-gray-500">{isAdmin ? 'Choose a method below to create your first survey' : 'No surveys have been created for this project yet.'}</p>
                </div>

                {isAdmin && (
                  <AddOrGenerateSurveyDialog
                    projectId={project.id}
                    projectName={project.client_name}
                    projectContext={{
                      industry: project.industry ?? null,
                      goal: project.goal ?? null,
                      stage: project.stage ?? null,
                      channels: project.channels ?? null,
                      target_audience: project.target_audience ?? null,
                    }}
                    packs={packs}
                    existingPackIds={[]}
                  />
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                <span className="text-3xl block mb-2">🗄</span>
                <p className="text-sm text-gray-500">No surveys were created before this project was archived.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
