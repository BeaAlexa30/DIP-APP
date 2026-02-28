/**
 * AI Insights Generator — Groq Edition
 * ============================================================
 * IMPORTANT: AI is used strictly for:
 *   1. Response summarization (themes)
 *   2. Insight extraction from computed results
 *
 * AI NEVER affects: scoring, weights, normalization, or rankings.
 * All AI output is labeled "AI Summary (Non-Scoring)".
 *
 * Analytical dimensions covered:
 *   1. Descriptive  — What is happening?
 *   2. Diagnostic   — Why is it happening?
 *   3. Predictive   — What might happen?
 *   4. Prescriptive — What should we do?
 *   5. KPI-Based    — Executive view
 */

import Groq from 'groq-sdk'
import type { ScoringResult } from '@/lib/scoring/AssessmentScoringEngine'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL_NAME = 'llama-3.3-70b-versatile'

// ── Output interface ──────────────────────────────────────────────────────────

export interface ActionItem {
  priority: 'high' | 'medium' | 'low'
  action: string
  timeline: string
  owner: string
  impact: string
}

export interface AIInsightOutput {
  // Executive headline (backward-compat)
  summaryText: string
  themes: string[]

  // 1. Descriptive — What is happening?
  descriptive: {
    summary: string
    totalRespondents: number
    averageScore: number
    responseRateNote: string
    topPerformingArea: string
    weakestArea: string
    highlights: string[]
  }

  // 2. Diagnostic — Why is it happening?
  diagnostic: {
    summary: string
    rootCauses: string[]
    riskAreas: string[]
    frictionPoints: string[]
    segmentInsights: string[]
  }

  // 3. Predictive — What might happen?
  predictive: {
    summary: string
    trendOutlook: 'improving' | 'stable' | 'declining'
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    churnSignals: string[]
    forecastNotes: string[]
  }

  // 4. Prescriptive — What should we do?
  prescriptive: {
    summary: string
    actionPlan: ActionItem[]
    topImprovements: string[]
    successMetrics: string[]
  }

  // 5. KPI-Based — Executive view
  kpi: {
    executiveSummary: string
    overallHealth: number
    meetsGoal: boolean
    trend: 'improving' | 'stable' | 'declining'
    urgentAttention: string
    topImpactArea: string
    performanceVsBenchmark: string
  }

  modelMetadata: {
    model: string
    generatedAt: string
    isFallback?: boolean
  }
}

// ── Main generator ─────────────────────────────────────────────────────────────

