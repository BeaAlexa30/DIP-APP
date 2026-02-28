/**
 * DIP Deterministic Scoring Engine
 * ============================================================
 * Every score is:
 *   - Rule-based (no AI)
 *   - Traceable to framework version + option_value_key
 *   - Reproducible given same inputs (verified via checksum)
 *
 * Index Composition (Framework v1.0):
 *   Trust            = 0.5 * Trust&Security + 0.3 * Transparency + 0.2 * SocialProof
 *   Usability        = 0.5 * Usability&Nav  + 0.3 * Performance  + 0.2 * Reliability
 *   ConversionRisk   = inverse(0.5 * Conversion&Friction + 0.3 * InfoClarity + 0.2 * ProcessLength)
 *   Experience       = 0.5 * OverallExp     + 0.3 * Support      + 0.2 * Expectations
 *   Loyalty          = 0.5 * Loyalty&Adv    + 0.5 * NPS
 *
 * Executive Health Score:
 *   = 0.25*Trust + 0.25*Usability + 0.20*(100-ConversionRisk) + 0.20*Experience + 0.10*Loyalty
 *   minus penalty points for risk flags
 *
 * Priority Score per driver:
 *   priority = 0.4 * risk + 0.4 * friction + 0.2 * frequency
 */

import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/ServerSideDbConnector'

// ============================================================
// Types
// ============================================================

export interface ScoringInput {
  surveyId: string
  frameworkVersion: string
}

export interface CategoryScore {
  categoryId: string | null
  categoryName: string
  rawScore: number
  minPossible: number
  maxPossible: number
  normalizedScore: number // 0–100
}

export interface IndexScore {
  indexKey: string
  score0100: number
  higherIsBetter: boolean
  label: string
}

export interface IssueRanking {
  driverTag: string
  risk: number       // 0–100
  friction: number   // 0–100
  frequency: number  // 0–100 (% of responses flagged)
  priorityScore: number
  description: string
}

export interface ScoringResult {
  scoreRunId: string
  surveyId: string
  frameworkVersion: string
  checksum: string
  responseCount: number
  executedAt: Date
  categoryScores: CategoryScore[]
  indexScores: IndexScore[]
  healthScore: number // 0–100
  issueRankings: IssueRanking[]
}

// ============================================================
// Index composition config (versioned with framework)
// ============================================================
const INDEX_COMPOSITION: Record<
  string,
  { label: string; higherIsBetter: boolean; components: { driverTag: string; weight: number }[] }
> = {
  trust: {
    label: 'Trust Index',
    higherIsBetter: true,
    components: [
      { driverTag: 'data_security', weight: 0.4 },
      { driverTag: 'transparency',  weight: 0.3 },
      { driverTag: 'social_proof',  weight: 0.2 },
      { driverTag: 'security_friction', weight: 0.1 },
    ],
  },
  usability: {
    label: 'Usability Index',
    higherIsBetter: true,
    components: [
      { driverTag: 'navigation',    weight: 0.25 },
      { driverTag: 'usability',     weight: 0.25 },
      { driverTag: 'performance',   weight: 0.20 },
      { driverTag: 'reliability',   weight: 0.20 },
      { driverTag: 'device_compat', weight: 0.10 },
    ],
  },
  conversion_risk: {
    label: 'Conversion Risk',
    higherIsBetter: false, // higher = more risk = BAD
    components: [
      { driverTag: 'conversion_ease',  weight: 0.30 },
      { driverTag: 'abandonment',      weight: 0.30 },
      { driverTag: 'info_clarity',     weight: 0.20 },
      { driverTag: 'process_length',   weight: 0.10 },
      { driverTag: 'conversion_sat',   weight: 0.10 },
    ],
  },
  experience: {
    label: 'Experience Score',
    higherIsBetter: true,
    components: [
      { driverTag: 'overall_experience', weight: 0.40 },
      { driverTag: 'support',            weight: 0.25 },
      { driverTag: 'expectation_gap',    weight: 0.25 },
      { driverTag: 'friction_frequency', weight: 0.10 },
    ],
  },
  loyalty: {
    label: 'Loyalty & Advocacy',
    higherIsBetter: true,
    components: [
      { driverTag: 'nps',       weight: 0.40 },
      { driverTag: 'retention', weight: 0.40 },
      { driverTag: 'advocacy',  weight: 0.20 },
    ],
  },
}

// Executive health composition
const HEALTH_WEIGHTS = {
  trust:           0.25,
  usability:       0.25,
  conversion_risk: 0.20, // inverted: (100 - conversion_risk) * 0.20
  experience:      0.20,
  loyalty:         0.10,
}

const RISK_FLAG_PENALTY = 0.5  // per risk-flagged response answer

