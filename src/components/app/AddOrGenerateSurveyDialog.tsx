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

type Tab = 'recommend' | 'generate'
type RecommendState = 'idle' | 'loading' | 'done' | 'error'
type GenerateStep = 'form' | 'generating' | 'done' | 'error'


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
  const [projectOverview, setProjectOverview] = useState('')
  const [targetRespondents, setTargetRespondents] = useState('')
  const [surveyBenefit, setSurveyBenefit]   = useState('')
  const [genResult, setGenResult]       = useState<GenerateResult | null>(null)
  const [genError, setGenError]         = useState<string | null>(null)
  const [copied, setCopied]             = useState(false)

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
  const isGenFormValid =
    projectOverview.trim().length > 10 &&
    targetRespondents.trim().length > 5 &&
    surveyBenefit.trim().length > 5

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
          projectOverview: projectOverview.trim(),
          targetRespondents: targetRespondents.trim(),
          surveyBenefit: surveyBenefit.trim(),
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

  // ── Open/close ────────────────────────────────────────────────────────────────
  function handleOpen() {
    setIsOpen(true)
    setTab('recommend')
    setAddError(null)
    setGenStep('form')
    setGenResult(null)
    setGenError(null)
    setCopied(false)
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
                      <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-sm text-violet-800">
                        <p className="font-medium mb-1">How it works</p>
                        <p className="text-xs text-violet-600 leading-relaxed">
                          Describe your project below. Groq will design a complete survey with
                          categories, questions and answer options — automatically published with
                          a public shareable link.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                          Project Overview <span className="text-red-400">*</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Describe what the project is about, its goals, and context.</p>
                        <textarea
                          rows={4}
                          value={projectOverview}
                          onChange={e => setProjectOverview(e.target.value)}
                          disabled={genStep === 'generating'}
                          placeholder="e.g. We are launching a new mobile banking app targeting young adults in Southeast Asia…"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{projectOverview.length} chars</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                          Target Respondents <span className="text-red-400">*</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-2">Who will answer this survey?</p>
                        <textarea
                          rows={3}
                          value={targetRespondents}
                          onChange={e => setTargetRespondents(e.target.value)}
                          disabled={genStep === 'generating'}
                          placeholder="e.g. Adults aged 18-35, tech-savvy smartphone users…"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{targetRespondents.length} chars</p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                          Benefit / Purpose of the Survey <span className="text-red-400">*</span>
                        </label>
                        <p className="text-xs text-gray-500 mb-2">What will we learn from this survey?</p>
                        <textarea
                          rows={3}
                          value={surveyBenefit}
                          onChange={e => setSurveyBenefit(e.target.value)}
                          disabled={genStep === 'generating'}
                          placeholder="e.g. Understand user pain points with existing banking apps…"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none disabled:bg-gray-50 disabled:text-gray-400"
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{surveyBenefit.length} chars</p>
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

            </div>
          </div>
        </div>
      )}
    </>
  )
}
