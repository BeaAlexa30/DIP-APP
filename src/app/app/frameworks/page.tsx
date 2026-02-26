import { createClient } from '@/lib/supabase/ServerSideDbConnector'
import FrameworkPacksTable from '@/components/app/FrameworkPacksTable'
import { getCurrentProfile } from '@/lib/auth/UserProfileRetriever'
import { can } from '@/lib/auth/UserPermissionDefinitions'

export default async function FrameworksPage() {
  const supabase = await createClient()
  const profile = await getCurrentProfile()
  const canManage = can(profile?.role, 'manageFramework')

  const { data: packs } = await supabase
    .from('framework_packs')
    .select('id, name, version, description, active, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Framework Packs</h1>
        <p className="text-gray-500 text-sm mt-1">
          Versioned, pre-authored survey frameworks. Seed via SQL migrations.
        </p>
      </div>

      {packs && packs.length > 0 ? (
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