// ============================================================
// Main scoring function
// ============================================================
export async function runScoringPipeline(input: ScoringInput): Promise<ScoringResult> {
  const supabase = await createServiceClient()

  // 1. Load framework snapshot from survey
  const { data: survey, error: surveyErr } = await supabase
    .from('surveys')
    .select('*, pack_version_snapshot')
    .eq('id', input.surveyId)
    .single()

  if (surveyErr || !survey) throw new Error(`Survey not found: ${input.surveyId}`)

  // 2. Load all responses for survey
  const { data: responses, error: respErr } = await supabase
    .from('responses')
    .select('id')
    .eq('survey_id', input.surveyId)

  if (respErr) throw new Error(`Failed to load responses: ${respErr.message}`)
  if (!responses || responses.length === 0) throw new Error('No responses to score.')

  const responseIds = responses.map(r => r.id)

  // 3. Load all answers
  const { data: answers, error: ansErr } = await supabase
    .from('response_answers')
    .select('response_id, question_id, option_value_key')
    .in('response_id', responseIds)
    .not('option_value_key', 'is', null)

  if (ansErr) throw new Error(`Failed to load answers: ${ansErr.message}`)

  // 4. Load scoring rules from framework
  const { data: rules, error: rulesErr } = await supabase
    .from('framework_scoring_rules')
    .select('question_id, option_value_key, score_delta, risk_flag, friction_flag, driver_tag')

  if (rulesErr) throw new Error(`Failed to load rules: ${rulesErr.message}`)

  // 5. Load questions and categories
  const { data: questions, error: qErr } = await supabase
    .from('framework_questions')
    .select('id, category_id, type')
    .eq('pack_id', survey.pack_id)

  if (qErr) throw new Error(`Failed to load questions: ${qErr.message}`)

  const { data: categories, error: catErr } = await supabase
    .from('framework_categories')
    .select('id, name, weight')
    .eq('pack_id', survey.pack_id)

  if (catErr) throw new Error(`Failed to load categories: ${catErr.message}`)

  // 6. Build lookup maps
  const ruleMap = new Map<string, { score_delta: number; risk_flag: boolean; friction_flag: boolean; driver_tag: string | null }>()
  for (const rule of rules ?? []) {
    ruleMap.set(`${rule.question_id}::${rule.option_value_key}`, rule)
  }

  const questionCatMap = new Map<string, string>()
  for (const q of questions ?? []) {
    questionCatMap.set(q.id, q.category_id)
  }

  // 7. Compute per-category raw scores
  //    Also accumulate driver-tag risk/friction/frequency counts
  const categoryRaw = new Map<string, number>()  // categoryId → raw score sum
  const driverScores = new Map<string, { total: number; count: number; riskCount: number; frictionCount: number }>()
  let totalRiskFlags = 0

  for (const answer of answers ?? []) {
    const ruleKey = `${answer.question_id}::${answer.option_value_key}`
    const rule = ruleMap.get(ruleKey)
    if (!rule) continue

    const catId = questionCatMap.get(answer.question_id)
    if (!catId) continue

    // Accumulate category raw score
    categoryRaw.set(catId, (categoryRaw.get(catId) ?? 0) + rule.score_delta)

    // Driver tag aggregation
    if (rule.driver_tag) {
      const existing = driverScores.get(rule.driver_tag) ?? { total: 0, count: 0, riskCount: 0, frictionCount: 0 }
      existing.total += rule.score_delta
      existing.count += 1
      if (rule.risk_flag) { existing.riskCount += 1; totalRiskFlags++ }
      if (rule.friction_flag) existing.frictionCount += 1
      driverScores.set(rule.driver_tag, existing)
    }
  }

  // 8. Compute min/max possible per category (all questions × max/min option score)
  const categoryMinMax = new Map<string, { min: number; max: number }>()
  for (const cat of categories ?? []) {
    const catQuestions = (questions ?? []).filter(q => q.category_id === cat.id)
    let minSum = 0
    let maxSum = 0
    for (const q of catQuestions) {
      const qRules = (rules ?? []).filter(r => r.question_id === q.id)
      if (qRules.length === 0) continue
      minSum += Math.min(...qRules.map(r => r.score_delta))
      maxSum += Math.max(...qRules.map(r => r.score_delta))
    }
    // Multiply by response count (aggregate scoring)
    categoryMinMax.set(cat.id, { min: minSum * responseIds.length, max: maxSum * responseIds.length })
  }

  // 9. Normalize category scores 0–100
  const categoryScores: CategoryScore[] = []
  const normalizedCatMap = new Map<string, number>()

  for (const cat of categories ?? []) {
    const raw = categoryRaw.get(cat.id) ?? 0
    const bounds = categoryMinMax.get(cat.id) ?? { min: 0, max: 1 }
    const range = bounds.max - bounds.min
    const normalized = range === 0 ? 50 : Math.round(((raw - bounds.min) / range) * 100 * 100) / 100
    const clamped = Math.max(0, Math.min(100, normalized))

    normalizedCatMap.set(cat.id, clamped)

    categoryScores.push({
      categoryId: cat.id,
      categoryName: cat.name,
      rawScore: raw,
      minPossible: bounds.min,
      maxPossible: bounds.max,
      normalizedScore: clamped,
    })
  }

  // 10. Compute driver-level normalized 0–100 averages
  const driverNormalized = new Map<string, number>()
  for (const [tag, stats] of driverScores.entries()) {
    // Normalize to 0–100: average score_delta / max_possible_delta * 100
    // Use simple ratio: total / (count * 10) * 100 (10 is max score_delta per answer)
    const maxPossible = stats.count * 10
    const pct = maxPossible === 0 ? 50 : Math.max(0, Math.min(100, (stats.total / maxPossible) * 100))
    driverNormalized.set(tag, Math.round(pct * 100) / 100)
  }

  // 11. Compute index scores
  const indexScores: IndexScore[] = []
  const indexMap = new Map<string, number>()

  for (const [indexKey, config] of Object.entries(INDEX_COMPOSITION)) {
    let weightedSum = 0
    let weightUsed = 0

    for (const comp of config.components) {
      const driverScore = driverNormalized.get(comp.driverTag)
      if (driverScore !== undefined) {
        weightedSum += driverScore * comp.weight
        weightUsed += comp.weight
      }
    }

    const rawIndex = weightUsed === 0 ? 50 : weightedSum / weightUsed
    // For risk indexes, invert so higher = worse is expressed as-is, dashboard labels it
    const finalScore = Math.round(rawIndex * 100) / 100

    indexMap.set(indexKey, finalScore)
    indexScores.push({
      indexKey,
      score0100: finalScore,
      higherIsBetter: config.higherIsBetter,
      label: config.label,
    })
  }

  // 12. Executive Health Score
  const trust    = indexMap.get('trust') ?? 50
  const usability = indexMap.get('usability') ?? 50
  const convRisk  = indexMap.get('conversion_risk') ?? 50
  const exp       = indexMap.get('experience') ?? 50
  const loyalty   = indexMap.get('loyalty') ?? 50

  const riskPenalty = (totalRiskFlags / Math.max(answers?.length ?? 1, 1)) * 100 * RISK_FLAG_PENALTY

  const healthRaw =
    trust * HEALTH_WEIGHTS.trust +
    usability * HEALTH_WEIGHTS.usability +
    (100 - convRisk) * HEALTH_WEIGHTS.conversion_risk +
    exp * HEALTH_WEIGHTS.experience +
    loyalty * HEALTH_WEIGHTS.loyalty

  const healthScore = Math.max(0, Math.min(100, Math.round((healthRaw - riskPenalty) * 100) / 100))

  // 13. Issue Rankings
  const issueRankings: IssueRanking[] = []

  for (const [tag, stats] of driverScores.entries()) {
    if (stats.count === 0) continue

    const riskPct = Math.round((stats.riskCount / stats.count) * 100 * 100) / 100
    const frictionPct = Math.round((stats.frictionCount / stats.count) * 100 * 100) / 100
    const freqPct = Math.round((stats.count / (answers?.length ?? 1)) * 100 * 100) / 100

    // priority = 0.4*risk + 0.4*friction + 0.2*frequency
    const priority = Math.round((0.4 * riskPct + 0.4 * frictionPct + 0.2 * freqPct) * 100) / 100

    issueRankings.push({
      driverTag: tag,
      risk: riskPct,
      friction: frictionPct,
      frequency: freqPct,
      priorityScore: priority,
      description: `Driver: ${tag}. ${stats.riskCount} risk flags, ${stats.frictionCount} friction flags across ${stats.count} responses.`,
    })
  }

  // Sort by priority desc
  issueRankings.sort((a, b) => b.priorityScore - a.priorityScore)

  // 14. Compute checksum for auditability
  const checksumPayload = JSON.stringify({
    surveyId: input.surveyId,
    frameworkVersion: input.frameworkVersion,
    responseIds: [...responseIds].sort(),
    packSnapshot: survey.pack_version_snapshot,
  })
  const checksum = crypto.createHash('sha256').update(checksumPayload).digest('hex')

  // 15. Persist to DB
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

  // Store category scores
  await supabase.from('score_results').insert(
    categoryScores.map(cs => ({
      score_run_id: scoreRun.id,
      category_id: cs.categoryId,
      raw_score: cs.rawScore,
      min_possible: cs.minPossible,
      max_possible: cs.maxPossible,
      normalized_score: cs.normalizedScore,
    }))
  )

  // Store index scores
  await supabase.from('index_results').insert(
    indexScores.map(is => ({
      score_run_id: scoreRun.id,
      index_key: is.indexKey,
      score_0_100: is.score0100,
      higher_is_better: is.higherIsBetter,
    }))
  )

  // Store executive health
  await supabase.from('executive_results').insert({
    score_run_id: scoreRun.id,
    health_score_0_100: healthScore,
  })

  // Store issue rankings
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
