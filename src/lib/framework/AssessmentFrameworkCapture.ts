/**
 * Framework Pack Snapshot Utility
 * Creates a frozen, versioned snapshot of a framework pack for a survey.
 * This snapshot is stored with the survey and used for deterministic scoring.
 */

import { createClient } from '@/lib/supabase/ServerSideDbConnector'

export interface FrameworkSnapshot {
  packId: string
  packName: string
  version: string
  snapshotAt: string
  categories: Array<{
    id: string
    name: string
    weight: number
    order: number
    questions: Array<{
      id: string
      type: string
      prompt: string
      required: boolean
      order: number
      options: Array<{
        id: string
        label: string
        value_key: string
        order: number
      }>
      scoring_rules: Array<{
        option_value_key: string
        score_delta: number
        risk_flag: boolean
        friction_flag: boolean
        driver_tag: string | null
      }>
    }>
  }>
}

export async function createFrameworkSnapshot(packId: string): Promise<FrameworkSnapshot> {
  const supabase = await createClient()

  const [packResult, catsResult, questionsResult, optionsResult, rulesResult] = await Promise.all([
    supabase.from('framework_packs').select('*').eq('id', packId).single(),
    supabase.from('framework_categories').select('*').eq('pack_id', packId).order('order_index'),
    supabase.from('framework_questions').select('*').eq('pack_id', packId).order('order_index'),
    supabase
      .from('framework_options')
      .select('*, framework_questions!inner(pack_id)')
      .eq('framework_questions.pack_id', packId)
      .order('order_index'),
    supabase
      .from('framework_scoring_rules')
      .select('*, framework_questions!inner(pack_id)')
      .eq('framework_questions.pack_id', packId),
  ])

  if (packResult.error || !packResult.data) throw new Error('Pack not found')

  const pack = packResult.data
  const cats = catsResult.data ?? []
  const questions = questionsResult.data ?? []
  const options = optionsResult.data ?? []
  const rules = rulesResult.data ?? []

  const snapshot: FrameworkSnapshot = {
    packId: pack.id,
    packName: pack.name,
    version: pack.version,
    snapshotAt: new Date().toISOString(),
    categories: cats.map(cat => ({
      id: cat.id,
      name: cat.name,
      weight: cat.weight,
      order: cat.order_index,
      questions: questions
        .filter(q => q.category_id === cat.id)
        .map(q => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          required: q.required,
          order: q.order_index,
          options: options
            .filter(o => o.question_id === q.id)
            .map(o => ({
              id: o.id,
              label: o.label,
              value_key: o.value_key,
              order: o.order_index,
            })),
          scoring_rules: rules
            .filter(r => r.question_id === q.id)
            .map(r => ({
              option_value_key: r.option_value_key,
              score_delta: r.score_delta,
              risk_flag: r.risk_flag,
              friction_flag: r.friction_flag,
              driver_tag: r.driver_tag,
            })),
        })),
    })),
  }

  return snapshot
}
