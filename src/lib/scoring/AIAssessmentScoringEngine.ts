/**
 * AI Assessment Scoring Engine
 * ============================================================
 * Uses Groq (llama-3.3-70b-versatile) to score survey responses
 * in context of the survey's purpose, project goals, and
 * actual answer content including free-text responses.
 *
 * Falls back to the deterministic engine if Groq is unavailable.
 *
 * Scoring dimensions:
 *   - Per-category scores (0-100)
 *   - Index scores: Trust, Usability, Conversion Risk, Experience, Loyalty
 *   - Executive Health Score (0-100)
 *   - Issue Rankings with AI-generated descriptions
 */

import Groq from 'groq-sdk'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'
import type { ScoringInput, ScoringResult } from './AssessmentScoringEngine'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// ── Types ──────────────────────────────────────────────────────────────────────

interface AIScoreOutput {
  categoryScores: {
    categoryName: string
    score: number          // 0-100
    rationale: string
  }[]
  indexScores: {
    trust: number
    usability: number
    conversion_risk: number   // higher = more risk
    experience: number
    loyalty: number
  }
  healthScore: number          // 0-100
  issueRankings: {
    issue: string
    priorityScore: number      // 0-100
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    description: string
    recommendedAction: string
  }[]
  scoringRationale: string
}

interface AggregatedQuestion {
  questionId: string
  prompt: string
  categoryName: string
  type: string
  optionCounts: { label: string; count: number; pct: number; isRiskFlag: boolean; isFrictionFlag: boolean }[]
  freeTextSamples: string[]
  totalAnswered: number
}

// ── Main AI scoring function ───────────────────────────────────────────────────

