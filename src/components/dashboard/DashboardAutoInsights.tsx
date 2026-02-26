'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { DashboardInsightPayload } from '@/app/api/insights/dashboard/route'

interface InsightData {
  headline: string
  insights: string[]
  recommendation: string
  healthSignal: 'good' | 'warning' | 'critical'
}

interface Props {
  payload: DashboardInsightPayload
}

const COOLDOWN_KEY = 'dip_dashboard_insight_cooldown'

// ── Rule-based fallback (no API needed) ───────────────────────────────────────
function computeLocalInsights(p: DashboardInsightPayload): InsightData {
  const completionRate = p.totalProjects > 0 ? (p.completedProjects / p.totalProjects) * 100 : 0
  const draftRate      = p.totalProjects > 0 ? (p.draftProjects      / p.totalProjects) * 100 : 0
  const surveyRate     = p.totalSurveys  > 0 ? (p.activeSurveys      / p.totalSurveys)  * 100 : 0

  const insights: string[] = []
  let signal: InsightData['healthSignal'] = 'good'

  // Project health
  if (p.totalProjects === 0) {
    insights.push('No projects have been created yet — the platform is ready for its first client.')
    signal = 'warning'
  } else {
    insights.push(
      `${p.totalProjects} total project${p.totalProjects !== 1 ? 's' : ''} on record: ` +
      `${p.activeProjects} active, ${p.completedProjects} completed, ${p.draftProjects} in draft.`
    )
  }

  // Completion rate
  if (completionRate >= 60) {
    insights.push(`Strong completion rate of ${completionRate.toFixed(0)}% — most projects are reaching their goal.`)
  } else if (completionRate > 0) {
    insights.push(`Completion rate is ${completionRate.toFixed(0)}% — there is room to move more projects to completion.`)
    if (signal === 'good') signal = 'warning'
  }

  // Draft backlog
  if (draftRate > 40) {
    insights.push(`${draftRate.toFixed(0)}% of projects are still in draft — consider activating or archiving stale ones.`)
    if (signal === 'good') signal = 'warning'
  }

  // Surveys
  if (p.totalSurveys === 0) {
    insights.push('No surveys have been created yet — publish a survey to start collecting responses.')
    if (signal === 'good') signal = 'warning'
  } else if (surveyRate >= 50) {
    insights.push(`${p.activeSurveys} of ${p.totalSurveys} survey${p.totalSurveys !== 1 ? 's' : ''} are published (${surveyRate.toFixed(0)}% engagement rate).`)
  } else {
    insights.push(`Only ${p.activeSurveys} of ${p.totalSurveys} survey${p.totalSurveys !== 1 ? 's' : ''} are published — activate more to improve data coverage.`)
    if (signal === 'good') signal = 'warning'
  }

  // Framework packs
  if (p.frameworkPacks === 0) {
    insights.push('No active framework packs found — activate at least one to enable assessments.')
    signal = 'critical'
  } else if (p.frameworkPacks < 3) {
    insights.push(`${p.frameworkPacks} framework pack${p.frameworkPacks !== 1 ? 's' : ''} active — consider adding more for broader assessment coverage.`)
  } else {
    insights.push(`${p.frameworkPacks} framework packs are active, providing solid assessment coverage.`)
  }

  // Headline
  const headline =
    signal === 'critical' ? 'Platform needs attention — critical items require action.' :
    signal === 'warning'  ? `Platform is running with ${p.activeProjects} active project${p.activeProjects !== 1 ? 's' : ''} — a few items to address.` :
                            `Platform is healthy with ${p.totalProjects} project${p.totalProjects !== 1 ? 's' : ''} and ${p.frameworkPacks} framework pack${p.frameworkPacks !== 1 ? 's' : ''}.`

  // Recommendation
  const recommendation =
    p.frameworkPacks === 0          ? 'Activate at least one framework pack before creating assessments.' :
    p.totalProjects === 0           ? 'Create your first project to begin the decision intelligence workflow.' :
    p.activeSurveys === 0           ? 'Publish a survey on an active project to start collecting response data.' :
    draftRate > 40                  ? 'Review draft projects and either activate or archive them to keep the workspace clean.' :
    completionRate < 30 && p.totalProjects > 2 ? 'Focus on driving active projects to completion to improve your completion rate.' :
                                      'Keep maintaining active surveys and regularly review project statuses.'

  return { headline, insights: insights.slice(0, 3), recommendation, healthSignal: signal }
}

const signalConfig = {
  good: {
    bg: 'bg-green-50 border-green-200',
    badge: 'bg-green-100 text-green-700',
    icon: '✦',
    iconColor: 'text-green-500',
    label: 'Healthy',
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    icon: '⚠',
    iconColor: 'text-yellow-500',
    label: 'Needs Attention',
  },
  critical: {
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700',
    icon: '●',
    iconColor: 'text-red-500',
    label: 'Critical',
  },
}

