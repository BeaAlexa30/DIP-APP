/**
 * AI Insights Generator
 * ============================================================
 * IMPORTANT: AI is used strictly for:
 *   1. Response summarization (themes)
 *   2. Insight extraction from computed results
 *
 * AI NEVER affects: scoring, weights, normalization, or rankings.
 * All AI output is labeled "AI Summary (Non-Scoring)".
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ScoringResult } from '@/lib/scoring/AssessmentScoringEngine'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const MODEL_NAME = 'gemini-2.0-flash-lite'

export interface AIInsightOutput {
  summaryText: string
  themes: string[]
  rootCauses?: string[]
  actionPlan?: {
    priority: 'high' | 'medium' | 'low'
    action: string
    timeline: string
    owner: string
  }[]
  successMetrics?: string[]
  riskLevel?: 'low' | 'medium' | 'high' | 'critical'
  modelMetadata: {
    model: string
    promptTokens: number
    completionTokens: number
    generatedAt: string
  }
}

export async function generateAIInsights(scoring: ScoringResult, responseData?: any): Promise<AIInsightOutput> {
  const topIssues = scoring.issueRankings.slice(0, 5).map(
    ir => `${ir.driverTag} (priority: ${ir.priorityScore.toFixed(1)}, risk: ${ir.risk.toFixed(1)}%, friction: ${ir.friction.toFixed(1)}%)`
  ).join('\n')

  const indexSummary = scoring.indexScores.map(
    is => `${is.label}: ${is.score0100.toFixed(1)}/100 (${is.higherIsBetter ? 'higher=better' : 'higher=worse'})`
  ).join('\n')

  // Enhanced prompt with recommendations and next steps
  const prompt = `You are a senior CX consultant analyzing decision intelligence data for ${scoring.responseCount} customer responses.

EXECUTIVE HEALTH: ${scoring.healthScore.toFixed(1)}/100

PERFORMANCE INDEXES:
${indexSummary}

TOP PRIORITY ISSUES (ranked by impact):
${topIssues}

Your expertise should provide:
1. **Executive Summary** (3-4 sentences): Key findings and business impact
2. **Root Cause Analysis**: What's driving the top issues?
3. **Action Plan**: 3-5 specific, prioritized recommendations
4. **Success Metrics**: How to measure improvement
5. **Timeline**: Suggested implementation phases (30/60/90 days)

Respond in JSON format:
{
  "summary": "<executive summary>",
  "themes": ["theme1", "theme2", "theme3"],
  "rootCauses": ["cause1", "cause2"],
  "actionPlan": [
    {
      "priority": "high|medium|low",
      "action": "specific recommendation", 
      "timeline": "30|60|90 days",
      "owner": "suggested role/dept"
    }
  ],
  "successMetrics": ["metric1", "metric2"],
  "riskLevel": "low|medium|high|critical"
}`

  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 600,
      },
    })

    const result = await model.generateContent(prompt)
    const raw = result.response.text()

    // Extract JSON — model may wrap it in ```json ... ``` fences
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`Could not parse AI response as JSON. Raw: ${raw.slice(0, 200)}`)
    const parsed = JSON.parse(jsonMatch[0])

    const usage = result.response.usageMetadata

    return {
      summaryText: parsed.summary ?? 'No summary generated.',
      themes: Array.isArray(parsed.themes) ? parsed.themes : [],
      rootCauses: Array.isArray(parsed.rootCauses) ? parsed.rootCauses : [],
      actionPlan: Array.isArray(parsed.actionPlan) ? parsed.actionPlan : [],
      successMetrics: Array.isArray(parsed.successMetrics) ? parsed.successMetrics : [],
      riskLevel: parsed.riskLevel ?? 'medium',
      modelMetadata: {
        model: MODEL_NAME,
        promptTokens: usage?.promptTokenCount ?? 0,
        completionTokens: usage?.candidatesTokenCount ?? 0,
        generatedAt: new Date().toISOString(),
      },
    }
  } catch (err: any) {
    const isQuota = err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('Too Many Requests')
    if (!isQuota) throw err

    // ── Deterministic fallback when AI quota is exhausted ──────────────
    return generateFallbackInsights(scoring)
  }
}

function generateFallbackInsights(scoring: ScoringResult): AIInsightOutput {
  const hs = scoring.healthScore
  const hsLabel = hs >= 75 ? 'healthy' : hs >= 50 ? 'needs attention' : 'at risk'

  const topIssue = scoring.issueRankings[0]
  const worstIndex = scoring.indexScores
    .filter(i => i.higherIsBetter)
    .sort((a, b) => a.score0100 - b.score0100)[0]
  const bestIndex = scoring.indexScores
    .filter(i => i.higherIsBetter)
    .sort((a, b) => b.score0100 - a.score0100)[0]
  const convRisk = scoring.indexScores.find(i => i.indexKey === 'conversion_risk')

  const summary =
    `With an Executive Health Score of ${hs.toFixed(1)}/100, this project is ${hsLabel} based on ${scoring.responseCount} response${scoring.responseCount !== 1 ? 's' : ''}. ` +
    (bestIndex ? `The strongest area is ${bestIndex.label} at ${bestIndex.score0100.toFixed(1)}/100. ` : '') +
    (worstIndex && worstIndex.score0100 < 80 ? `${worstIndex.label} scored lowest at ${worstIndex.score0100.toFixed(1)}/100 and warrants review. ` : '') +
    (topIssue ? `The highest-priority issue is "${topIssue.driverTag.replace(/_/g, ' ')}" with a priority score of ${topIssue.priorityScore.toFixed(2)} — recommend immediate investigation.` : '') +
    (convRisk && convRisk.score0100 > 50 ? ` Conversion risk is elevated at ${convRisk.score0100.toFixed(1)}/100, suggesting friction in the customer journey.` : '')

  const themes: string[] = []
  if (topIssue) themes.push(`Address ${topIssue.driverTag.replace(/_/g, ' ')} urgently`)
  if (worstIndex && worstIndex.score0100 < 80) themes.push(`Improve ${worstIndex.label.toLowerCase()}`)
  if (convRisk && convRisk.score0100 > 50) themes.push('Reduce conversion friction')
  if (hs < 75) themes.push('Prioritise CX improvements before next cycle')
  if (scoring.responseCount < 10) themes.push('Collect more responses for statistical confidence')
  if (themes.length === 0) themes.push('Maintain current performance standards')

  return {
    summaryText: summary,
    themes,
    modelMetadata: {
      model: 'deterministic-fallback',
      promptTokens: 0,
      completionTokens: 0,
      generatedAt: new Date().toISOString(),
    },
  }
}
