import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { getCurrentProfile } from '@/lib/auth/UserProfileRetriever'
import { can } from '@/lib/auth/UserPermissionDefinitions'
import Link from 'next/link'
import ProjectsTable from '@/components/app/ProjectsTable'

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

      <ProjectsTable projects={projectsWithCounts} isAdmin={profile?.role === 'admin'} />
    </div>
  )
}
