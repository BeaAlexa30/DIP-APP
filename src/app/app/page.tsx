// @ts-nocheck
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function AppDashboard() {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()

  const [{ data: projects }, { data: surveys }, { count: responseCount }] = await Promise.all([
    supabase.from('projects').select('id, client_name, status, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('surveys').select('id, status').eq('status', 'published'),
    serviceClient.from('responses').select('id', { count: 'exact', head: true }),
  ])

  const stats = [
    { label: 'Total Projects', value: projects?.length ?? 0, href: '/app/projects', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Active Surveys', value: surveys?.length ?? 0, href: '/app/projects', color: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'Total Responses', value: responseCount ?? 0, href: '/app/projects', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Decision Intelligence Platform — Internal View</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map(stat => (
          <Link key={stat.label} href={stat.href} className={`p-5 rounded-xl border ${stat.color} hover:opacity-80 transition-opacity`}>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm font-medium mt-1 opacity-80">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent Projects */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Recent Projects</h2>
          <Link href="/app/projects/new" className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors">
            + New Project
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {projects && projects.length > 0 ? (
            projects.map(p => (
              <Link
                key={p.id}
                href={`/app/projects/${p.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.client_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  p.status === 'active' ? 'bg-green-100 text-green-700' :
                  p.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                  p.status === 'archived' ? 'bg-gray-100 text-gray-500' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {p.status}
                </span>
              </Link>
            ))
          ) : (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              No projects yet.{' '}
              <Link href="/app/projects/new" className="text-blue-600 hover:underline">Create your first project</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
