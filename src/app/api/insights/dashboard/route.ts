import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// ── Server-side in-memory cache (15-min TTL) ─────────────────
// Prevents burning quota on repeated button presses or page refreshes.
const CACHE_TTL_MS = 15 * 60 * 1000
interface CacheEntry { data: any; expiresAt: number }
const insightCache = new Map<string, CacheEntry>()

function cacheKey(body: Record<string, unknown>): string {
  return JSON.stringify(body, Object.keys(body).sort())
}

// Model fallback chain — versioned IDs supported by v1beta (SDK 0.24.x)
// gemini-2.0-flash-lite is excluded (quota exhausted on free tier)
const MODEL_CHAIN = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-8b-001',
  'gemini-1.5-pro-002',
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function generateWithRetry(prompt: string, maxRetries = 2): Promise<string> {
  for (const modelName of MODEL_CHAIN) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
        })
        const result = await model.generateContent(prompt)
        return result.response.text()
      } catch (err: any) {
        const is429 = err?.message?.includes('429') || err?.status === 429
        const is404 = err?.message?.includes('404') || err?.status === 404
        const isLast = attempt === maxRetries
        if (is429 && !isLast) {
          // Exponential backoff: 2s, 4s
          await sleep(2000 * (attempt + 1))
          continue
        }
        if (is429 || is404) {
          // Quota exhausted or model not found — try next in chain
          console.warn(`[DashboardInsights] ${is404 ? 'model not found' : 'quota hit'} on ${modelName}, trying next model`)
          break
        }
        throw err
      }
    }
  }
  throw new Error('All Gemini models are currently rate-limited. Please try again in a few minutes.')
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

    const completionRate =
      body.totalProjects > 0
        ? ((body.completedProjects / body.totalProjects) * 100).toFixed(1)
        : '0'
    const surveyEngagement =
      body.totalSurveys > 0
        ? ((body.activeSurveys / body.totalSurveys) * 100).toFixed(1)
        : '0'

    const prompt = `You are a Decision Intelligence Platform analyst. Provide a concise dashboard summary based on this snapshot:

PLATFORM SNAPSHOT:
- Total Projects: ${body.totalProjects} (Active: ${body.activeProjects}, Completed: ${body.completedProjects}, Draft: ${body.draftProjects}, Archived: ${body.archivedProjects})
- Project Completion Rate: ${completionRate}%
- Active Surveys: ${body.activeSurveys} of ${body.totalSurveys} total (${surveyEngagement}% engagement)
- Framework Packs Available: ${body.frameworkPacks}

Respond ONLY in this JSON format (no markdown fences):
{
  "headline": "<one punchy sentence summarizing the platform health>",
  "insights": [
    "<insight 1 — specific observation from the numbers>",
    "<insight 2>",
    "<insight 3>"
  ],
  "recommendation": "<single most important action to take right now>",
  "healthSignal": "good|warning|critical"
}`

    const raw = await generateWithRetry(prompt)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Could not parse Gemini response')

    const parsed = JSON.parse(jsonMatch[0])

    // Store in cache
    insightCache.set(key, { data: parsed, expiresAt: Date.now() + CACHE_TTL_MS })

    return NextResponse.json({ ok: true, data: parsed, fromCache: false })
  } catch (err: any) {
    console.error('[DashboardInsights]', err)
    const isQuota = err?.message?.includes('429') || err?.message?.includes('rate-limited') || err?.message?.includes('quota')
    const isAllUnavailable = err?.message?.includes('All Gemini models')
    return NextResponse.json(
      {
        ok: false,
        error:
          isQuota || isAllUnavailable
            ? 'API quota reached. Please wait a moment and try again.'
            : err.message,
        retryAfter: isQuota || isAllUnavailable ? Date.now() + 60_000 : undefined,
      },
      { status: isQuota || isAllUnavailable ? 429 : 500 }
    )
  }
}
