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
function buildPrompt(surveyDescription: string): string {
  return `You are an expert survey designer specializing in creating user-friendly, multi-format surveys similar to Google Forms. 
Your task is to create a comprehensive, well-structured survey based on the user's description below.

SURVEY DESCRIPTION:
${surveyDescription}

DESIGN REQUIREMENTS:
- Organize the survey into 2-5 thematic categories (logical groupings)
- Each category should contain 3-6 focused questions
- Select question types strategically based on the type of data you want to collect
- Ensure responses will flow logically and feel engaging (not repetitive)
- Choose required vs. optional questions appropriately
- For selection-based questions (multiple_choice, checkboxes, dropdown):
  * Include 2-5 distinct options per question
  * Options should be mutually exclusive where appropriate
  * NO "other" field needed — backend will handle it separately if needed
- For linear_scale questions: pick a scale range (1-5 is most common, but 1-7 or 1-10 are also good)
- Use the exact value_key format (snake_case) for backend compatibility

AVAILABLE QUESTION TYPES WITH EXAMPLES:

1. short_text: Single-line text input (e.g., "What is your name?")
2. long_text: Multi-line text area (e.g., "Tell us about your experience...")
3. multiple_choice: Radio buttons — select ONE option (e.g., "How often do you use this product? Weekly / Monthly / Rarely")
4. checkboxes: Checkboxes — select MULTIPLE options (e.g., "What features do you use most?")
5. dropdown: Select dropdown — pick ONE from a list (e.g., "What is your industry?")
6. linear_scale: Likert scale or numeric rating (e.g., "Rate your satisfaction: 1=Very Dissatisfied ... 5=Very Satisfied")
7. yes_no: Binary choice (e.g., "Have you used this feature before? Yes / No")
8. email: Email field (e.g., "What is your email address?")
9. url: URL field (e.g., "Where can we learn more about your company?")
10. date: Date picker (e.g., "When did you start using our service?")
11. time: Time picker (e.g., "What time of day do you typically use this?")
12. number: Numeric input (e.g., "How many team members do you have?")

RESPONSE FORMAT:
Return ONLY valid JSON (no markdown code blocks, no extra text) in this exact structure:

{
  "surveyTitle": "Descriptive Survey Title",
  "categories": [
    {
      "name": "Category Name",
      "description": "Brief context about this section (optional)",
      "questions": [
        {
          "type": "short_text",
          "prompt": "Your question text here?",
          "required": true
        },
        {
          "type": "multiple_choice",
          "prompt": "Your question text here?",
          "required": true,
          "options": [
            { "label": "Option A", "value_key": "option_a" },
            { "label": "Option B", "value_key": "option_b" },
            { "label": "Option C", "value_key": "option_c" }
          ]
        },
        {
          "type": "linear_scale",
          "prompt": "Your question text here?",
          "required": false,
          "scaleMin": 1,
          "scaleMax": 5,
          "minLabel": "Strongly Disagree",
          "maxLabel": "Strongly Agree"
        },
        {
          "type": "checkboxes",
          "prompt": "Your question text here? (select all that apply)",
          "required": false,
          "options": [
            { "label": "Choice A", "value_key": "choice_a" },
            { "label": "Choice B", "value_key": "choice_b" }
          ]
        },
        {
          "type": "yes_no",
          "prompt": "Your question text here?",
          "required": true
        },
        {
          "type": "email",
          "prompt": "What is your email?",
          "required": false
        },
        {
          "type": "date",
          "prompt": "When would you like to schedule this?",
          "required": false
        }
      ]
    }
  ]
}

STRICT DATA VALIDATION RULES:
1. For multiple_choice, checkboxes, dropdown: 
   • MUST include "options" array with 2-5 items
   • Each option MUST have "label" (display text) and "value_key" (unique snake_case identifier)
   • Example: { "label": "Very Satisfied", "value_key": "very_satisfied" }
   
2. For linear_scale:
   • MUST include: scaleMin (typically 1), scaleMax (3-10), minLabel, maxLabel
   • DO NOT include an "options" array
   • Example: { "type": "linear_scale", "scaleMin": 1, "scaleMax": 5, "minLabel": "Low", "maxLabel": "High" }
   
3. For short_text, long_text, email, url, date, time, number, yes_no:
   • DO NOT include an "options" array
   
4. All question types support "required" (boolean)
5. Category names should be clear, professional, and relate to the question set
6. Keep question prompts concise (under 120 characters ideally)
7. Question order should flow logically (general → specific, easier → harder)

QUALITY GUIDELINES:
- Avoid leading, biased, or ambiguous questions
- Use consistent language and tone throughout
- No jargon unless explained in context
- For sensitive topics, offer "Prefer not to answer" as a multiple_choice option if appropriate
- Honor persona, tone, and constraints specified in the description
- If persona says "professional," use formal language; if "conversational," be friendly
- If length constraint is mentioned (e.g., "3-5 minutes"), aim for 12-20 questions total`
}

/* ── Snapshot builder ──────────────────────────────────────── */
function buildSnapshot(
  parsed: any,
  surveyDescription: string,
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
    surveyDescription,
    categories,
  }
}

/* ── Route handler ─────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  // Only admins can generate surveys
  const auth = await requirePermission('generateAiSurvey')
  if (!auth.ok) return auth.response

  try {
    const { projectId, surveyDescription } = await req.json()

    if (!projectId || !surveyDescription) {
      return NextResponse.json(
        { error: 'projectId and surveyDescription are required' },
        { status: 400 },
      )
    }

    // ── 1. Call Groq ──────────────────────────────────────────
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: buildPrompt(surveyDescription),
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

    const snapshot = buildSnapshot(parsed, surveyDescription)

    // ── 2. Create a unique framework pack row for this survey ─
    const supabase = await createServiceClient()

    const packDescription = `${surveyDescription.trim().slice(0, 200)} [AI Generated]`

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
