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
import type { ScoringResult } from '@/lib/scoring/engine'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const MODEL_NAME = 'gemini-2.0-flash-lite'

export interface AIInsightOutput {
  summaryText: string
  themes: string[]
  modelMetadata: {
    model: string
    promptTokens: number
    completionTokens: number
    generatedAt: string
  }
}

export async function generateAIInsights(scoring: ScoringResult): Promise<AIInsightOutput> {
  const topIssues = scoring.issueRankings.slice(0, 5).map(
    ir => `${ir.driverTag} (priority: ${ir.priorityScore.toFixed(1)}, risk: ${ir.risk.toFixed(1)}%, friction: ${ir.friction.toFixed(1)}%)`
  ).join('\n')

  const indexSummary = scoring.indexScores.map(
    is => `${is.label}: ${is.score0100.toFixed(1)}/100 (${is.higherIsBetter ? 'higher=better' : 'higher=worse'})`
  ).join('\n')

  const prompt = `You are a CX analyst reviewing computed decision intelligence scores.
Your job is to SUMMARIZE insights from already-computed scores — you must NOT recompute or change any scores.

COMPUTED DATA:
Executive Health Score: ${scoring.healthScore.toFixed(1)}/100
Responses: ${scoring.responseCount}

Indexes:
${indexSummary}

Top Ranked Issues (already ranked by deterministic priority score):
${topIssues}

Write:
1. A 3–4 sentence executive summary of the computed findings.
2. A JSON array of 3–5 key themes (concise, action-oriented phrases, each under 10 words).

Respond in this JSON format only:
{
  "summary": "<executive summary here>",
  "themes": ["theme 1", "theme 2", "theme 3"]
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
