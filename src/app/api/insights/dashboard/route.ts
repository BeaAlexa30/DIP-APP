import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
const MODEL_NAME = 'llama-3.3-70b-versatile'

// ── Server-side in-memory cache (15-min TTL) ─────────────────
const CACHE_TTL_MS = 15 * 60 * 1000
interface CacheEntry { data: any; expiresAt: number }
const insightCache = new Map<string, CacheEntry>()

function cacheKey(body: Record<string, unknown>): string {
  return JSON.stringify(body, Object.keys(body).sort())
}

export interface DashboardInsightPayload {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  draftProjects: number
  archivedProjects: number
  activeSurveys: number
  totalSurveys: number
  frameworkPacks: number
  totalResponses?: number
  avgHealthScore?: number
  recentResponsesCount?: number
}

export interface DashboardInsightData {
  headline: string
  healthSignal: 'good' | 'warning' | 'critical'

  // 1. Descriptive — What is happening?
  descriptive: {
    summary: string
    highlights: string[]
  }

  // 2. Diagnostic — Why is it happening?
  diagnostic: {
    summary: string
    rootCauses: string[]
  }

  // 3. Predictive — What might happen?
  predictive: {
    summary: string
    trendOutlook: 'improving' | 'stable' | 'declining'
    risks: string[]
  }

  // 4. Prescriptive — What should we do?
  prescriptive: {
    summary: string
    topActions: string[]
  }

  // 5. KPI-Based — Executive view
  kpi: {
    summary: string
    meetsGoal: boolean
    urgentAttention: string
    winToHighlight: string
  }

  // Legacy single recommendation (backward compat)
  recommendation: string
  insights: string[]
}

