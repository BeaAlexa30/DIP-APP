// @ts-nocheck
import { createClient } from '@/lib/supabase/server'

export default async function FrameworksPage() {
  const supabase = await createClient()

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

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6 text-sm text-amber-800">
        <p className="font-medium mb-1">Admin Note</p>
        <p className="text-xs">
          Framework packs are seeded via SQL (see <code className="bg-amber-100 px-1 rounded">supabase/migrations/003_seed_framework_v1.sql</code>).
          A custom framework builder UI is out of scope for MVP. To add a new pack, write and run a new migration.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {packs && packs.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Version</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Description</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {packs.map(pack => (
                <tr key={pack.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{pack.name}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">v{pack.version}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{pack.description ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${pack.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {pack.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">{new Date(pack.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center text-gray-400">
            <p>No framework packs found.</p>
            <p className="text-xs mt-2">Run migration <code>003_seed_framework_v1.sql</code> to seed the default pack.</p>
          </div>
        )}
      </div>
    </div>
  )
}
