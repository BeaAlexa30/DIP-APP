'use client'

import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface ActionItem {
  priority: 'high' | 'medium' | 'low'
  action: string
  timeline: string
  owner: string
  impact: string
}

interface FullAnalysis {
  descriptive?: {
    summary: string
    totalRespondents?: number
    averageScore?: number
    responseRateNote?: string
    topPerformingArea?: string
    weakestArea?: string
    highlights?: string[]
  }
  diagnostic?: {
    summary: string
    rootCauses?: string[]
    riskAreas?: string[]
    frictionPoints?: string[]
    segmentInsights?: string[]
  }
  predictive?: {
    summary: string
    trendOutlook?: 'improving' | 'stable' | 'declining'
    riskLevel?: 'low' | 'medium' | 'high' | 'critical'
    churnSignals?: string[]
    forecastNotes?: string[]
  }
  prescriptive?: {
    summary: string
    actionPlan?: ActionItem[]
    topImprovements?: string[]
    successMetrics?: string[]
  }
  kpi?: {
    executiveSummary: string
    overallHealth?: number
    meetsGoal?: boolean
    trend?: 'improving' | 'stable' | 'declining'
    urgentAttention?: string
    topImpactArea?: string
    performanceVsBenchmark?: string
  }
}

interface Props {
  aiInsights: {
    summary_text: string | null
    themes_json: unknown
    model_metadata: unknown
  }
  full: FullAnalysis | undefined
  isFallback: boolean
  tabs: { key: string; label: string; icon: string }[]
  scoreRunId: string
}

const priorityColor = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-green-100 text-green-700 border-green-200',
}

const trendIcon = { improving: '↑', stable: '→', declining: '↓' }
const trendColor = { improving: 'text-green-600', stable: 'text-gray-500', declining: 'text-red-500' }
const riskColor = { low: 'text-green-600', medium: 'text-amber-600', high: 'text-orange-600', critical: 'text-red-600' }