// ── Deterministic fallback ─────────────────────────────────────────────────
function computeLocalInsights(p: DashboardInsightPayload): DashboardInsightData {
  const completionRate = p.totalProjects > 0 ? (p.completedProjects / p.totalProjects) * 100 : 0
  const draftRate      = p.totalProjects > 0 ? (p.draftProjects      / p.totalProjects) * 100 : 0
  const surveyRate     = p.totalSurveys  > 0 ? (p.activeSurveys      / p.totalSurveys)  * 100 : 0

  let signal: 'good' | 'warning' | 'critical' = 'good'
  const insights: string[] = []

  if (p.totalProjects === 0) { insights.push('No projects created yet.'); signal = 'warning' }
  else insights.push(`${p.totalProjects} projects: ${p.activeProjects} active, ${p.completedProjects} completed, ${p.draftProjects} draft.`)
  if (completionRate >= 60) insights.push(`Strong completion rate: ${completionRate.toFixed(0)}%.`)
  else if (completionRate > 0) { insights.push(`Completion rate: ${completionRate.toFixed(0)}% — room to improve.`); if (signal === 'good') signal = 'warning' }
  if (p.activeSurveys === 0) { insights.push('No surveys published yet.'); if (signal === 'good') signal = 'warning' }
  else insights.push(`${p.activeSurveys}/${p.totalSurveys} surveys published (${surveyRate.toFixed(0)}%).`)
  if (p.frameworkPacks === 0) { insights.push('No active framework packs.'); signal = 'critical' }

  return {
    headline: signal === 'critical' ? 'Platform needs attention.' : signal === 'warning' ? `Platform running with ${p.activeProjects} active projects — items to address.` : `Platform healthy: ${p.totalProjects} projects, ${p.frameworkPacks} framework packs.`,
    healthSignal: signal,
    descriptive: {
      summary: `${p.totalProjects} total projects, ${p.activeSurveys} active surveys, ${p.frameworkPacks} framework packs.`,
      highlights: insights.slice(0, 3),
    },
    diagnostic: {
      summary: draftRate > 40 ? 'High draft backlog may indicate process bottlenecks.' : 'Project pipeline is moving at a reasonable pace.',
      rootCauses: draftRate > 40 ? ['High draft backlog', 'Projects not being activated'] : ['No critical issues identified'],
    },
    predictive: {
      summary: signal === 'critical' ? 'Without framework packs, no assessments can run.' : 'Current trajectory looks stable.',
      trendOutlook: signal === 'good' ? 'stable' : 'declining',
      risks: p.frameworkPacks === 0 ? ['No assessments possible without framework packs'] : [],
    },
    prescriptive: {
      summary: 'Focus on activating surveys and moving projects to completion.',
      topActions: [
        p.frameworkPacks === 0 ? 'Activate a framework pack' : 'Expand framework coverage',
        p.activeSurveys === 0 ? 'Publish at least one survey' : 'Review unpublished surveys',
        draftRate > 40 ? 'Clear draft backlog' : 'Maintain current project pace',
      ],
    },
    kpi: {
      summary: `Completion rate: ${completionRate.toFixed(0)}%. Survey engagement: ${surveyRate.toFixed(0)}%.`,
      meetsGoal: completionRate >= 50 && p.frameworkPacks > 0,
      urgentAttention: p.frameworkPacks === 0 ? 'Activate framework packs' : p.activeSurveys === 0 ? 'Publish surveys' : 'None',
      winToHighlight: p.completedProjects > 0 ? `${p.completedProjects} project${p.completedProjects !== 1 ? 's' : ''} completed` : 'Platform is set up and ready',
    },
    recommendation: p.frameworkPacks === 0 ? 'Activate a framework pack to enable assessments.' : p.activeSurveys === 0 ? 'Publish a survey to collect responses.' : draftRate > 40 ? 'Review and activate draft projects.' : 'Keep maintaining active surveys.',
    insights: insights.slice(0, 3),
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: DashboardInsightPayload = await req.json()

    // ── Cache hit? ────────────────────────────────────────────
    const key = cacheKey(body as unknown as Record<string, unknown>)
    const cached = insightCache.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ ok: true, data: cached.data, fromCache: true })
    }

    const completionRate = body.totalProjects > 0
      ? ((body.completedProjects / body.totalProjects) * 100).toFixed(1)
      : '0'
    const surveyEngagement = body.totalSurveys > 0
      ? ((body.activeSurveys / body.totalSurveys) * 100).toFixed(1)
      : '0'

    const prompt = `You are a Decision Intelligence Platform analyst. Analyze this platform snapshot and produce a thorough 5-dimensional report.

PLATFORM SNAPSHOT:
- Total Projects: ${body.totalProjects} (Active: ${body.activeProjects}, Completed: ${body.completedProjects}, Draft: ${body.draftProjects}, Archived: ${body.archivedProjects})
- Project Completion Rate: ${completionRate}%
- Active Surveys: ${body.activeSurveys} of ${body.totalSurveys} total (${surveyEngagement}% published)
- Framework Packs Available: ${body.frameworkPacks}
- Total Survey Responses: ${body.totalResponses ?? 'unknown'}
- Average Health Score: ${body.avgHealthScore !== undefined ? body.avgHealthScore.toFixed(1) + '/100' : 'not yet scored'}
- Recent Responses (last 30 days): ${body.recentResponsesCount ?? 'unknown'}

Provide a comprehensive analysis across all 5 dimensions. Be specific and actionable.

Respond with ONLY valid JSON (no markdown fences) matching this exact structure:
{
  "headline": "<one-sentence platform health summary>",
  "healthSignal": "good|warning|critical",

  "descriptive": {
    "summary": "<2 sentences: what the data shows>",
    "highlights": ["<specific data point 1>", "<data point 2>", "<data point 3>"]
  },

  "diagnostic": {
    "summary": "<2 sentences: why metrics are at these levels>",
    "rootCauses": ["<cause 1>", "<cause 2>", "<cause 3>"]
  },

  "predictive": {
    "summary": "<2 sentences: what might happen if no changes made>",
    "trendOutlook": "improving|stable|declining",
    "risks": ["<risk 1>", "<risk 2>"]
  },

  "prescriptive": {
    "summary": "<2 sentences: recommended course of action>",
    "topActions": ["<action 1>", "<action 2>", "<action 3>"]
  },

  "kpi": {
    "summary": "<1-2 sentence KPI summary for decision makers>",
    "meetsGoal": true|false,
    "urgentAttention": "<single most urgent item or 'None'>",
    "winToHighlight": "<one positive metric to celebrate>"
  },

  "recommendation": "<single most important action>",
  "insights": ["<key insight 1>", "<key insight 2>", "<key insight 3>"]
}`

    const completion = await groq.chat.completions.create({
      model: MODEL_NAME,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as DashboardInsightData

    // Ensure required fields exist
    parsed.insights = Array.isArray(parsed.insights) ? parsed.insights : []
    parsed.healthSignal = (['good', 'warning', 'critical'] as const).includes(parsed.healthSignal) ? parsed.healthSignal : 'warning'

    insightCache.set(key, { data: parsed, expiresAt: Date.now() + CACHE_TTL_MS })
    return NextResponse.json({ ok: true, data: parsed, fromCache: false })
  } catch (err: any) {
    console.error('[DashboardInsights] Groq error:', err.message)
    // Fallback to rule-based — parse body again safely
    try {
      const body: DashboardInsightPayload = await req.json().catch(() => ({}) as DashboardInsightPayload)
      const fallback = computeLocalInsights(body)
      return NextResponse.json({ ok: true, data: fallback, fromCache: false, isFallback: true })
    } catch {
      return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
    }
  }
}
