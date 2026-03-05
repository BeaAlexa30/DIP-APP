import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import FrameworkPacksTable from '@/components/app/FrameworkPacksTable'
import { getCurrentProfile } from '@/lib/auth/UserProfileRetriever'
import { can } from '@/lib/auth/UserPermissionDefinitions'

export default async function FrameworksPage() {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const profile = await getCurrentProfile()
  const canManage = can(profile?.role, 'manageFramework')

  const [packsRes, surveyLinksRes, customSurveysRes] = await Promise.all([
    supabase
      .from('framework_packs')
      .select('id, name, version, description, active, created_at')
      .order('created_at', { ascending: false }),
    serviceClient
      .from('surveys')
      .select('pack_id, projects(id, client_name)')
      .not('pack_id', 'is', null),
    serviceClient
      .from('surveys')
      .select('id, pack_version_snapshot, created_at, project_id, projects(id, client_name)')
      .is('pack_id', null)
      .order('created_at', { ascending: false }),
  ])

  // Build packId -> unique projects map
  const projectsByPack: Record<string, { id: string; name: string }[]> = {}
  for (const row of (surveyLinksRes.data ?? []) as any[]) {
    if (!row.pack_id || !row.projects) continue
    const proj = row.projects as { id: string; client_name: string }
    if (!projectsByPack[row.pack_id]) projectsByPack[row.pack_id] = []
    if (!projectsByPack[row.pack_id].some((p) => p.id === proj.id)) {
      projectsByPack[row.pack_id].push({ id: proj.id, name: proj.client_name })
    }
  }

  const packs = (packsRes.data ?? []).map((p) => ({
    ...p,
    projects: projectsByPack[p.id] ?? [],
  }))

  // Transform custom surveys to look like framework packs
  const customPacks = (customSurveysRes.data ?? []).map((survey: any) => {
    const snapshot = survey.pack_version_snapshot || {}
    const projectInfo = survey.projects ? { id: survey.projects.id, name: survey.projects.client_name } : null
    
    return {
      id: survey.id,
      name: snapshot.packName || 'Untitled Custom Survey',
      version: snapshot.version || 'custom',
      description: '[Custom Survey]',
      active: true,
      created_at: survey.created_at,
      projects: projectInfo ? [projectInfo] : [],
    }
  })

  // Merge framework packs and custom surveys
  const allPacks = [...packs, ...customPacks]

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Framework Packs & Custom Surveys</h1>
        <p className="text-gray-500 text-sm mt-1">
          Versioned, pre-authored frameworks and custom surveys created for projects.
        </p>
      </div>

      {allPacks.length > 0 ? (
        <FrameworkPacksTable packs={allPacks} canManage={canManage} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <p>No framework packs or custom surveys found.</p>
          <p className="text-xs mt-2">Create a custom survey in a project or run migration <code>003_seed_framework_v1.sql</code> to seed the default pack.</p>
        </div>
      )}
    </div>
  )
}
