import { createClient, createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import FrameworkPacksTable from '@/components/app/FrameworkPacksTable'
import { getCurrentProfile } from '@/lib/auth/UserProfileRetriever'
import { can } from '@/lib/auth/UserPermissionDefinitions'

export default async function FrameworksPage() {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const profile = await getCurrentProfile()
  const canManage = can(profile?.role, 'manageFramework')

  const [packsRes, surveyLinksRes] = await Promise.all([
    supabase
      .from('framework_packs')
      .select('id, name, version, description, active, created_at')
      .order('created_at', { ascending: false }),
    serviceClient
      .from('surveys')
      .select('pack_id, projects(id, client_name)')
      .not('pack_id', 'is', null),
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

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Framework Packs</h1>
        <p className="text-gray-500 text-sm mt-1">
          Versioned, pre-authored survey frameworks. Seed via SQL migrations.
        </p>
      </div>

      {packs.length > 0 ? (
        <FrameworkPacksTable packs={packs} canManage={canManage} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center text-gray-400">
          <p>No framework packs found.</p>
          <p className="text-xs mt-2">Run migration <code>003_seed_framework_v1.sql</code> to seed the default pack.</p>
        </div>
      )}
    </div>
  )
}