export async function runAIScoringPipeline(input: ScoringInput): Promise<ScoringResult> {
  const supabase = await createServiceClient()

  // 1. Load project + survey + pack info
  const { data: survey, error: surveyErr } = await supabase
    .from('surveys')
    .select('id, project_id, pack_id, pack_version_snapshot')
    .eq('id', input.surveyId)
    .single()
  if (surveyErr || !survey) throw new Error(`Survey not found: ${input.surveyId}`)

  const { data: project } = await supabase
    .from('projects')
    .select('client_name, industry, goal, stage, channels, target_audience')
    .eq('id', survey.project_id)
    .single()

  const { data: pack } = await supabase
    .from('framework_packs')
    .select('name, description')
    .eq('id', survey.pack_id)
    .single()

  // 2. Load responses
  const { data: responses, error: respErr } = await supabase
    .from('responses')
    .select('id')
    .eq('survey_id', input.surveyId)
  if (respErr) throw new Error(`Failed to load responses: ${respErr.message}`)
  if (!responses || responses.length === 0) throw new Error('No responses to score.')
  const responseIds = responses.map(r => r.id)

  // 3. Load answers (both option and free text)
  const { data: answers, error: ansErr } = await supabase
    .from('response_answers')
    .select('response_id, question_id, option_value_key, free_text')
    .in('response_id', responseIds)
  if (ansErr) throw new Error(`Failed to load answers: ${ansErr.message}`)

  // 4. Load questions, categories, options, and scoring rules (for risk/friction flags)
  const [
    { data: questions },
    { data: categories },
    { data: options },
    { data: rules },
  ] = await Promise.all([
    supabase.from('framework_questions').select('id, category_id, prompt, type, order_index').eq('pack_id', survey.pack_id),
    supabase.from('framework_categories').select('id, name, weight').eq('pack_id', survey.pack_id),
    supabase.from('framework_options').select('question_id, label, value_key'),
    supabase.from('framework_scoring_rules').select('question_id, option_value_key, risk_flag, friction_flag, driver_tag'),
  ])

  // 5. Build lookup maps
  const catMap = new Map((categories ?? []).map(c => [c.id, c.name]))
  const optionLabelMap = new Map<string, string>()
  for (const opt of options ?? []) {
    optionLabelMap.set(`${opt.question_id}::${opt.value_key}`, opt.label)
  }
  const ruleMap = new Map<string, { risk_flag: boolean; friction_flag: boolean; driver_tag: string | null }>()
  for (const rule of rules ?? []) {
    ruleMap.set(`${rule.question_id}::${rule.option_value_key}`, rule)
  }

  // 6. Aggregate answers per question
  type OptionAccum = Map<string, { label: string; count: number; isRisk: boolean; isFriction: boolean }>
  const questionOptionCounts = new Map<string, OptionAccum>()
  const questionFreeText = new Map<string, string[]>()
  const questionAnswerCount = new Map<string, number>()

  for (const ans of answers ?? []) {
    const count = (questionAnswerCount.get(ans.question_id) ?? 0) + 1
    questionAnswerCount.set(ans.question_id, count)

    if (ans.option_value_key) {
      const label = optionLabelMap.get(`${ans.question_id}::${ans.option_value_key}`) ?? ans.option_value_key
      const rule = ruleMap.get(`${ans.question_id}::${ans.option_value_key}`)
      const accum = questionOptionCounts.get(ans.question_id) ?? new Map()
      const existing = accum.get(ans.option_value_key) ?? { label, count: 0, isRisk: rule?.risk_flag ?? false, isFriction: rule?.friction_flag ?? false }
      existing.count += 1
      accum.set(ans.option_value_key, existing)
      questionOptionCounts.set(ans.question_id, accum)
    }

    if (ans.free_text && ans.free_text.trim()) {
      const samples = questionFreeText.get(ans.question_id) ?? []
      if (samples.length < 8) samples.push(ans.free_text.trim().slice(0, 120))
      questionFreeText.set(ans.question_id, samples)
    }
  }

  // 7. Build structured question list for prompt
  const aggregatedQuestions: AggregatedQuestion[] = []
  for (const q of (questions ?? []).sort((a, b) => a.order_index - b.order_index)) {
    const catName = catMap.get(q.category_id) ?? 'Unknown'
    const totalAnswered = questionAnswerCount.get(q.id) ?? 0
    const optAccum = questionOptionCounts.get(q.id)

    const optionCounts: AggregatedQuestion['optionCounts'] = []
    if (optAccum) {
      for (const [, v] of optAccum.entries()) {
        optionCounts.push({
          label: v.label,
          count: v.count,
          pct: totalAnswered > 0 ? Math.round((v.count / responseIds.length) * 100) : 0,
          isRiskFlag: v.isRisk,
          isFrictionFlag: v.isFriction,
        })
      }
      optionCounts.sort((a, b) => b.count - a.count)
    }

    aggregatedQuestions.push({
      questionId: q.id,
      prompt: q.prompt,
      categoryName: catName,
      type: q.type,
      optionCounts,
      freeTextSamples: questionFreeText.get(q.id) ?? [],
      totalAnswered,
    })
  }

  // 8. Build Groq prompt
  // Question groups are framework topic labels — AI will derive its OWN scoring categories
  let dataBlock = ''
  let currentCat = ''
  for (const q of aggregatedQuestions) {
    if (q.categoryName !== currentCat) {
      dataBlock += `\n### QUESTION GROUP: ${q.categoryName}\n`
      currentCat = q.categoryName
    }
    dataBlock += `\nQ: ${q.prompt} (${q.totalAnswered}/${responseIds.length} answered)\n`
    if (q.optionCounts.length > 0) {
      for (const opt of q.optionCounts) {
        const flags = [opt.isRiskFlag ? '[RISK]' : '', opt.isFrictionFlag ? '[FRICTION]' : ''].filter(Boolean).join(' ')
        dataBlock += `  - "${opt.label}": ${opt.count} (${opt.pct}%) ${flags}\n`
      }
    }
    if (q.freeTextSamples.length > 0) {
      dataBlock += `  Free-text samples:\n`
      for (const t of q.freeTextSamples) {
        dataBlock += `    * "${t}"\n`
      }
    }
  }

  const systemPrompt = `You are an expert UX researcher, business analyst, and decision intelligence specialist. Your job is to analyze survey response data and produce accurate, context-aware scores that reflect the true experience of the surveyed audience relative to the project's purpose.

You must return ONLY valid JSON matching the schema provided.`

  const userPrompt = `Analyze these survey results and score them. The scores must reflect the ACTUAL data, not just averages.

## PROJECT CONTEXT
- Client: ${project?.client_name ?? 'Unknown'}
- Industry: ${project?.industry ?? 'Not specified'}
- Goal: ${project?.goal ?? 'Not specified'}
- Stage: ${project?.stage ?? 'Not specified'}
- Target Audience: ${project?.target_audience ?? 'Not specified'}
- Channels: ${(project?.channels ?? []).join(', ') || 'Not specified'}

## SURVEY FRAMEWORK
- Framework: ${pack?.name ?? 'Standard Framework'}
- Description: ${pack?.description ?? 'Digital experience assessment'}
- Total respondents: ${responseIds.length}

## RESPONSE DATA
${dataBlock}

## SCORING INSTRUCTIONS

STEP 1 — DEFINE YOUR OWN CATEGORIES:
Do NOT use the question group headings as-is. Based on the PROJECT GOAL, INDUSTRY, and the actual survey question content above, synthesize 4-7 meaningful scoring dimensions that best capture what matters for this specific survey's purpose.

Examples of how to derive categories:
- SaaS UX audit → "Onboarding Clarity", "Navigation & Discoverability", "Performance Reliability", "Trust & Data Privacy", "Support Experience"
- E-commerce → "Product Discovery", "Checkout Friction", "Post-Purchase Satisfaction", "Trust & Security", "Mobile Experience"
- HR / Employee Survey → "Leadership Communication", "Work-Life Balance", "Career Development", "Team Collaboration", "Recognition & Reward"

The categories you define should be specific to the survey's context, informative, and directly reflect the surveyed experience. Avoid generic labels.

STEP 2 — SCORE EACH CATEGORY 0-100 where:
- 90-100: Excellent — strong positive signals, minimal issues
- 70-89: Good — mostly positive with minor areas for improvement
- 50-69: Fair — mixed signals, notable issues present
- 30-49: Poor — significant problems, multiple risk/friction flags
- 0-29: Critical — severe issues, needs immediate attention

For index scores:
- Trust (0-100, higher = more trust): data security, transparency, social proof
- Usability (0-100, higher = better UX): navigation, performance, reliability
- Conversion Risk (0-100, higher = MORE risk!): abandonment, friction, info clarity barriers
- Experience (0-100, higher = better): overall satisfaction, support quality, expectation alignment
- Loyalty (0-100, higher = more loyal): NPS, retention signals, advocacy

Important: Heavily weight RISK-flagged and FRICTION-flagged answers. Free-text comments often reveal issues not captured by ratings — analyze sentiment carefully. Consider the project goal when determining what matters most.

Return this exact JSON structure:
{
  "categoryScores": [
    {
      "categoryName": "string (YOUR derived category, specific to this survey's focus)",
      "score": 0-100,
      "rationale": "string (1-2 sentences explaining the score)"
    }
  ],
  "indexScores": {
    "trust": 0-100,
    "usability": 0-100,
    "conversion_risk": 0-100,
    "experience": 0-100,
    "loyalty": 0-100
  },
  "healthScore": 0-100,
  "issueRankings": [
    {
      "issue": "string (short title)",
      "priorityScore": 0-100,
      "riskLevel": "low|medium|high|critical",
      "description": "string (what is happening and why it matters)",
      "recommendedAction": "string (specific action)"
    }
  ],
  "scoringRationale": "string (2-3 sentences explaining overall scoring)"
}

Return between 3-8 issues, ordered by priority (highest first).`

  // 9. Call Groq
  let aiOutput: AIScoreOutput
  let isAIScored = true

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      temperature: 0.15,  // low temp for consistent, accurate scoring
      max_tokens: 3000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    aiOutput = JSON.parse(raw) as AIScoreOutput
  } catch (groqErr: any) {
    console.warn('[AI Scoring] Groq unavailable, falling back to deterministic:', groqErr.message)
    isAIScored = false
    // Fall back to deterministic pipeline
    const { runScoringPipeline } = await import('./AssessmentScoringEngine')
    return runScoringPipeline(input)
  }

  // 10. Use AI-derived categories directly — NOT matched back to seeded framework_categories.
  //     The AI defines its own meaningful dimensions based on the survey's focus.
  const categoryScores = (aiOutput.categoryScores ?? []).map(aiCat => {
    const score = Math.max(0, Math.min(100, Math.round((aiCat.score ?? 50) * 100) / 100))
    return {
      categoryId: null as string | null,
      categoryName: aiCat.categoryName,
      rawScore: score,
      minPossible: 0,
      maxPossible: 100,
      normalizedScore: score,
    }
  })

  const indexDefs = [
    { indexKey: 'trust',           label: 'Trust Index',        higherIsBetter: true,  score: aiOutput.indexScores?.trust ?? 50 },
    { indexKey: 'usability',       label: 'Usability Index',    higherIsBetter: true,  score: aiOutput.indexScores?.usability ?? 50 },
    { indexKey: 'conversion_risk', label: 'Conversion Risk',    higherIsBetter: false, score: aiOutput.indexScores?.conversion_risk ?? 50 },
    { indexKey: 'experience',      label: 'Experience Score',   higherIsBetter: true,  score: aiOutput.indexScores?.experience ?? 50 },
    { indexKey: 'loyalty',         label: 'Loyalty & Advocacy', higherIsBetter: true,  score: aiOutput.indexScores?.loyalty ?? 50 },
  ]
  const indexScores = indexDefs.map(d => ({
    indexKey: d.indexKey,
    score0100: Math.max(0, Math.min(100, Math.round(d.score * 100) / 100)),
    higherIsBetter: d.higherIsBetter,
    label: d.label,
  }))

  const healthScore = Math.max(0, Math.min(100, Math.round((aiOutput.healthScore ?? 50) * 100) / 100))

  const issueRankings = (aiOutput.issueRankings ?? []).map(ir => ({
    driverTag: ir.issue.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40),
    risk: ir.riskLevel === 'critical' ? 90 : ir.riskLevel === 'high' ? 70 : ir.riskLevel === 'medium' ? 45 : 20,
    friction: Math.min(100, ir.priorityScore),
    frequency: Math.min(100, ir.priorityScore * 0.6),
    priorityScore: Math.max(0, Math.min(100, ir.priorityScore)),
    description: `[AI] ${ir.description} — Action: ${ir.recommendedAction}`,
  }))

  // 11. Compute checksum
  const checksumPayload = JSON.stringify({
    surveyId: input.surveyId,
    frameworkVersion: input.frameworkVersion,
    responseIds: [...responseIds].sort(),
    packSnapshot: survey.pack_version_snapshot,
    engine: 'ai-groq',
  })
  const checksum = crypto.createHash('sha256').update(checksumPayload).digest('hex')

  // 12. Persist score run
  const { data: scoreRun, error: runErr } = await supabase
    .from('score_runs')
    .insert({
      survey_id: input.surveyId,
      framework_version: input.frameworkVersion,
      checksum,
      response_count: responseIds.length,
    })
    .select()
    .single()

  if (runErr || !scoreRun) throw new Error(`Failed to create score run: ${runErr?.message}`)

  await supabase.from('score_results').insert(
    categoryScores.map(cs => ({
      score_run_id: scoreRun.id,
      ai_category_name: cs.categoryName,
      // category_id intentionally omitted — AI-scored runs use ai_category_name
      raw_score: cs.rawScore,
      min_possible: 0,
      max_possible: 100,
      normalized_score: cs.normalizedScore,
    }))
  )

  await supabase.from('index_results').insert(
    indexScores.map(is => ({
      score_run_id: scoreRun.id,
      index_key: is.indexKey,
      score_0_100: is.score0100,
      higher_is_better: is.higherIsBetter,
    }))
  )

  await supabase.from('executive_results').insert({
    score_run_id: scoreRun.id,
    health_score_0_100: healthScore,
  })

  if (issueRankings.length > 0) {
    await supabase.from('issue_rankings').insert(
      issueRankings.map(ir => ({
        score_run_id: scoreRun.id,
        driver_tag: ir.driverTag,
        risk: ir.risk,
        friction: ir.friction,
        frequency: ir.frequency,
        priority_score: ir.priorityScore,
        description: ir.description,
      }))
    )
  }

  console.log(`[AI Scoring] Groq scored ${responseIds.length} responses | healthScore=${healthScore} | engine=${isAIScored ? 'groq' : 'deterministic-fallback'}`)

  return {
    scoreRunId: scoreRun.id,
    surveyId: input.surveyId,
    frameworkVersion: input.frameworkVersion,
    checksum,
    responseCount: responseIds.length,
    executedAt: new Date(scoreRun.executed_at),
    categoryScores,
    indexScores,
    healthScore,
    issueRankings,
  }
}
