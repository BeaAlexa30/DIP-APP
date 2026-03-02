import DashboardAutoInsights from '@/components/dashboard/DashboardAutoInsights'
import DashboardCharts from '@/components/dashboard/DashboardCharts'
import { Button } from '@/components/ui/button'
import { can } from '@/lib/auth/UserPermissionDefinitions'
import { getCurrentProfile } from '@/lib/auth/UserProfileRetriever'
import { createClient } from '@/lib/supabase/ServerSideDbConnector'
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import Link from 'next/link'

export default async function AppDashboard() {
  const supabase = await createClient()
  const profile = await getCurrentProfile()
  const canCreate = can(profile?.role, 'createProject')

  const [
    { data: recentProjects },
    { data: allProjectStatuses },
    { data: allSurveyStatuses },
    { count: frameworkCount },
    { data: allProjectDates },
    { count: totalResponses },
    { data: healthScores },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id, client_name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('projects').select('status'),
    supabase.from('surveys').select('status'),
    supabase.from('framework_packs').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase.from('projects').select('created_at'),
    supabase.from('responses').select('id', { count: 'exact', head: true }),
    supabase.from('executive_results').select('health_score_0_100').order('created_at', { ascending: false }).limit(20),
  ])

  // ── Status groupings ──────────────────────────────────────
  const statusGroup = (allProjectStatuses ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1
    return acc
  }, {})

  const surveyGroup = (allSurveyStatuses ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1
    return acc
  }, {})

  const totalProjects = allProjectStatuses?.length ?? 0
  const activeSurveys = surveyGroup['published'] ?? 0
  const totalSurveys = allSurveyStatuses?.length ?? 0

  const stats = [
    { label: 'Total Projects', value: totalProjects, href: '/app/projects', color: 'bg-[#e0f9f9] text-[#007775] border-[#80d9d8]' },
    { label: 'Active Surveys', value: activeSurveys, href: '/app/projects', color: 'bg-[#ccf5f5] text-[#005f5e] border-[#59c9c8]' },
    { label: 'Framework Packs', value: frameworkCount ?? 0, href: '/app/frameworks', color: 'bg-[#b3f0ef] text-[#004a49] border-[#33b8b7]' },
  ]

  // ── Chart data ────────────────────────────────────────────
  const projectsByStatus = [
    { name: 'Active', value: statusGroup['active'] ?? 0, color: '#00B3B0' },
    { name: 'Draft', value: statusGroup['draft'] ?? 0, color: '#111827' },
    { name: 'Completed', value: statusGroup['completed'] ?? 0, color: '#33c9c7' },
    { name: 'Archived', value: statusGroup['archived'] ?? 0, color: '#9ca3af' },
  ]

  const surveysByStatus = [
    { name: 'Published', value: surveyGroup['published'] ?? 0, color: '#00B3B0' },
    { name: 'Draft', value: surveyGroup['draft'] ?? 0, color: '#111827' },
    { name: 'Closed', value: surveyGroup['closed'] ?? 0, color: '#9ca3af' },
  ]

  // Project trend — last 6 months
  const now = new Date()
  const projectTrend = Array.from({ length: 6 }, (_, i) => {
    const monthDate = subMonths(now, 5 - i)
    const start = startOfMonth(monthDate).toISOString()
    const end = endOfMonth(monthDate).toISOString()
    const count = (allProjectDates ?? []).filter(
      (p) => p.created_at >= start && p.created_at <= end
    ).length
    return { month: format(monthDate, 'MMM'), projects: count }
  })

  // ── Gemini insight payload ────────────────────────────────
  const avgHealthScore = healthScores && healthScores.length > 0
    ? healthScores.reduce((sum, r) => sum + (r.health_score_0_100 ?? 0), 0) / healthScores.length
    : undefined

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const recentResponsesCount = undefined // Approximation — full count would need extra query

  const insightPayload = {
    totalProjects,
    activeProjects: statusGroup['active'] ?? 0,
    completedProjects: statusGroup['completed'] ?? 0,
    draftProjects: statusGroup['draft'] ?? 0,
    archivedProjects: statusGroup['archived'] ?? 0,
    activeSurveys,
    totalSurveys,
    frameworkPacks: frameworkCount ?? 0,
    totalResponses: totalResponses ?? 0,
    avgHealthScore,
    recentResponsesCount,
  }

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

      {/* Charts */}
      <DashboardCharts
        projectsByStatus={projectsByStatus}
        surveysByStatus={surveysByStatus}
        projectTrend={projectTrend}
        frameworkCount={frameworkCount ?? 0}
      />

      {/* AI Auto Insights */}
      <DashboardAutoInsights payload={insightPayload} />

      {/* Recent Projects */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Recent Projects</h2>
          {canCreate && (
            <Button asChild size="sm">
              <Link href="/app/projects/new">+ New Project</Link>
            </Button>
          )}
        </div>
        <div className="divide-y divide-gray-50">
          {recentProjects && recentProjects.length > 0 ? (
            recentProjects.map(p => (
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
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.status === 'active' ? 'bg-green-100 text-green-700' :
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
              No projects yet.
              {canCreate && (
                <>{' '}<Button asChild variant="link">
                  <Link href="/app/projects/new">Create your first project</Link>
                </Button></>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
