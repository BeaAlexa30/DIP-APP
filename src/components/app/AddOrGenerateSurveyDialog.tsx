'use client'

/**
 * AddOrGenerateSurveyDialog
 * ─────────────────────────────────────────────────────────────
 * Unified dialog that replaces AddSurveyButton + AISurveyGeneratorDialog.
 *
 * Tab 1 — "AI Recommendations"
 *   • Groq evaluates which available framework packs best fit the project
 *   • Shows ranked list with reasoning; admin clicks "Add Framework"
 *   • Non-recommended packs shown in a secondary section
 *
 * Tab 2 — "Generate New AI Survey"
 *   • Admin fills 3 prompts; Groq generates a bespoke survey
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/DatabaseClientManager'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Pack {
  id: string
  name: string
  version: string
  description: string | null
}

interface ProjectContext {
  industry: string | null
  goal: string | null
  stage: string | null
  channels: string[] | null
  target_audience: string | null
}

interface Recommendation {
  packId: string
  packName: string
  reason: string
  recommended: boolean
}

interface GenerateResult {
  surveyId: string
  token: string
  shareLink: string
  surveyTitle: string
  questionCount: number
  categoryCount: number
}

interface Props {
  projectId: string
  projectName: string
  projectContext: ProjectContext
  packs: Pack[]
  existingPackIds: string[]
}

type Tab = 'recommend' | 'generate' | 'custom'
type RecommendState = 'idle' | 'loading' | 'done' | 'error'
type GenerateStep = 'form' | 'generating' | 'done' | 'error'
type QuestionType = 'short_text' | 'long_text' | 'multiple_choice' | 'checkboxes' | 'dropdown' | 'linear_scale' | 'yes_no' | 'email' | 'url' | 'date' | 'time' | 'number'

interface CustomQuestion {
  id: string
  type: QuestionType
  prompt: string
  required: boolean
  options?: string[] // for multiple_choice, checkboxes, dropdown
  scaleMin?: number // for linear_scale
  scaleMax?: number // for linear_scale
  minLabel?: string // for linear_scale
  maxLabel?: string // for linear_scale
}


// ── Component ──────────────────────────────────────────────────────────────────

export default function AddOrGenerateSurveyDialog({
  projectId,
  projectName,
  projectContext,
  packs,
  existingPackIds,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [isOpen, setIsOpen]   = useState(false)
  const [tab, setTab]         = useState<Tab>('recommend')

  // — Recommendations state —
  const [recState, setRecState]           = useState<RecommendState>('idle')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [recError, setRecError]           = useState<string | null>(null)
  const [addingPackId, setAddingPackId]   = useState<string | null>(null)
  const [addError, setAddError]           = useState<string | null>(null)
  const [addedPackIds, setAddedPackIds]   = useState<Set<string>>(new Set())

  // — Generate state —
  const [genStep, setGenStep]           = useState<GenerateStep>('form')
  const [surveyDescription, setSurveyDescription] = useState('')
  const [showTips, setShowTips]         = useState(false)
  const [genResult, setGenResult]       = useState<GenerateResult | null>(null)
  const [genError, setGenError]         = useState<string | null>(null)
  const [copied, setCopied]             = useState(false)

  // — Custom Survey state —
  const [customSurveyTitle, setCustomSurveyTitle] = useState('')
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([])
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [customSaving, setCustomSaving] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)
  const [customSuccess, setCustomSuccess] = useState(false)

  const availablePacks = packs.filter(p =>
    !existingPackIds.includes(p.id) && !addedPackIds.has(p.id)
  )

  // ── Fetch recommendations when dialog opens on recommend tab ─────────────────
  const fetchRecommendations = useCallback(async () => {
    if (availablePacks.length === 0) return
    setRecState('loading')
    setRecError(null)
    try {
      const res = await fetch('/api/survey/recommend-frameworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          availablePackIds: availablePacks.map(p => p.id),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setRecError(json.error ?? 'Failed to get recommendations.')
        setRecState('error')
        return
      }
      setRecommendations(json.recommendations ?? [])
      setRecState('done')
    } catch (e: any) {
      setRecError(e.message)
      setRecState('error')
    }
  }, [projectId, availablePacks.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && tab === 'recommend' && recState === 'idle' && availablePacks.length > 0) {
      fetchRecommendations()
    }
  }, [isOpen, tab, recState, fetchRecommendations, availablePacks.length])

  // ── Add a recommended framework pack as a new survey ─────────────────────────
  async function handleAddPack(packId: string) {
    setAddingPackId(packId)
    setAddError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated.')

      const pack = packs.find(p => p.id === packId)
      const isAiPack = pack?.version?.startsWith('ai-')

      let snapshot: any

      if (isAiPack) {
        // AI packs store their questions in the survey JSONB snapshot, not in DB tables.
        // Reuse the snapshot from an existing survey that used this pack.
        const { data: existingSurvey, error: snapErr } = await (supabase as any)
          .from('surveys')
          .select('pack_version_snapshot')
          .eq('pack_id', packId)
          .limit(1)
          .single()
        if (snapErr || !existingSurvey) throw new Error('Could not retrieve AI framework snapshot.')
        snapshot = existingSurvey.pack_version_snapshot
      } else {
        // Standard framework: build snapshot from DB tables
        const snapRes = await fetch('/api/assessment-frameworks/capture-version', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packId }),
        })
        if (!snapRes.ok) throw new Error('Failed to create framework snapshot.')
        snapshot = await snapRes.json()
      }

      // Create survey
      const { data: survey, error: surveyErr } = await (supabase as any)
        .from('surveys')
        .insert({
          project_id: projectId,
          pack_id: packId,
          pack_version_snapshot: snapshot,
          status: 'published',
        })
        .select()
        .single()
      if (surveyErr || !survey) throw new Error(surveyErr?.message ?? 'Failed to create survey.')

      // Create token
      const token = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      await (supabase as any).from('survey_tokens').insert({
        survey_id: survey.id,
        token,
        max_responses: null,
        expires_at: null,
      })

      setAddedPackIds(prev => new Set([...prev, packId]))
      router.refresh()
    } catch (e: any) {
      setAddError(e.message)
    } finally {
      setAddingPackId(null)
    }
  }

  // ── Generate new AI survey ────────────────────────────────────────────────────
  const isGenFormValid = surveyDescription.trim().length > 20

  async function handleGenerate() {
    if (!isGenFormValid) return
    setGenStep('generating')
    setGenError(null)
    try {
      const res = await fetch('/api/survey/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          surveyDescription: surveyDescription.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) { setGenError(json.error ?? 'Failed to generate survey.'); setGenStep('error'); return }
      setGenResult(json)
      setGenStep('done')
    } catch (e: any) {
      setGenError(e.message)
      setGenStep('error')
    }
  }

  async function handleCopyLink() {
    if (!genResult) return
    await navigator.clipboard.writeText(`${window.location.origin}${genResult.shareLink}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Custom Survey Functions ───────────────────────────────────────────────────
  function addCustomQuestion(type: QuestionType) {
    const newQuestion: CustomQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      prompt: '',
      required: false,
      ...(type === 'multiple_choice' || type === 'checkboxes' || type === 'dropdown' ? { options: ['Option 1', 'Option 2'] } : {}),
      ...(type === 'linear_scale' ? { scaleMin: 1, scaleMax: 5, minLabel: 'Low', maxLabel: 'High' } : {}),
    }
    setCustomQuestions(prev => [...prev, newQuestion])
    setEditingQuestionId(newQuestion.id)
  }

  function removeCustomQuestion(id: string) {
    setCustomQuestions(prev => prev.filter(q => q.id !== id))
    if (editingQuestionId === id) setEditingQuestionId(null)
  }

  function updateCustomQuestion(id: string, updates: Partial<CustomQuestion>) {
    setCustomQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q))
  }

  function moveQuestionUp(index: number) {
    if (index === 0) return
    setCustomQuestions(prev => {
      const newList = [...prev]
      ;[newList[index - 1], newList[index]] = [newList[index], newList[index - 1]]
      return newList
    })
  }

  function moveQuestionDown(index: number) {
    if (index === customQuestions.length - 1) return
    setCustomQuestions(prev => {
      const newList = [...prev]
      ;[newList[index], newList[index + 1]] = [newList[index + 1], newList[index]]
      return newList
    })
  }

  async function handleSaveCustomSurvey() {
    if (!customSurveyTitle.trim() || customQuestions.length === 0) return
    
    // Validate all questions have prompts
    const invalidQuestions = customQuestions.filter(q => !q.prompt.trim())
    if (invalidQuestions.length > 0) {
      setCustomError('All questions must have a prompt text.')
      return
    }

    setCustomSaving(true)
    setCustomError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated.')

      // Create snapshot for custom survey
      const snapshot = {
        packName: customSurveyTitle,
        version: `custom-${Date.now()}`,
        ai_generated: false,
        custom_survey: true,
        categories: [{
          id: 'custom-category',
          name: 'Survey Questions',
          order: 1,
          questions: customQuestions.map((q, idx) => ({
            id: q.id,
            type: q.type, // Keep original type - renderer handles all types
            prompt: q.prompt,
            required: q.required,
            order: idx + 1,
            ...(q.options ? { options: q.options.map((opt, optIdx) => ({
              id: `${q.id}-opt-${optIdx}`,
              label: opt,
              value_key: opt.toLowerCase().replace(/\s+/g, '_'),
              order: optIdx + 1
            })) } : {}),
            ...(q.type === 'linear_scale' ? {
              scaleMin: q.scaleMin ?? 1,
              scaleMax: q.scaleMax ?? 5,
              minLabel: q.minLabel,
              maxLabel: q.maxLabel
            } : {}),
          }))
        }]
      }

      // Create survey
      const { data: survey, error: surveyErr } = await (supabase as any)
        .from('surveys')
        .insert({
          project_id: projectId,
          pack_id: null, // Custom survey has no pack_id
          pack_version_snapshot: snapshot,
          status: 'published',
        })
        .select()
        .single()
      
      if (surveyErr) {
        console.error('Survey creation error:', surveyErr)
        // Show detailed error to user
        throw new Error(`Database error: ${surveyErr?.message || 'Failed to create survey'}\n\nIf you see "null value in column pack_id" or "violates not-null constraint", you need to run the database migration to allow custom surveys.`)
      }
      if (!survey) throw new Error('Failed to create survey.')

      console.log('✅ Custom survey created successfully:', survey.id)
      console.log('Survey data:', survey)

      // Create token
      const token = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      const { error: tokenErr } = await (supabase as any).from('survey_tokens').insert({
        survey_id: survey.id,
        token,
        max_responses: null,
        expires_at: null,
      })

      if (tokenErr) {
        console.error('Token creation error:', tokenErr)
        throw new Error(tokenErr?.message ?? 'Failed to create survey token.')
      }

      console.log('✅ Token created successfully')
      
      setCustomSuccess(true)
      
      // Force page refresh after short delay
      setTimeout(() => {
        console.log('Refreshing page to show new survey...')
        router.refresh()
        handleClose()
      }, 1500)
    } catch (e: any) {
      setCustomError(e.message)
    } finally {
      setCustomSaving(false)
    }
  }

  // ── Open/close ────────────────────────────────────────────────────────────────
  function handleOpen() {
    setIsOpen(true)
    setTab('recommend')
    setAddError(null)
    setGenStep('form')
    setSurveyDescription('')
    setShowTips(false)
    setGenResult(null)
    setGenError(null)
    setCopied(false)
    setCustomSurveyTitle('')
    setCustomQuestions([])
    setEditingQuestionId(null)
    setCustomSaving(false)
    setCustomError(null)
    setCustomSuccess(false)
    // Reset recommendations if packs changed
    if (recState === 'idle' || addedPackIds.size > 0) {
      setRecommendations([])
      setRecState('idle')
    }
  }

  function handleClose() {
    setIsOpen(false)
    if (genStep === 'done') router.refresh()
  }

  // ── Group recommendations ────────────────────────────────────────────────────
  const recommended   = recommendations.filter(r => r.recommended)
  const notRecommended = recommendations.filter(r => !r.recommended)

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Single trigger button */}
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-medium px-5 py-3 rounded-xl transition-all shadow-sm"
      >
        <span className="text-base">✨</span>
        Add or Generate AI Survey
      </button>

      {/* Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">

            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between rounded-t-2xl z-10">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-lg">✨</span>
                  <h2 className="text-lg font-bold text-gray-900">Add or Generate AI Survey</h2>
                  <span className="text-xs bg-violet-100 text-violet-700 font-medium px-2 py-0.5 rounded-full">
                    Powered by Groq
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Project: <span className="font-medium text-gray-700">{projectName}</span>
                </p>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-0.5">×</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              <button
                onClick={() => setTab('recommend')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'recommend'
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                AI Recommendations
              </button>
              <button
                onClick={() => setTab('generate')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'generate'
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Generate New Survey
              </button>
              <button
                onClick={() => setTab('custom')}
                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  tab === 'custom'
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Create Custom
              </button>
            </div>

            <div className="px-6 py-6 space-y-5 flex-1">

              {/* ══════════ TAB: AI Recommendations ══════════ */}
              {tab === 'recommend' && (
                <>
                  {availablePacks.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                      <p className="text-base mb-1">All available frameworks are already added.</p>
                      <p className="text-xs">Switch to the "Generate New Survey" tab to create a custom one.</p>
                    </div>
                  )}

                  {/* Loading */}
                  {recState === 'loading' && availablePacks.length > 0 && (
                    <div className="py-10 flex flex-col items-center gap-3 text-gray-500">
                      <span className="animate-spin w-8 h-8 border-4 border-violet-300 border-t-violet-600 rounded-full inline-block" />
                      <p className="text-sm">Groq is analyzing your project and finding applicable frameworks…</p>
                    </div>
                  )}

                  {/* Error */}
                  {recState === 'error' && (
                    <div className="space-y-3">
                      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                        {recError}
                      </div>
                      <button
                        onClick={fetchRecommendations}
                        className="text-sm text-violet-600 hover:underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Results */}
                  {recState === 'done' && availablePacks.length > 0 && (
                    <>
                      {addError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                          {addError}
                        </div>
                      )}

                      {/* Recommended packs */}
                      {recommended.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Applicable to this project
                          </p>
                          <div className="space-y-3">
                            {recommended.map(rec => {
                              const pack = packs.find(p => p.id === rec.packId)
                              const isAdded = addedPackIds.has(rec.packId)
                              const isAdding = addingPackId === rec.packId
                              if (!pack || isAdded) return null
                              return (
                                <div
                                  key={rec.packId}
                                  className="border border-violet-200 bg-violet-50 rounded-xl p-4"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="text-sm font-semibold text-gray-900">{rec.packName}</span>
                                        <span className="text-xs font-mono text-violet-500 bg-white px-1.5 py-0.5 rounded border border-violet-200">
                                          v{pack.version}
                                        </span>
                                        <span className="text-xs font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                                          Recommended
                                        </span>
                                      </div>
                                      <p className="text-xs text-violet-800 leading-relaxed">{rec.reason}</p>
                                    </div>
                                    <button
                                      onClick={() => handleAddPack(rec.packId)}
                                      disabled={!!addingPackId}
                                      className="shrink-0 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                                    >
                                      {isAdding ? 'Adding…' : 'Add Framework'}
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Not applicable packs */}
                      {notRecommended.length > 0 && notRecommended.some(r => !addedPackIds.has(r.packId) && packs.find(p => p.id === r.packId)) && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-2">
                            Not applicable to this project
                          </p>
                          <div className="space-y-2">
                            {notRecommended.map(rec => {
                              const pack = packs.find(p => p.id === rec.packId)
                              const isAdded = addedPackIds.has(rec.packId)
                              const isAdding = addingPackId === rec.packId
                              if (!pack || isAdded) return null
                              return (
                                <div key={rec.packId} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className="text-sm font-medium text-gray-700">{rec.packName}</span>
                                        <span className="text-xs font-mono text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                          v{pack.version}
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-500 leading-relaxed">{rec.reason}</p>
                                    </div>
                                    <button
                                      onClick={() => handleAddPack(rec.packId)}
                                      disabled={!!addingPackId}
                                      className="shrink-0 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                                    >
                                      {isAdding ? 'Adding…' : 'Add Anyway'}
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Re-analyze button */}
                      <div className="pt-2 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() => { setRecState('idle'); setRecommendations([]); }}
                          className="text-xs text-violet-500 hover:text-violet-700 hover:underline"
                        >
                          Re-analyze frameworks
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ══════════ TAB: Generate New AI Survey ══════════ */}
              {tab === 'generate' && (
                <>
                  {(genStep === 'form' || genStep === 'generating') && (
                    <>
                      {/* Tips panel */}
                      <div className="border border-amber-200 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowTips(v => !v)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                        >
                          <span className="flex items-center gap-2">💡 Prompting Tips for Better Surveys</span>
                          <span className="text-amber-600 text-xs">{showTips ? '▲ Hide' : '▼ Show'}</span>
                        </button>
                        {showTips && (
                          <div className="px-4 py-4 bg-white text-xs text-gray-600 space-y-3 border-t border-amber-100">
                            <div>
                              <p className="font-semibold text-gray-800 mb-0.5">1. Persona</p>
                              <p>Tell the AI who it is — e.g. <em>"Act as a Senior UX Researcher"</em> or <em>"Market Analyst"</em>.</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 mb-0.5">2. Length / Completion Time</p>
                              <p>Specify how long the survey should take — e.g. <em>"3 minutes max"</em> or a target number of questions.</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 mb-0.5">3. Question Types</p>
                              <p>Define the mix — e.g. <em>"70% Likert scale, 20% Multiple choice, 10% Open-ended"</em>.</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 mb-0.5">4. Tone / Style</p>
                              <p>Specify if you want formal, conversational, or friendly phrasing.</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 mb-0.5">5. Constraints</p>
                              <p>Mention what to avoid — e.g. <em>"Avoid leading questions,"</em> <em>"No jargon,"</em> or <em>"Don't ask for PII/personal data"</em>.</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-800 mb-0.5">6. Logical Flow</p>
                              <p>Specify skip logic if needed — e.g. <em>"If they answer No to Q2, skip to Q5"</em>.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Single description input */}
                      <div>
                        <label htmlFor="survey-description" className="block text-sm font-semibold text-gray-800 mb-1.5">
                          Survey Description <span className="text-red-400">*</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Describe your project, target respondents, purpose, preferred question types, tone, and any special instructions — all in one place.
                        </p>
                        <textarea
                          id="survey-description"
                          name="surveyDescription"
                          rows={8}
                          value={surveyDescription}
                          onChange={e => setSurveyDescription(e.target.value)}
                          disabled={genStep === 'generating'}
                          placeholder={`e.g. Act as a Senior UX Researcher. Create a 3-minute customer satisfaction survey for a mobile banking app targeting adults aged 18–35 in Southeast Asia. Use 60% Likert scale and 40% multiple choice questions. Keep the tone friendly and conversational. Avoid jargon and don't ask for personal data. Goal: understand pain points with existing banking apps.`}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{surveyDescription.length} chars</p>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleClose}
                          disabled={genStep === 'generating'}
                          className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleGenerate}
                          disabled={!isGenFormValid || genStep === 'generating'}
                          className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                        >
                          {genStep === 'generating' ? (
                            <>
                              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                              Generating Survey…
                            </>
                          ) : (
                            <><span>✨</span> Generate Survey</>
                          )}
                        </button>
                      </div>

                      {genStep === 'generating' && (
                        <p className="text-center text-sm text-gray-500 animate-pulse">
                          AI is crafting your survey — this usually takes 5–15 seconds…
                        </p>
                      )}
                    </>
                  )}

                  {/* Done */}
                  {genStep === 'done' && genResult && (
                    <div className="space-y-5">
                      <div className="text-center py-2">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                          <span className="text-3xl">🎉</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">Survey Created!</h3>
                        <p className="text-sm text-gray-500">Your AI-generated survey is live and publicly accessible.</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <p className="text-sm font-semibold text-gray-800">{genResult.surveyTitle}</p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>📂 {genResult.categoryCount} categories</span>
                          <span>❓ {genResult.questionCount} questions</span>
                          <span className="text-green-600 font-medium">✓ Published</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Public Shareable Link</label>
                        <div className="flex items-center gap-2">
                          <input
                            readOnly
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}${genResult.shareLink}`}
                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 focus:outline-none"
                            onClick={e => (e.target as HTMLInputElement).select()}
                          />
                          <button
                            onClick={handleCopyLink}
                            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                              copied
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-violet-600 hover:bg-violet-700 text-white'
                            }`}
                          >
                            {copied ? '✓ Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-3 pt-1">
                        <button onClick={handleClose} className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                          Close
                        </button>
                        <a
                          href={genResult.shareLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors text-center"
                        >
                          Preview Survey →
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {genStep === 'error' && (
                    <div className="space-y-4">
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                        <p className="font-medium mb-1">Generation Failed</p>
                        <p>{genError}</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handleClose} className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                        <button onClick={() => setGenStep('form')} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">Try Again</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ══════════ TAB: Create Custom Survey ══════════ */}
              {tab === 'custom' && (
                <>
                  {!customSuccess ? (
                    <>
                      {/* Survey Title */}
                      <div>
                        <label htmlFor="custom-survey-title" className="block text-sm font-semibold text-gray-800 mb-2">
                          Survey Title <span className="text-red-400">*</span>
                        </label>
                        <input
                          id="custom-survey-title"
                          name="customSurveyTitle"
                          type="text"
                          value={customSurveyTitle}
                          onChange={e => setCustomSurveyTitle(e.target.value)}
                          placeholder="e.g., Customer Satisfaction Survey"
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                      </div>

                      {/* Questions List */}
                      {customQuestions.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Questions ({customQuestions.length})
                          </p>
                          {customQuestions.map((question, index) => (
                            <QuestionEditor
                              key={question.id}
                              question={question}
                              index={index}
                              isEditing={editingQuestionId === question.id}
                              onEdit={() => setEditingQuestionId(question.id)}
                              onUpdate={(updates) => updateCustomQuestion(question.id, updates)}
                              onRemove={() => removeCustomQuestion(question.id)}
                              onMoveUp={() => moveQuestionUp(index)}
                              onMoveDown={() => moveQuestionDown(index)}
                              canMoveUp={index > 0}
                              canMoveDown={index < customQuestions.length - 1}
                            />
                          ))}
                        </div>
                      )}

                      {/* Add Question Buttons */}
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs font-semibold text-gray-600 mb-3">Add Question Type:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => addCustomQuestion('short_text')} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            📝 Short Text
                          </button>
                          <button onClick={() => addCustomQuestion('long_text')} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            📄 Long Text
                          </button>
                          <button onClick={() => addCustomQuestion('multiple_choice')} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            ⭕ Multiple Choice
                          </button>
                          <button onClick={() => addCustomQuestion('checkboxes')} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            ☑️ Checkboxes
                          </button>
                          <button onClick={() => addCustomQuestion('dropdown')} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            🔽 Dropdown
                          </button>
                          <button onClick={() => addCustomQuestion('linear_scale')} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            📊 Linear Scale
                          </button>
                          <button onClick={() => addCustomQuestion('yes_no')} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            ✓✗ Yes/No
                          </button>
                          <button onClick={() => addCustomQuestion('email')} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            ✉️ Email
                          </button>
                          <button onClick={() => addCustomQuestion('url')} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            🔗 URL
                          </button>
                          <button onClick={() => addCustomQuestion('date')} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            📅 Date
                          </button>
                          <button onClick={() => addCustomQuestion('time')} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            🕐 Time
                          </button>
                          <button onClick={() => addCustomQuestion('number')} className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                            🔢 Number
                          </button>
                        </div>
                      </div>

                      {/* Error Display */}
                      {customError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                          {customError}
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2 border-t border-gray-100">
                        <button
                          onClick={handleClose}
                          disabled={customSaving}
                          className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveCustomSurvey}
                          disabled={!customSurveyTitle.trim() || customQuestions.length === 0 || customSaving}
                          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                        >
                          {customSaving ? (
                            <>
                              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                              Creating Survey…
                            </>
                          ) : (
                            <>💾 Create Survey ({customQuestions.length} questions)</>
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-3xl">✓</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">Survey Created!</h3>
                      <p className="text-sm text-gray-500">Your custom survey has been created successfully.</p>
                    </div>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Question Editor Component ──────────────────────────────────────────────────
interface QuestionEditorProps {
  question: CustomQuestion
  index: number
  isEditing: boolean
  onEdit: () => void
  onUpdate: (updates: Partial<CustomQuestion>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}

function QuestionEditor({
  question,
  index,
  isEditing,
  onEdit,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: QuestionEditorProps) {
  const questionTypeLabels: Record<QuestionType, string> = {
    short_text: 'Short Text',
    long_text: 'Long Text',
    multiple_choice: 'Multiple Choice',
    checkboxes: 'Checkboxes',
    dropdown: 'Dropdown',
    linear_scale: 'Linear Scale',
    yes_no: 'Yes/No',
    email: 'Email',
    url: 'URL',
    date: 'Date',
    time: 'Time',
    number: 'Number',
  }

  const addOption = () => {
    const currentOptions = question.options || []
    onUpdate({ options: [...currentOptions, `Option ${currentOptions.length + 1}`] })
  }

  const updateOption = (optIndex: number, value: string) => {
    const newOptions = [...(question.options || [])]
    newOptions[optIndex] = value
    onUpdate({ options: newOptions })
  }

  const removeOption = (optIndex: number) => {
    const newOptions = (question.options || []).filter((_, i) => i !== optIndex)
    onUpdate({ options: newOptions })
  }

  return (
    <div className={`border rounded-xl p-4 ${isEditing ? 'border-violet-300 bg-violet-50/30' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        {/* Question Number */}
        <div className="shrink-0 w-8 h-8 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-sm font-semibold">
          {index + 1}
        </div>

        {/* Question Content */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Question Prompt */}
          <div>
            <input
              id={`question-prompt-${question.id}`}
              name={`questionPrompt_${question.id}`}
              type="text"
              value={question.prompt}
              onChange={e => onUpdate({ prompt: e.target.value })}
              onFocus={onEdit}
              placeholder="Enter your question here..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          {/* Question Type Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {questionTypeLabels[question.type]}
            </span>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input
                id={`question-required-${question.id}`}
                name={`questionRequired_${question.id}`}
                type="checkbox"
                checked={question.required}
                onChange={e => onUpdate({ required: e.target.checked })}
                className="w-3.5 h-3.5 accent-violet-600"
              />
              Required
            </label>
          </div>

          {/* Options (for multiple_choice, checkboxes, dropdown) */}
          {(question.type === 'multiple_choice' || question.type === 'checkboxes' || question.type === 'dropdown') && isEditing && (
            <div className="space-y-2 pl-2 border-l-2 border-violet-200">
              <p className="text-xs font-medium text-gray-600">Options:</p>
              {(question.options || []).map((option, optIndex) => (
                <div key={optIndex} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{optIndex + 1}.</span>
                  <input
                    id={`option-${question.id}-${optIndex}`}
                    name={`option_${question.id}_${optIndex}`}
                    type="text"
                    value={option}
                    onChange={e => updateOption(optIndex, e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                  {(question.options || []).length > 2 && (
                    <button
                      onClick={() => removeOption(optIndex)}
                      className="text-red-500 hover:text-red-700 text-xs px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addOption}
                className="text-xs text-violet-600 hover:text-violet-700 font-medium"
              >
                + Add Option
              </button>
            </div>
          )}

          {/* Scale Settings (for linear_scale) */}
          {question.type === 'linear_scale' && isEditing && (
            <div className="space-y-2 pl-2 border-l-2 border-violet-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`scale-min-${question.id}`} className="text-xs text-gray-600">Min Value</label>
                  <input
                    id={`scale-min-${question.id}`}
                    name={`scaleMin_${question.id}`}
                    type="number"
                    value={question.scaleMin || 1}
                    onChange={e => onUpdate({ scaleMin: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div>
                  <label htmlFor={`scale-max-${question.id}`} className="text-xs text-gray-600">Max Value</label>
                  <input
                    id={`scale-max-${question.id}`}
                    name={`scaleMax_${question.id}`}
                    type="number"
                    value={question.scaleMax || 5}
                    onChange={e => onUpdate({ scaleMax: parseInt(e.target.value) || 5 })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`scale-min-label-${question.id}`} className="text-xs text-gray-600">Min Label</label>
                  <input
                    id={`scale-min-label-${question.id}`}
                    name={`scaleMinLabel_${question.id}`}
                    type="text"
                    value={question.minLabel || ''}
                    onChange={e => onUpdate({ minLabel: e.target.value })}
                    placeholder="e.g., Low"
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div>
                  <label htmlFor={`scale-max-label-${question.id}`} className="text-xs text-gray-600">Max Label</label>
                  <input
                    id={`scale-max-label-${question.id}`}
                    name={`scaleMaxLabel_${question.id}`}
                    type="text"
                    value={question.maxLabel || ''}
                    onChange={e => onUpdate({ maxLabel: e.target.value })}
                    placeholder="e.g., High"
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move down"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            className="p-1 text-red-400 hover:text-red-600"
            title="Remove question"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}

