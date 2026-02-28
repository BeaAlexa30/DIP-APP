/**
 * POST /api/survey/generate-ai
 * ─────────────────────────────────────────────────────────────
 * Admin-only endpoint.
 * Takes a project selection + three AI prompts, calls Groq to
 * generate a complete survey, persists it, and returns the
 * public-shareable link.  Survey questions are NEVER seeded via
 * SQL migrations — they live entirely in the JSONB snapshot.
 */
import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import { requirePermission } from '@/lib/auth/AccessControlGuard'
import { logActivity, getUserInfo } from '@/lib/activity/ActivityLogger'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

/* ── Groq prompt ─────────────────────────────────────────── */
function buildPrompt(
  projectOverview: string,
  targetRespondents: string,
  surveyBenefit: string,
): string {
  return `You are an expert survey designer. Create a comprehensive survey based on the following information.

PROJECT OVERVIEW:
${projectOverview}

TARGET RESPONDENTS:
${targetRespondents}

SURVEY BENEFIT / PURPOSE:
${surveyBenefit}

Design a survey with 3-5 thematic categories, each containing 3-6 questions.
Use ONLY these two question types: single_select and scale.

IMPORTANT — respond ONLY with valid JSON in exactly this structure (no markdown fences, no extra text):
{
  "surveyTitle": "string",
  "categories": [
    {
      "name": "string",
      "questions": [
        {
          "type": "single_select",
          "prompt": "string",
          "required": true,
          "options": [
            { "label": "string", "value_key": "string" }
          ]
        },
        {
          "type": "scale",
          "prompt": "string",
          "required": true,
          "scaleMin": 1,
          "scaleMax": 5,
          "minLabel": "string",
          "maxLabel": "string"
        }
      ]
    }
  ]
}

Strict rules — violating any rule will break the survey:
- ONLY use "single_select" or "scale" types. NEVER use "text" or any other type.
- scale questions: scaleMin MUST be 1, scaleMax MUST be 5. Always 1-5. Never 1-10, never any percentage.
- scale minLabel and maxLabel must describe the endpoints (e.g. "Very Dissatisfied" / "Very Satisfied").
- scale questions must NOT include an options array.
- single_select questions: options array required with 3-5 choices. value_key must be snake_case and unique within the question.
- Do NOT ask any question involving percentages, numerical estimates, or open-ended text input.
- Keep question prompts concise, clear, and directly relevant to the project.
- Category names should be thematic and professional.`
}

/* ── Snapshot builder ──────────────────────────────────────── */
function buildSnapshot(
  parsed: any,
  projectOverview: string,
  targetRespondents: string,
  surveyBenefit: string,
) {
  const categories = (parsed.categories as any[]).map((cat: any, catIdx: number) => ({
    id: crypto.randomUUID(),
    name: cat.name,
    order: catIdx + 1,
    questions: (cat.questions as any[]).map((q: any, qIdx: number) => {
      const base = {
        id: crypto.randomUUID(),
        type: q.type,
        prompt: q.prompt,
        required: q.required ?? true,
        order: qIdx + 1,
      }

      if (q.type === 'single_select') {
        return {
          ...base,
          options: (q.options as any[]).map((o: any, oIdx: number) => ({
            id: crypto.randomUUID(),
            label: o.label,
            value_key: o.value_key,
            order: oIdx + 1,
          })),
        }
      }

      // scale — always force 1-5 regardless of what the AI returned
      const min = 1
      const max = 5
      const options = Array.from({ length: max - min + 1 }, (_, i) => ({
        id: crypto.randomUUID(),
        label: String(min + i),
        value_key: `scale_${min + i}`,
        order: i + 1,
      }))
      return {
        ...base,
        type: 'scale',
        options,
        scaleMin: min,
        scaleMax: max,
        minLabel: q.minLabel ?? 'Low',
        maxLabel: q.maxLabel ?? 'High',
      }
    }),
  }))

  return {
    ai_generated: true,
    packName: parsed.surveyTitle ?? 'AI-Generated Survey',
    version: 'ai-1.0',
    projectOverview,
    targetRespondents,
    surveyBenefit,
    categories,
  }
}

/* ── Route handler ─────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  // Only admins can generate surveys
  const auth = await requirePermission('generateAiSurvey')
  if (!auth.ok) return auth.response

  try {
    const { projectId, projectOverview, targetRespondents, surveyBenefit } = await req.json()

    if (!projectId || !projectOverview || !targetRespondents || !surveyBenefit) {
      return NextResponse.json(
        { error: 'projectId, projectOverview, targetRespondents, and surveyBenefit are required' },
        { status: 400 },
      )
    }

    // ── 1. Call Groq ──────────────────────────────────────────
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: buildPrompt(projectOverview, targetRespondents, surveyBenefit),
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    })

    const raw = completion.choices[0]?.message?.content ?? ''

    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch {
      console.error('[generate-ai] Groq returned non-JSON:', raw)
      return NextResponse.json({ error: 'AI returned an invalid response. Please try again.' }, { status: 500 })
    }

    if (!parsed.categories || !Array.isArray(parsed.categories)) {
      return NextResponse.json({ error: 'AI response missing categories.' }, { status: 500 })
    }

    const snapshot = buildSnapshot(parsed, projectOverview, targetRespondents, surveyBenefit)

    // ── 2. Create a unique framework pack row for this survey ─
    const supabase = await createServiceClient()

    const packDescription = `${surveyBenefit.trim()} [AI Generated]`

    // Each AI survey gets its own pack row so the Framework Packs table
    // shows a meaningful, per-survey description.
    const packVersion = `ai-${Date.now()}`
    const { data: newPack, error: packErr } = await supabase
      .from('framework_packs')
      .insert({
        name: snapshot.packName,
        version: packVersion,
        description: packDescription,
        active: true,
      })
      .select('id')
      .single()

    if (packErr || !newPack) {
      return NextResponse.json({ error: packErr?.message ?? 'Failed to create pack' }, { status: 500 })
    }

    const packId = newPack.id

    // ── 3. Insert survey ──────────────────────────────────────
    const { data: survey, error: surveyErr } = await supabase
      .from('surveys')
      .insert({
        project_id: projectId,
        pack_id: packId,
        pack_version_snapshot: snapshot as any,
        status: 'published',
      })
      .select('id')
      .single()

    if (surveyErr || !survey) {
      return NextResponse.json({ error: surveyErr?.message ?? 'Failed to create survey' }, { status: 500 })
    }

    // ── 4. Generate shareable token ───────────────────────────
    const bytes = new Uint8Array(24)
    globalThis.crypto.getRandomValues(bytes)
    const token = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const { error: tokenErr } = await supabase
      .from('survey_tokens')
      .insert({ survey_id: survey.id, token, max_responses: null, expires_at: null })

    if (tokenErr) {
      console.error('[generate-ai] token insert error:', tokenErr)
    }

    getUserInfo(auth.userId).then(u =>
      logActivity({ userId: auth.userId, userEmail: u.email, userName: u.name, action: 'generate_ai_survey', details: { projectId, surveyId: survey.id, surveyTitle: snapshot.packName } })
    )

    return NextResponse.json({
      ok: true,
      surveyId: survey.id,
      token,
      shareLink: `/survey/${token}`,
      surveyTitle: snapshot.packName,
      questionCount: snapshot.categories.reduce((acc, c) => acc + c.questions.length, 0),
      categoryCount: snapshot.categories.length,
    })
  } catch (err: any) {
    console.error('[generate-ai] unexpected error:', err)
    return NextResponse.json({ error: err.message ?? 'Unexpected error' }, { status: 500 })
  }
}