function fmtSeconds(ms: number) {
  const s = Math.ceil(ms / 1000)
  if (s >= 60) return `${Math.ceil(s / 60)}m`
  return `${s}s`
}

export default function DashboardAutoInsights({ payload }: Props) {
  const [insight, setInsight] = useState<InsightData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generated, setGenerated] = useState(false)
  const [isFallback, setIsFallback] = useState(false)
  const [cooldownMs, setCooldownMs] = useState(0)   // ms remaining
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // On mount: restore cooldown from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(COOLDOWN_KEY)
    if (stored) {
      const retryAfter = parseInt(stored, 10)
      const remaining = retryAfter - Date.now()
      if (remaining > 0) startCooldown(retryAfter)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startCooldown(retryAfterTs: number) {
    localStorage.setItem(COOLDOWN_KEY, String(retryAfterTs))
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      const remaining = retryAfterTs - Date.now()
      if (remaining <= 0) {
        setCooldownMs(0)
        localStorage.removeItem(COOLDOWN_KEY)
        if (timerRef.current) clearInterval(timerRef.current)
      } else {
        setCooldownMs(remaining)
      }
    }, 1000)
    setCooldownMs(retryAfterTs - Date.now())
  }

  const generate = useCallback(async () => {
    if (cooldownMs > 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/insights/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.ok) {
        if (res.status === 429) {
          const retryAfter = json.retryAfter ?? Date.now() + 60_000
          startCooldown(retryAfter)
          // ── Fallback: compute locally so the user still sees insights ──
          setInsight(computeLocalInsights(payload))
          setIsFallback(true)
          setGenerated(true)
        } else {
          setError(json.error ?? 'Unknown error')
        }
        return
      }
      setInsight(json.data)
      setIsFallback(false)
      setGenerated(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload, cooldownMs])

  const cfg = insight ? signalConfig[insight.healthSignal] ?? signalConfig.good : null
  const inCooldown = cooldownMs > 0

  return (
    <div className="mb-8">
      {!generated ? (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-purple-900">AI Dashboard Insights</p>
            <p className="text-xs text-purple-500 mt-0.5">
              Powered by Gemini — get an automated health check of your platform snapshot
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <button
              onClick={generate}
              disabled={loading || inCooldown}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Analyzing…
                </>
              ) : inCooldown ? (
                <>⏳ Retry in {fmtSeconds(cooldownMs)}</>
              ) : (
                <>✦ Generate Insights</>
              )}
            </button>
            {inCooldown && (
              <p className="text-xs text-purple-400">API quota temporarily reached</p>
            )}
          </div>
        </div>
      ) : insight && cfg ? (
        <div className={`border rounded-xl p-5 ${cfg.bg}`}>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <span className={`text-lg ${cfg.iconColor}`}>{cfg.icon}</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-900">{insight.headline}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                  {isFallback && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Rule-based
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isFallback ? 'Rule-based Analysis — Gemini quota reached' : 'AI Dashboard Analysis — Gemini'}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setGenerated(false); setInsight(null); setError(null); setIsFallback(false) }}
              className="text-gray-400 hover:text-gray-600 text-xs shrink-0"
            >
              Dismiss
            </button>
          </div>

          {/* Insights list */}
          <ul className="space-y-1.5 mb-4">
            {insight.insights.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="mt-0.5 shrink-0 text-gray-400">→</span>
                {item}
              </li>
            ))}
          </ul>

          {/* Recommendation */}
          <div className="bg-white/70 rounded-lg px-4 py-3 border border-white/80 flex items-start gap-2">
            <span className="text-purple-500 text-sm shrink-0 mt-0.5">★</span>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Top Recommendation</p>
              <p className="text-sm text-gray-800">{insight.recommendation}</p>
            </div>
          </div>

          {/* Refresh */}
          <div className="mt-3 flex justify-end items-center gap-3">
            {isFallback && inCooldown && (
              <p className="text-xs text-amber-500">⏳ AI retry available in {fmtSeconds(cooldownMs)}</p>
            )}
            {isFallback && !inCooldown && (
              <p className="text-xs text-purple-500">AI quota restored —</p>
            )}
            <button
              onClick={generate}
              disabled={loading || (!isFallback && inCooldown)}
              className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Refreshing…' : isFallback ? '✦ Retry with Gemini AI' : '↺ Refresh insights'}
            </button>
          </div>
        </div>
      ) : null}

      {error && !generated && (
        <div className="mt-2 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
