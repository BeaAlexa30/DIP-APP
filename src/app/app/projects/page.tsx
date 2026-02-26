import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { getCurrentProfile } from '@/lib/auth/UserProfileRetriever'
import { can } from '@/lib/auth/UserPermissionDefinitions'
import Link from 'next/link'
import ProjectRow from '@/components/app/ProjectTableRow'

const statusColors: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
}

const surveyStatusColors: Record<string, string> = {
  draft: 'bg-yellow-50 text-yellow-600',
  published: 'bg-green-50 text-green-600',
  closed: 'bg-gray-50 text-gray-600',
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const profile = await getCurrentProfile()
  const canCreate = can(profile?.role, 'createProject')

  const { data: projects } = await serviceClient
    .from('projects')
    .select(`
      id, 
      client_name, 
      industry, 
      goal, 
      status, 
      created_at,
      surveys(id, status)
    `)
    .order('created_at', { ascending: false })

  // Count surveys for each project
  const projectsWithCounts = (projects ?? []).map((p) => {
    const surveys = (p.surveys ?? []) as unknown as Array<{ id: string; status: string }>
    const surveyCount = surveys.length
    const survey = surveys[0]
    
    return {
      ...p,
      survey_status: survey?.status ?? null,
      survey_count: surveyCount,
    }
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 text-sm mt-1">Manage client intake projects</p>
        </div>
        {canCreate && (
          <Link
            href="/app/projects/new"
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Project
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {projectsWithCounts && projectsWithCounts.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Industry</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Goal</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Survey</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Framework Survey</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {projectsWithCounts.map(p => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center text-gray-400">
            <p className="text-base mb-3">No projects yet</p>
            <Link
              href="/app/projects/new"
              className="text-sm text-blue-600 hover:underline"
            >
              Create your first project →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
