'use client'

import type { DashboardInsightData, DashboardInsightPayload } from '@/app/api/insights/dashboard/route'
import { Button } from '@/components/ui/button'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  payload: DashboardInsightPayload
}

const CACHE_KEY = 'dashboard_insight_cache'

interface CacheEntry {
  hash: string
  insight: DashboardInsightData
  isFallback: boolean
  generatedAt: number
}

/** Fast deterministic fingerprint of the payload */
function hashPayload(p: DashboardInsightPayload): string {
  const str = JSON.stringify({
    tp: p.totalProjects,
    ap: p.activeProjects,
    cp: p.completedProjects,
    dp: p.draftProjects,
    ts: p.totalSurveys,
    as: p.activeSurveys,
    fp: p.frameworkPacks,
    tr: p.totalResponses ?? 0,
    hs: p.avgHealthScore ?? 0,
    rc: p.recentResponsesCount ?? 0,
  })
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i)
  return (h >>> 0).toString(36)
}

function readCache(): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as CacheEntry) : null
  } catch { return null }
}

function writeCache(entry: CacheEntry) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(entry)) } catch { /* ignore */ }
}

const signalConfig = {
  good: { bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500', label: 'Healthy' },
  warning: { bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', label: 'Needs Attention' },
  critical: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500', label: 'Critical' },
}

const trendLabel = { improving: 'Improving', stable: 'Stable', declining: 'Declining' }
const trendColor = { improving: 'text-green-600', stable: 'text-gray-500', declining: 'text-red-500' }

export default function DashboardAutoInsights({ payload }: Props) {
  const currentHash = useMemo(() => hashPayload(payload), [payload])

  const [insight, setInsight] = useState<DashboardInsightData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)
  const [isFallback, setIsFallback] = useState(false)
  const [cachedHash, setCachedHash] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'descriptive' | 'diagnostic' | 'predictive' | 'prescriptive' | 'kpi'>('descriptive')

  // Restore from cache on mount
  useEffect(() => {
    const cached = readCache()
    if (!cached) return
    setCachedHash(cached.hash)
    if (cached.hash === currentHash) {
      setInsight(cached.insight)
      setIsFallback(cached.isFallback)
      setGenerated(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** True when analytics data is unchanged since last generation */
  const dataUnchanged = generated && cachedHash === currentHash

  const generate = useCallback(async () => {
    // If cached and data unchanged, just restore from cache (no API call)
    const cached = readCache()
    if (cached && cached.hash === currentHash) {
      setInsight(cached.insight)
      setIsFallback(cached.isFallback)
      setGenerated(true)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/insights/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.ok && !json.data) {
        setError(json.error ?? 'Unknown error')
        return
      }
      const data: DashboardInsightData = json.data
      const fallback = !!json.isFallback
      setInsight(data)
      setIsFallback(fallback)
      setGenerated(true)
      setCachedHash(currentHash)
      writeCache({ hash: currentHash, insight: data, isFallback: fallback, generatedAt: Date.now() })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [payload, currentHash])

  const cfg = insight ? (signalConfig[insight.healthSignal] ?? signalConfig.warning) : null

  const tabs = [
    { key: 'descriptive' as const, label: 'What happened?' },
    { key: 'diagnostic' as const, label: 'Why?' },
    { key: 'predictive' as const, label: 'What might happen?' },
    { key: 'prescriptive' as const, label: 'What to do?' },
    { key: 'kpi' as const, label: 'KPI View' },
  ]

  return (
    <div className="mb-8">
      {!generated ? (
        <div
          className="rounded-xl p-5 flex items-center justify-between gap-4"
          style={{
            background: 'linear-gradient(180deg, rgba(0, 179, 176, 0.06), rgba(124, 58, 237, 0.04))',
            border: '1px solid rgba(124, 58, 237, 0.2)',
          }}
        >
          <div>
            <p className="text-sm font-semibold text-violet-900">AI Dashboard Insights</p>
            <p className="text-xs text-violet-500 mt-0.5">
              Powered by Groq - 5-dimensional analysis: Descriptive - Diagnostic - Predictive - Prescriptive - KPI
            </p>
          </div>
          <Button
            onClick={generate}
            disabled={true}
            title="This feature is currently disabled"
            className="flex items-center gap-2 bg-gray-400 hover:bg-gray-400 rounded-lg whitespace-nowrap cursor-not-allowed"
          >
            Generate Insights (Disabled)
          </Button>
        </div>
      ) : insight && cfg ? (
        <div className={`border rounded-xl overflow-hidden ${cfg.bg}`}>
          {/* Header */}
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot} shrink-0 mt-0.5`} />
                <p className="text-sm font-bold text-gray-900">{insight.headline}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                {isFallback && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Rule-based</span>}
                {dataUnchanged && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Up to date</span>
                )}
              </div>
              <Button
                onClick={() => { setGenerated(false); setInsight(null); setError(null) }}
                variant="ghost"
                size="xs"
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >Dismiss</Button>
            </div>
            <p className="text-xs text-gray-400 mt-1 ml-4">
              {isFallback ? 'Rule-based Analysis' : 'AI Analysis - Groq (llama-3.3-70b-versatile)'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/50 bg-white/30 overflow-x-auto">
            {tabs.map(tab => (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                variant="ghost"
                size="sm"
                className={`px-4 py-2.5 rounded-none whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key
                  ? 'border-violet-500 text-violet-700 bg-white/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/20'
                  }`}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {activeTab === 'descriptive' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700">{insight.descriptive.summary}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {insight.descriptive.highlights.map((h, i) => (
                    <div key={i} className="bg-white/70 rounded-lg p-3 border border-white/80">
                      <p className="text-xs text-gray-500 mb-0.5">Highlight {i + 1}</p>
                      <p className="text-sm text-gray-800 font-medium">{h}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'diagnostic' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700">{insight.diagnostic.summary}</p>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Root Causes</p>
                  <ul className="space-y-1.5">
                    {insight.diagnostic.rootCauses.map((rc, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="shrink-0 text-red-400 mt-0.5">-</span>{rc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'predictive' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-700 flex-1">{insight.predictive.summary}</p>
                  <div className="shrink-0 text-center bg-white/70 rounded-lg px-4 py-2 border border-white/80">
                    <p className={`text-sm font-bold ${trendColor[insight.predictive.trendOutlook]}`}>
                      {trendLabel[insight.predictive.trendOutlook]}
                    </p>
                    <p className="text-xs text-gray-500">Trend</p>
                  </div>
                </div>
                {insight.predictive.risks.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Risk Signals</p>
                    <ul className="space-y-1.5">
                      {insight.predictive.risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="shrink-0 text-amber-500 mt-0.5">!</span>{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'prescriptive' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700">{insight.prescriptive.summary}</p>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Top Actions</p>
                  <ul className="space-y-2">
                    {insight.prescriptive.topActions.map((a, i) => (
                      <li key={i} className="flex items-start gap-3 bg-white/70 rounded-lg px-3 py-2.5 border border-white/80">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                        <p className="text-sm text-gray-800">{a}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'kpi' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700">{insight.kpi.summary}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white/70 rounded-lg p-3 border border-white/80">
                    <p className="text-xs text-gray-500 mb-1">Meeting Goal?</p>
                    <p className={`text-sm font-bold ${insight.kpi.meetsGoal ? 'text-green-600' : 'text-red-600'}`}>
                      {insight.kpi.meetsGoal ? 'Yes' : 'Not yet'}
                    </p>
                  </div>
                  <div className="bg-white/70 rounded-lg p-3 border border-white/80">
                    <p className="text-xs text-gray-500 mb-1">Urgent Attention</p>
                    <p className="text-sm font-medium text-gray-800">{insight.kpi.urgentAttention}</p>
                  </div>
                  <div className="sm:col-span-2 bg-white/70 rounded-lg p-3 border border-white/80">
                    <p className="text-xs text-gray-500 mb-1">Win to Highlight</p>
                    <p className="text-sm font-medium text-gray-800">{insight.kpi.winToHighlight}</p>
                  </div>
                </div>
                <div className="bg-white/70 rounded-lg px-4 py-3 border border-white/80">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Top Recommendation</p>
                  <p className="text-sm text-gray-800">{insight.recommendation}</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-4 flex items-center justify-end gap-3">
            {dataUnchanged ? (
              <p className="text-xs text-gray-400">No analytics changes since last analysis</p>
            ) : (
              <Button
                onClick={generate}
                disabled={loading}
                variant="ghost"
                size="xs"
                className="text-violet-600 hover:text-violet-800"
              >
                {loading ? 'Refreshing...' : 'Refresh insights'}
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {error && !generated && (
        <div className="mt-2 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span className="shrink-0 mt-0.5">!</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}