export async function generateAIInsights(scoring: ScoringResult): Promise<AIInsightOutput> {
  const categorySummary = scoring.categoryScores
    .sort((a, b) => b.normalizedScore - a.normalizedScore)
    .map(c => `  ${c.categoryName}: ${(c.normalizedScore * 100).toFixed(1)}/100`)
    .join('\n')

  const indexSummary = scoring.indexScores.map(
    is => `  ${is.label}: ${is.score0100.toFixed(1)}/100 (${is.higherIsBetter ? 'higher=better' : 'higher=worse'})`
  ).join('\n')

  const topIssues = scoring.issueRankings.slice(0, 5).map(
    ir => `  • ${ir.driverTag.replace(/_/g, ' ')} — priority: ${ir.priorityScore.toFixed(2)}, risk: ${ir.risk.toFixed(1)}%, friction: ${ir.friction.toFixed(1)}%, frequency: ${ir.frequency.toFixed(1)}%`
  ).join('\n')

  const avgCatScore = scoring.categoryScores.length > 0
    ? scoring.categoryScores.reduce((s, c) => s + c.normalizedScore * 100, 0) / scoring.categoryScores.length
    : scoring.healthScore

  const prompt = `You are a senior Decision Intelligence analyst. Analyze the following survey data for ${scoring.responseCount} respondents and produce a thorough multi-dimensional report.

=== DATA SNAPSHOT ===
Executive Health Score: ${scoring.healthScore.toFixed(1)}/100
Total Respondents: ${scoring.responseCount}
Average Category Score: ${avgCatScore.toFixed(1)}/100

CATEGORY SCORES (normalized 0–100):
${categorySummary || '  (no category scores available)'}

PERFORMANCE INDEXES:
${indexSummary || '  (no index scores available)'}

TOP PRIORITY ISSUES (ranked by composite priority):
${topIssues || '  (no issues ranked)'}
=== END DATA ===

Provide a thorough analysis across ALL FIVE dimensions below. Be specific, data-driven, and actionable.

Respond with ONLY valid JSON (no markdown fences) matching this exact structure:
{
  "summaryText": "<3-4 sentence executive summary>",
  "themes": ["<theme1>", "<theme2>", "<theme3>"],

  "descriptive": {
    "summary": "<2-3 sentences: what is happening in the data>",
    "totalRespondents": ${scoring.responseCount},
    "averageScore": ${avgCatScore.toFixed(1)},
    "responseRateNote": "<note on whether response count gives statistical confidence>",
    "topPerformingArea": "<best category or index>",
    "weakestArea": "<worst category or index>",
    "highlights": ["<specific data highlight 1>", "<highlight 2>", "<highlight 3>"]
  },

  "diagnostic": {
    "summary": "<2-3 sentences: why things are the way they are>",
    "rootCauses": ["<cause1>", "<cause2>", "<cause3>"],
    "riskAreas": ["<risk area 1>", "<risk area 2>"],
    "frictionPoints": ["<friction 1>", "<friction 2>"],
    "segmentInsights": ["<insight about segments or correlations>", "<another>"]
  },

  "predictive": {
    "summary": "<2 sentences: what might happen if nothing changes>",
    "trendOutlook": "improving|stable|declining",
    "riskLevel": "low|medium|high|critical",
    "churnSignals": ["<signal 1>", "<signal 2>"],
    "forecastNotes": ["<forecast note 1>", "<forecast note 2>"]
  },

  "prescriptive": {
    "summary": "<2 sentences: what should be done>",
    "actionPlan": [
      { "priority": "high", "action": "<specific action>", "timeline": "30 days", "owner": "<suggested role>", "impact": "<expected outcome>" },
      { "priority": "high", "action": "<action>", "timeline": "30 days", "owner": "<role>", "impact": "<outcome>" },
      { "priority": "medium", "action": "<action>", "timeline": "60 days", "owner": "<role>", "impact": "<outcome>" },
      { "priority": "medium", "action": "<action>", "timeline": "60 days", "owner": "<role>", "impact": "<outcome>" },
      { "priority": "low", "action": "<action>", "timeline": "90 days", "owner": "<role>", "impact": "<outcome>" }
    ],
    "topImprovements": ["<top improvement 1>", "<top improvement 2>", "<top improvement 3>"],
    "successMetrics": ["<metric 1>", "<metric 2>", "<metric 3>"]
  },

  "kpi": {
    "executiveSummary": "<1-2 sentence exec summary for decision makers>",
    "overallHealth": ${scoring.healthScore.toFixed(1)},
    "meetsGoal": ${scoring.healthScore >= 70},
    "trend": "improving|stable|declining",
    "urgentAttention": "<single most urgent item>",
    "topImpactArea": "<the area with greatest impact on overall health>",
    "performanceVsBenchmark": "<comparison vs industry average or internal target>"
  }
}`

  try {
    const completion = await groq.chat.completions.create({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2500,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)

    return {
      summaryText: parsed.summaryText ?? 'No summary generated.',
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
      descriptive: parsed.descriptive ?? buildFallbackDescriptive(scoring, avgCatScore),
      diagnostic: parsed.diagnostic ?? buildFallbackDiagnostic(scoring),
      predictive: parsed.predictive ?? buildFallbackPredictive(scoring),
      prescriptive: parsed.prescriptive ?? buildFallbackPrescriptive(scoring),
      kpi: parsed.kpi ?? buildFallbackKpi(scoring),
      modelMetadata: {
        model: MODEL_NAME,
        generatedAt: new Date().toISOString(),
      },
    }
  } catch (err: any) {
    console.error('[IntelligenceAnalyticsProcessor] Groq error:', err.message)
    throw err
  }
}

// ── Deterministic fallback builders ───────────────────────────────────────────

function buildFallbackDescriptive(scoring: ScoringResult, avgScore: number) {
  const sorted = [...scoring.categoryScores].sort((a, b) => b.normalizedScore - a.normalizedScore)
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  return {
    summary: `Based on ${scoring.responseCount} respondents, the overall health score is ${scoring.healthScore.toFixed(1)}/100 with an average category score of ${avgScore.toFixed(1)}/100.`,
    totalRespondents: scoring.responseCount,
    averageScore: parseFloat(avgScore.toFixed(1)),
    responseRateNote: scoring.responseCount >= 30 ? 'Sufficient sample for statistical confidence.' : 'Sample size may be small — interpret trends with caution.',
    topPerformingArea: best ? `${best.categoryName} (${(best.normalizedScore * 100).toFixed(1)}/100)` : 'N/A',
    weakestArea: worst && worst.normalizedScore < 0.8 ? `${worst.categoryName} (${(worst.normalizedScore * 100).toFixed(1)}/100)` : 'No critical weakness',
    highlights: [
      `Executive Health Score: ${scoring.healthScore.toFixed(1)}/100`,
      best ? `Strongest: ${best.categoryName}` : 'No category data',
      worst ? `Needs focus: ${worst.categoryName}` : 'All categories performing well',
    ],
  }
}

function buildFallbackDiagnostic(scoring: ScoringResult) {
  const topIssue = scoring.issueRankings[0]
  const convRisk = scoring.indexScores.find(i => i.indexKey === 'conversion_risk')
  return {
    summary: topIssue
      ? `The primary driver of underperformance is "${topIssue.driverTag.replace(/_/g, ' ')}" with risk ${topIssue.risk.toFixed(1)}% and friction ${topIssue.friction.toFixed(1)}%.`
      : 'Insufficient issue data to determine root causes.',
    rootCauses: scoring.issueRankings.slice(0, 3).map(i => i.driverTag.replace(/_/g, ' ')),
    riskAreas: scoring.issueRankings.filter(i => i.risk > 30).slice(0, 2).map(i => i.driverTag.replace(/_/g, ' ')),
    frictionPoints: scoring.issueRankings.filter(i => i.friction > 30).slice(0, 2).map(i => i.driverTag.replace(/_/g, ' ')),
    segmentInsights: [
      convRisk && convRisk.score0100 > 50 ? `Conversion risk is elevated at ${convRisk.score0100.toFixed(1)}/100` : 'Conversion risk within acceptable range',
      `${scoring.responseCount} response${scoring.responseCount !== 1 ? 's' : ''} analyzed`,
    ],
  }
}

function buildFallbackPredictive(scoring: ScoringResult) {
  const hs = scoring.healthScore
  const outlook: 'improving' | 'stable' | 'declining' = hs >= 70 ? 'stable' : hs >= 50 ? 'stable' : 'declining'
  const risk: 'low' | 'medium' | 'high' | 'critical' = hs >= 75 ? 'low' : hs >= 60 ? 'medium' : hs >= 40 ? 'high' : 'critical'
  return {
    summary: `With a health score of ${hs.toFixed(1)}/100 the outlook is ${outlook}. ${hs < 60 ? 'Without intervention, scores may decline further.' : 'Maintaining current efforts should sustain performance.'}`,
    trendOutlook: outlook,
    riskLevel: risk,
    churnSignals: hs < 60 ? ['Low trust index', 'High friction in key areas'] : ['No major churn signals detected'],
    forecastNotes: [
      hs >= 70 ? 'Performance is likely to remain stable.' : 'Addressing top issues could improve health score by 10–15 points.',
      scoring.responseCount < 20 ? 'More responses needed for reliable forecasting.' : 'Sample is adequate for trend analysis.',
    ],
  }
}

function buildFallbackPrescriptive(scoring: ScoringResult) {
  const topIssues = scoring.issueRankings.slice(0, 5)
  const actionPlan: ActionItem[] = topIssues.map((issue, idx) => ({
    priority: idx < 2 ? 'high' : idx < 4 ? 'medium' : 'low',
    action: `Address "${issue.driverTag.replace(/_/g, ' ')}" — reduce risk and friction`,
    timeline: idx < 2 ? '30 days' : idx < 4 ? '60 days' : '90 days',
    owner: 'CX / Operations Team',
    impact: `Estimated priority score reduction from ${issue.priorityScore.toFixed(2)}`,
  }))
  return {
    summary: 'Focus on the top-ranked issues to achieve the greatest improvement in executive health score.',
    actionPlan,
    topImprovements: topIssues.slice(0, 3).map(i => i.driverTag.replace(/_/g, ' ')),
    successMetrics: ['Executive Health Score ≥ 75', 'Top issue priority scores reduced by 20%', 'Collect additional survey responses for trend validation'],
  }
}

function buildFallbackKpi(scoring: ScoringResult) {
  const worst = [...scoring.indexScores].filter(i => i.higherIsBetter).sort((a, b) => a.score0100 - b.score0100)[0]
  return {
    executiveSummary: `Health score ${scoring.healthScore.toFixed(1)}/100 based on ${scoring.responseCount} response${scoring.responseCount !== 1 ? 's' : ''}. ${scoring.healthScore >= 70 ? 'Performance is on track.' : 'Improvement needed to meet target.'}`,
    overallHealth: parseFloat(scoring.healthScore.toFixed(1)),
    meetsGoal: scoring.healthScore >= 70,
    trend: 'stable' as const,
    urgentAttention: scoring.issueRankings[0]?.driverTag.replace(/_/g, ' ') ?? 'No critical issues',
    topImpactArea: worst?.label ?? 'N/A',
    performanceVsBenchmark: scoring.healthScore >= 75 ? 'Above typical benchmark (70/100)' : scoring.healthScore >= 60 ? 'Near benchmark — close the gap' : 'Below benchmark — immediate action required',
  }
}

export function generateFallbackInsights(scoring: ScoringResult): AIInsightOutput {
  const avgCatScore = scoring.categoryScores.length > 0
    ? scoring.categoryScores.reduce((s, c) => s + c.normalizedScore * 100, 0) / scoring.categoryScores.length
    : scoring.healthScore
  const hs = scoring.healthScore
  const hsLabel = hs >= 75 ? 'healthy' : hs >= 50 ? 'needs attention' : 'at risk'
  const topIssue = scoring.issueRankings[0]
  const worstIndex = scoring.indexScores.filter(i => i.higherIsBetter).sort((a, b) => a.score0100 - b.score0100)[0]
  const bestIndex = scoring.indexScores.filter(i => i.higherIsBetter).sort((a, b) => b.score0100 - a.score0100)[0]
  const summaryText =
    `With an Executive Health Score of ${hs.toFixed(1)}/100, this project is ${hsLabel} based on ${scoring.responseCount} response${scoring.responseCount !== 1 ? 's' : ''}. ` +
    (bestIndex ? `Strongest dimension: ${bestIndex.label} at ${bestIndex.score0100.toFixed(1)}/100. ` : '') +
    (worstIndex && worstIndex.score0100 < 80 ? `${worstIndex.label} needs attention at ${worstIndex.score0100.toFixed(1)}/100. ` : '') +
    (topIssue ? `Highest-priority issue: "${topIssue.driverTag.replace(/_/g, ' ')}" — recommend immediate investigation.` : '')
  const themes: string[] = []
  if (topIssue) themes.push(`Address ${topIssue.driverTag.replace(/_/g, ' ')} urgently`)
  if (worstIndex && worstIndex.score0100 < 80) themes.push(`Improve ${worstIndex.label.toLowerCase()}`)
  if (hs < 75) themes.push('Prioritise CX improvements before next cycle')
  if (scoring.responseCount < 10) themes.push('Collect more responses for statistical confidence')
  if (themes.length === 0) themes.push('Maintain current performance standards')
  return {
    summaryText,
    themes,
    descriptive: buildFallbackDescriptive(scoring, avgCatScore),
    diagnostic: buildFallbackDiagnostic(scoring),
    predictive: buildFallbackPredictive(scoring),
    prescriptive: buildFallbackPrescriptive(scoring),
    kpi: buildFallbackKpi(scoring),
    modelMetadata: {
      model: 'deterministic-fallback',
      generatedAt: new Date().toISOString(),
      isFallback: true,
    },
  }
}