export default function AIInsightsPanel({ aiInsights, full, isFallback, tabs, scoreRunId }: Props) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? 'descriptive')

  const themes = Array.isArray(aiInsights.themes_json) ? aiInsights.themes_json as string[] : []

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl overflow-hidden mb-6">
      {/* Header */}
      <div className="px-6 py-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-violet-700 font-semibold text-sm">
              {isFallback ? 'Rule-Based Analysis' : 'AI Analysis'}
            </span>
            <span className="text-xs bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-medium">Non-Scoring</span>
            {isFallback && (
              <span className="text-xs bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-full font-medium">
                Deterministic fallback
              </span>
            )}
            {!isFallback && (
              <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">
                Groq · llama-3.3-70b-versatile
              </span>
            )}
          </div>
          <p className="text-xs text-violet-400 mt-0.5">5-dimensional analysis: Descriptive · Diagnostic · Predictive · Prescriptive · KPI</p>
        </div>
      </div>

      {/* Executive summary + themes */}
      {aiInsights.summary_text && (
        <div className="px-6 pb-4">
          <p className="text-sm text-gray-700 leading-relaxed">{aiInsights.summary_text}</p>
          {themes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {themes.map((theme, i) => (
                <span key={i} className="text-xs bg-white border border-violet-200 text-violet-700 px-3 py-1 rounded-full">
                  {theme}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs — only show if full analysis is available */}
      {full && (
        <>
          <div className="flex border-t border-violet-200 border-b bg-white/40 overflow-x-auto">
            {tabs.map(tab => (
              <Button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                variant="ghost"
                size="sm"
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-none whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key
                    ? 'border-violet-500 text-violet-700 bg-white/60'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/20'
                  }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="p-6">
            {/* 1. Descriptive */}
            {activeTab === 'descriptive' && full.descriptive && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700 leading-relaxed">{full.descriptive.summary}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-violet-100">
                    <p className="text-xs text-gray-400">Total Respondents</p>
                    <p className="text-xl font-bold text-violet-700 mt-0.5">{full.descriptive.totalRespondents ?? '—'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-violet-100">
                    <p className="text-xs text-gray-400">Avg Score</p>
                    <p className="text-xl font-bold text-violet-700 mt-0.5">{full.descriptive.averageScore != null ? `${full.descriptive.averageScore}/100` : '—'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-violet-100 col-span-2">
                    <p className="text-xs text-gray-400">Sample Confidence</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{full.descriptive.responseRateNote ?? '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <p className="text-xs text-gray-400 mb-1">🏆 Top Performing Area</p>
                    <p className="text-sm font-semibold text-green-700">{full.descriptive.topPerformingArea ?? '—'}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-red-100">
                    <p className="text-xs text-gray-400 mb-1">⚠ Weakest Area</p>
                    <p className="text-sm font-semibold text-red-700">{full.descriptive.weakestArea ?? '—'}</p>
                  </div>
                </div>
                {full.descriptive.highlights && full.descriptive.highlights.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Data Highlights</p>
                    <ul className="space-y-1.5">
                      {full.descriptive.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="shrink-0 text-violet-400 mt-0.5">→</span>{h}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 2. Diagnostic */}
            {activeTab === 'diagnostic' && full.diagnostic && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700 leading-relaxed">{full.diagnostic.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {full.diagnostic.rootCauses && full.diagnostic.rootCauses.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Root Causes</p>
                      <ul className="space-y-1.5">
                        {full.diagnostic.rootCauses.map((c, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="shrink-0 text-red-400 mt-0.5">▸</span>{c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {full.diagnostic.frictionPoints && full.diagnostic.frictionPoints.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Friction Points</p>
                      <ul className="space-y-1.5">
                        {full.diagnostic.frictionPoints.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="shrink-0 text-amber-400 mt-0.5">⚡</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {full.diagnostic.riskAreas && full.diagnostic.riskAreas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Risk Areas</p>
                      <ul className="space-y-1.5">
                        {full.diagnostic.riskAreas.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="shrink-0 text-orange-400 mt-0.5">●</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {full.diagnostic.segmentInsights && full.diagnostic.segmentInsights.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Segment Insights</p>
                      <ul className="space-y-1.5">
                        {full.diagnostic.segmentInsights.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="shrink-0 text-blue-400 mt-0.5">◈</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. Predictive */}
            {activeTab === 'predictive' && full.predictive && (
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <p className="text-sm text-gray-700 leading-relaxed flex-1">{full.predictive.summary}</p>
                  <div className="shrink-0 flex gap-3">
                    {full.predictive.trendOutlook && (
                      <div className="bg-white rounded-lg p-3 border border-violet-100 text-center min-w-16">
                        <p className={`text-2xl font-bold ${trendColor[full.predictive.trendOutlook]}`}>
                          {trendIcon[full.predictive.trendOutlook]}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{full.predictive.trendOutlook}</p>
                      </div>
                    )}
                    {full.predictive.riskLevel && (
                      <div className="bg-white rounded-lg p-3 border border-violet-100 text-center min-w-16">
                        <p className={`text-sm font-bold capitalize ${riskColor[full.predictive.riskLevel]}`}>
                          {full.predictive.riskLevel}
                        </p>
                        <p className="text-xs text-gray-400">Risk</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {full.predictive.churnSignals && full.predictive.churnSignals.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Churn / Retention Signals</p>
                      <ul className="space-y-1.5">
                        {full.predictive.churnSignals.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="shrink-0 text-red-400 mt-0.5">⚠</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {full.predictive.forecastNotes && full.predictive.forecastNotes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Forecast Notes</p>
                      <ul className="space-y-1.5">
                        {full.predictive.forecastNotes.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="shrink-0 text-blue-400 mt-0.5">→</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Prescriptive */}
            {activeTab === 'prescriptive' && full.prescriptive && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700 leading-relaxed">{full.prescriptive.summary}</p>
                {full.prescriptive.actionPlan && full.prescriptive.actionPlan.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Action Plan</p>
                    <div className="space-y-2">
                      {full.prescriptive.actionPlan.map((item, i) => (
                        <div key={i} className="bg-white rounded-lg p-4 border border-violet-100">
                          <div className="flex items-start gap-3">
                            <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${priorityColor[item.priority] ?? priorityColor.medium}`}>
                              {item.priority}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{item.action}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                                <span>⏱ {item.timeline}</span>
                                <span>👤 {item.owner}</span>
                                {item.impact && <span>📈 {item.impact}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {full.prescriptive.successMetrics && full.prescriptive.successMetrics.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Success Metrics</p>
                    <ul className="space-y-1.5">
                      {full.prescriptive.successMetrics.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="shrink-0 text-green-500 mt-0.5">✓</span>{m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* 5. KPI */}
            {activeTab === 'kpi' && full.kpi && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700 leading-relaxed">{full.kpi.executiveSummary}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-violet-100">
                    <p className="text-xs text-gray-400">Health Score</p>
                    <p className={`text-2xl font-bold mt-0.5 ${(full.kpi.overallHealth ?? 0) >= 70 ? 'text-green-600' : (full.kpi.overallHealth ?? 0) >= 50 ? 'text-amber-500' : 'text-red-600'}`}>
                      {full.kpi.overallHealth?.toFixed(0) ?? '—'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-violet-100">
                    <p className="text-xs text-gray-400">Meeting Goal?</p>
                    <p className={`text-sm font-bold mt-1 ${full.kpi.meetsGoal ? 'text-green-600' : 'text-red-600'}`}>
                      {full.kpi.meetsGoal ? '✓ Yes' : '✗ Not yet'}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-violet-100">
                    <p className="text-xs text-gray-400">Trend</p>
                    {full.kpi.trend && (
                      <p className={`text-lg font-bold mt-0.5 ${trendColor[full.kpi.trend]}`}>
                        {trendIcon[full.kpi.trend]} <span className="text-sm capitalize">{full.kpi.trend}</span>
                      </p>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-violet-100">
                    <p className="text-xs text-gray-400">Top Impact Area</p>
                    <p className="text-sm font-medium text-gray-800 mt-0.5">{full.kpi.topImpactArea ?? '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                    <p className="text-xs text-gray-500 mb-1">🚨 Urgent Attention</p>
                    <p className="text-sm font-medium text-red-800">{full.kpi.urgentAttention ?? '—'}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <p className="text-xs text-gray-500 mb-1">📊 vs Benchmark</p>
                    <p className="text-sm font-medium text-green-800">{full.kpi.performanceVsBenchmark ?? '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
