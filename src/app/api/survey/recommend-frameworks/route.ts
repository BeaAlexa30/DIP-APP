/**
 * POST /api/survey/recommend-frameworks
 * ─────────────────────────────────────────────────────────────
 * Uses Groq (llama-3.3-70b-versatile) to determine which of the
 * available framework packs are applicable to a project by looking
 * at similarities between the project details and each pack's
 * purpose — no ranking, just a clear recommended / not-recommended
 * with a short explanation.
 *
 * Request body:
 *   { projectId: string, availablePackIds: string[] }
 *
 * Response:
 *   { recommendations: Recommendation[] }
 *   where Recommendation = { packId, packName, reason, recommended }
 */

import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

export async function POST(req: NextRequest) {
  const auth = await requirePermission('generateAiSurvey')
  if (!auth.ok) return auth.response

  const { projectId, availablePackIds } = await req.json()
  if (!projectId || !Array.isArray(availablePackIds) || availablePackIds.length === 0) {
    return NextResponse.json({ error: 'projectId and availablePackIds are required.' }, { status: 400 })
  }

  const db = await createServiceClient()

  const [projectRes, packsRes] = await Promise.all([
    db.from('projects').select('client_name,industry,goal,stage,channels,target_audience').eq('id', projectId).single(),
    db.from('framework_packs').select('id,name,description').in('id', availablePackIds),
  ])

  if (!projectRes.data) return NextResponse.json({ error: 'Project not found.' }, { status: 404 })

  const project = projectRes.data
  const packs = packsRes.data ?? []

  if (packs.length === 0) {
    return NextResponse.json({ recommendations: [] })
  }

  // ── Find similar projects and which packs they use ──────────────────────────
  // A project is "similar" if it shares at least one of: industry, target_audience, stage
  // We look across ALL projects except the current one.
  const allPackIds = packs.map(p => p.id)

  const surveysWithPacksRes = await db
    .from('surveys')
    .select('pack_id, project_id, projects!inner(id, client_name, industry, stage, target_audience)')
    .in('pack_id', allPackIds)
    .neq('project_id', projectId)

  // Build a map: packId → list of similar project descriptors
  const similarUsageMap: Record<string, string[]> = {}
  for (const row of (surveysWithPacksRes.data ?? []) as any[]) {
    const p = row.projects
    if (!p) continue

    // Check similarity: shared industry, target audience, or stage
    const sharedIndustry =
      project.industry && p.industry &&
      project.industry.toLowerCase().includes(p.industry.toLowerCase().split(',')[0].trim()) ||
      p.industry?.toLowerCase().includes(project.industry?.toLowerCase().split(',')[0].trim() ?? '')

    const sharedAudience =
      project.target_audience && p.target_audience &&
      (project.target_audience.toLowerCase().split(/[,\s]+/).some((w: string) =>
        w.length > 3 && p.target_audience?.toLowerCase().includes(w)
      ))

    const sharedStage =
      project.stage && p.stage &&
      project.stage.toLowerCase() === p.stage.toLowerCase()

    if (sharedIndustry || sharedAudience || sharedStage) {
      const pid = row.pack_id as string
      if (!similarUsageMap[pid]) similarUsageMap[pid] = []
      const label = [
        sharedIndustry ? `same industry (${p.industry})` : null,
        sharedAudience ? `same target audience (${p.target_audience})` : null,
        sharedStage ? `same stage (${p.stage})` : null,
      ].filter(Boolean).join(', ')
      similarUsageMap[pid].push(`"${p.client_name}" (${label})`)
    }
  }

  // Build pack list with similar-project usage context
  const packList = packs
    .map((p, i) => {
      const usedBy = similarUsageMap[p.id] ?? []
      const usageNote = usedBy.length > 0
        ? `\n   Used by similar projects: ${usedBy.slice(0, 5).join('; ')}`
        : ''
      return `${i + 1}. ID: ${p.id}\n   Name: ${p.name}\n   Description: ${p.description ?? '(none)'}${usageNote}`
    })
    .join('\n\n')

  const prompt = `You are an expert business analyst. Your job is to determine which framework packs are applicable and relevant to a project.

Use TWO signals to decide:
1. Whether the framework's purpose/scope aligns with the project's industry, goal, stage, channels, or target audience.
2. Whether similar projects (same industry, same target audience, or same stage) are already using this framework — this is a strong signal of applicability.

If a framework is already being used by projects with similar characteristics, it MUST be recommended.

PROJECT DETAILS:
- Name: ${project.client_name}
- Industry: ${project.industry ?? 'Not specified'}
- Goal: ${project.goal ?? 'Not specified'}
- Stage: ${project.stage ?? 'Not specified'}
- Channels: ${(project.channels ?? []).join(', ') || 'Not specified'}
- Target Audience: ${project.target_audience ?? 'Not specified'}

AVAILABLE FRAMEWORK PACKS:
${packList}

Respond ONLY with valid JSON — no markdown fences, no extra text — in exactly this structure:
{
  "recommendations": [
    {
      "packId": "uuid-string",
      "packName": "string",
      "reason": "1-2 sentence explanation referencing project similarities or framework alignment",
      "recommended": true
    }
  ]
}

Rules:
- recommended is true if applicable to this project (via framework alignment OR similar project usage), false otherwise
- Do NOT rank or score — only decide applicable (true) or not applicable (false)
- Include ALL packs in the response
- List recommended packs first, then non-recommended`

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2048,
    })

    const raw = completion.choices[0]?.message?.content ?? ''
    let parsed: { recommendations: any[] }

    try {
      // Strip any accidental markdown fences
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('[recommend-frameworks] JSON parse failed:', raw)
      // Fallback: mark all packs as recommended
      return NextResponse.json({
        recommendations: packs.map(p => ({
          packId: p.id,
          packName: p.name,
          reason: 'AI evaluation unavailable — shown as applicable by default.',
          recommended: true,
        })),
      })
    }

    return NextResponse.json({ recommendations: parsed.recommendations ?? [] })
  } catch (err: any) {
    console.error('[recommend-frameworks] Groq error:', err)
    return NextResponse.json({ error: err.message ?? 'AI evaluation failed.' }, { status: 500 })
  }
}
