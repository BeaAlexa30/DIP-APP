'use client'

import { Button } from '@/components/ui/button'
import { useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type OptionActionType = 'continue' | 'submit' | 'jump'

interface OptionAction {
  type: OptionActionType
  /** Only populated when type === 'jump' */
  targetSectionId?: string
}

interface Option {
  id: string
  label: string
  value_key: string
  order: number
  /** Optional conditional navigation assigned in the builder */
  action?: OptionAction
}

interface Question {
  id: string
  type: string
  prompt: string
  required: boolean
  order: number
  options: Option[]
  scaleMin?: number
  scaleMax?: number
  minLabel?: string
  maxLabel?: string
}

interface RichTextContent { text: string; marks?: any[] }

interface Category {
  id: string
  name: string
  order: number
  questions: Question[]
  description?: string | RichTextContent
}

interface Snapshot {
  packName: string
  version: string
  categories: Category[]
  ai_generated?: boolean
  description?: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SurveyFlow({
  surveyId,
  tokenId,
  snapshot,
  isAiSurvey,
}: {
  surveyId: string
  tokenId: string
  snapshot: Snapshot
  isAiSurvey?: boolean
}) {
  const sortedCategories = [...snapshot.categories].sort((a, b) => a.order - b.order)

  // Flat list of all questions — used only for the submit payload
  const allQuestions: (Question & { categoryName: string })[] = sortedCategories.flatMap(cat =>
    [...cat.questions].sort((a, b) => a.order - b.order).map(q => ({ ...q, categoryName: cat.name }))
  )

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [answers, setAnswers]       = useState<Record<string, string>>({})
  const [submitted, setSubmitted]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [startTime]                 = useState(Date.now())

  /**
   * arrivedViaJump
   * Flips to true the first time the respondent lands on a section via a JUMP
   * action. Stays true permanently — once sections have been skipped, going
   * back would put the flow in an inconsistent state, so Back is locked for
   * the rest of the session.
   */
  const [arrivedViaJump, setArrivedViaJump] = useState(false)

  // ─── Derived section data ─────────────────────────────────────────────────

  const currentSection            = sortedCategories[currentSectionIndex]
  const currentSectionQuestions   = [...(currentSection?.questions ?? [])].sort((a, b) => a.order - b.order)
  const questionsInCurrentSection = currentSectionQuestions.length
  const progress                  = (currentSectionIndex / sortedCategories.length) * 100
  const canGoBack                 = currentSectionIndex > 0 && !arrivedViaJump

  // ─── Validation ──────────────────────────────────────────────────────────

  const isAnswered = useCallback((q: Question, currentAnswers = answers): boolean => {
    if (!q.required) return true
    const answer = currentAnswers[q.id]
    if (!answer || answer.trim() === '') return false
    if (q.type === 'checkbox' || q.type === 'checkboxes') {
      const limit    = (q as any).selectionLimit?.type
      const count    = (q as any).selectionLimit?.count
      const selected = answer.split(',').filter(Boolean).length
      if (limit === 'min'   && count && selected < count)   return false
      if (limit === 'exact' && count && selected !== count) return false
    }
    return true
  }, [answers])

  const canAdvanceSection = currentSectionQuestions.every(q => isAnswered(q))

  // ─── Answer handler — selection ONLY, zero navigation side-effects ────────

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  const doSubmit = useCallback(async (latestAnswers: Record<string, string>) => {
    setSubmitting(true)
    setError(null)

    const completionTime = Math.round((Date.now() - startTime) / 1000)
    const aiSurvey = isAiSurvey || snapshot.ai_generated || (snapshot as any).custom_survey
    const endpoint = aiSurvey
      ? '/api/assessments/submit-ai-response'
      : '/api/assessments/submit-response'

    const textTypes = ['text', 'textarea', 'long_text', 'short_text', 'email', 'url', 'number']
    const answerRows = allQuestions
      .filter(q => latestAnswers[q.id]?.trim())
      .map(q => {
        if (aiSurvey) {
          const isText = textTypes.includes(q.type)
          return {
            questionId:     q.id,
            questionPrompt: q.prompt,
            valueKey:  !isText ? latestAnswers[q.id] : undefined,
            freeText:   isText ? latestAnswers[q.id] : undefined,
          }
        }
        return { questionId: q.id, valueKey: latestAnswers[q.id] }
      })

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surveyId,
        tokenId,
        answers: answerRows,
        respondentMeta: {
          userAgent:             navigator.userAgent,
          completionTimeSeconds: completionTime,
          platform:              navigator.platform,
        },
      }),
    })

    if (!res.ok) {
      const json = await res.json()
      setError(json.error ?? 'Failed to submit response. Please try again.')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    setSubmitted(true)
  }, [allQuestions, isAiSurvey, snapshot, startTime, surveyId, tokenId])

  // ─── Next — deferred action resolution ───────────────────────────────────
  //
  // Walk every question in the current section top-to-bottom. For the first
  // multiple-choice / dropdown question whose selected option carries a
  // non-default action, execute that action and return early. If no such
  // action is found, advance to the next section normally.
  //
  // "First match wins" is deterministic and mirrors Google Forms' behaviour
  // when a section contains multiple jump-capable questions.

  const handleNext = useCallback(async () => {
    for (const question of currentSectionQuestions) {
      // Only these types carry per-option actions
      const supportsActions =
        question.type === 'multiple_choice' ||
        question.type === 'single_select'   ||
        question.type === 'radio'           ||
        question.type === 'dropdown'

      if (!supportsActions || !question.options?.length) continue

      const selectedValue  = answers[question.id]
      if (!selectedValue) continue

      const selectedOption = question.options.find(o => o.value_key === selectedValue)
      const action         = selectedOption?.action

      if (!action || action.type === 'continue') continue

      // — SUBMIT —
      if (action.type === 'submit') {
        await doSubmit(answers)
        return
      }

      // — JUMP —
      if (action.type === 'jump' && action.targetSectionId) {
        const targetIdx = sortedCategories.findIndex(s => s.id === action.targetSectionId)
        if (targetIdx !== -1) {
          setArrivedViaJump(true)     // lock Back for the rest of the session
          setCurrentSectionIndex(targetIdx)
          window.scrollTo(0, 0)
          return
        }
      }
    }

    // No actionable selection found — advance normally
    if (currentSectionIndex < sortedCategories.length - 1) {
      setCurrentSectionIndex(i => i + 1)
      window.scrollTo(0, 0)
    }
  }, [answers, currentSectionIndex, currentSectionQuestions, doSubmit, sortedCategories])

  const handleBack = () => {
    if (canGoBack) {
      setCurrentSectionIndex(i => i - 1)
      window.scrollTo(0, 0)
    }
  }

  const handleSubmit = () => doSubmit(answers)

  // ─── Rich text renderer ───────────────────────────────────────────────────

  const renderRichText = (content: string | RichTextContent | undefined | null) => {
    if (!content) return null
    const text  = typeof content === 'string' ? content : content.text
    const marks = typeof content === 'object' && content.marks ? content.marks : []
    if (!marks.length) return text

    const sorted = [...marks].sort((a, b) => a.start - b.start)
    const segments: Array<{ text: string; marks: any[] }> = []
    let lastEnd = 0

    sorted.forEach(mark => {
      if (mark.start > lastEnd)
        segments.push({ text: text.substring(lastEnd, mark.start), marks: [] })
      const markText = text.substring(mark.start, mark.end)
      if (!segments.find(s => s.text === markText && s.marks.some(m => m.type === mark.type)))
        segments.push({ text: markText, marks: [mark] })
      lastEnd = mark.end
    })
    if (lastEnd < text.length)
      segments.push({ text: text.substring(lastEnd), marks: [] })

    return (
      <span>
        {segments.map((seg, idx) => {
          let el: React.ReactNode = seg.text
          seg.marks.forEach(mark => {
            if      (mark.type === 'bold')          el = <strong key={`${idx}-b`}>{el}</strong>
            else if (mark.type === 'italic')        el = <em     key={`${idx}-i`}>{el}</em>
            else if (mark.type === 'underline')     el = <u      key={`${idx}-u`}>{el}</u>
            else if (mark.type === 'strikethrough') el = <s      key={`${idx}-s`}>{el}</s>
            else if (mark.type === 'link' && mark.url)
              el = <a key={`${idx}-a`} href={mark.url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-700">{el}</a>
          })
          return <span key={idx}>{el}</span>
        })}
      </span>
    )
  }

  const sectionColors = ['bg-slate-100', 'bg-amber-100', 'bg-stone-100', 'bg-cyan-100']

  // ─── Thank-you screen ─────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
          <p className="text-gray-500 text-sm">
            Your response has been recorded. Your feedback helps drive better business decisions.
          </p>
        </div>
      </div>
    )
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-700">{snapshot.packName}</p>
              <p className="text-xs text-gray-400">
                Section {currentSectionIndex + 1} of {sortedCategories.length}
              </p>
            </div>
            <p className="text-xs text-gray-400">{Math.round(progress)}% complete</p>
          </div>

          {currentSectionIndex === 0 && snapshot.description && (
            <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 whitespace-pre-wrap">
              {renderRichText(snapshot.description)}
            </div>
          )}
        </div>

        <div className="max-w-3xl mx-auto mt-3">
          <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-3xl">
          {currentSection && (
            <div className="space-y-6">

              {/* Section header */}
              <div className={`${sectionColors[currentSectionIndex % sectionColors.length]} rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8`}>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 bg-gray-200 px-2 py-1 rounded inline-block w-fit">
                  {currentSection.name}
                </p>
                {currentSection.description && (
                  <div className="mb-4 p-4 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-800 whitespace-pre-wrap font-medium">
                    {renderRichText(currentSection.description)}
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {questionsInCurrentSection} question{questionsInCurrentSection !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Questions */}
              {currentSectionQuestions.map((question, qIndex) => (
                <div key={question.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
                  <div className="flex gap-4">
                    <div className="shrink-0 w-8 h-8 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-sm font-semibold">
                      {qIndex + 1}
                    </div>
                    <div className="flex-1 w-9/12 sm:w-10/12">
                      <h3 className="text-lg font-semibold text-gray-900 leading-snug mb-5 break-words">
                        {question.prompt}
                        {question.required && <span className="text-red-400 ml-1">*</span>}
                      </h3>

                      {/* ── Multiple Choice ─────────────────────────────────── */}
                      {(question.type === 'single_select' || question.type === 'radio' || question.type === 'multiple_choice') && (
                        <div className="space-y-2">
                          {[...question.options].sort((a, b) => a.order - b.order).map(opt => {
                            const isOther    = opt.value_key === '__other__'
                            const isSelected = isOther
                              ? answers[question.id]?.startsWith('__other__:')
                              : answers[question.id] === opt.value_key

                            return (
                              <div key={opt.value_key}>
                                {isOther ? (
                                  <Button
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="w-full justify-start px-4 py-2 rounded-xl h-auto"
                                    onClick={() => { if (!isSelected) handleAnswer(question.id, '__other__:') }}
                                  >
                                    <span className="shrink-0 text-sm font-medium">Other:</span>
                                    <input
                                      type="text"
                                      value={answers[question.id]?.startsWith('__other__:')
                                        ? answers[question.id].replace('__other__:', '') : ''}
                                      onFocus={() => { if (!isSelected) handleAnswer(question.id, '__other__:') }}
                                      onChange={e => {
                                        e.stopPropagation()
                                        setAnswers(prev => ({ ...prev, [question.id]: `__other__:${e.target.value}` }))
                                      }}
                                      onClick={e => e.stopPropagation()}
                                      placeholder="Please specify..."
                                      className={`flex-1 text-sm focus:outline-none bg-transparent ${
                                        isSelected ? 'text-white placeholder:text-white/60' : 'text-gray-700 placeholder:text-gray-400'
                                      }`}
                                    />
                                  </Button>
                                ) : (
                                  // Pure selection only — action is deferred to handleNext
                                  <Button
                                    onClick={() => handleAnswer(question.id, opt.value_key)}
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="w-full text-left justify-start px-4 py-3 rounded-xl text-sm transition-all"
                                  >
                                    {opt.label}
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* ── Checkboxes (no jump logic — multi-select is ambiguous) ── */}
                      {(question.type === 'checkbox' || question.type === 'checkboxes') && (
                        <div className="space-y-2">
                          {[...question.options].sort((a, b) => a.order - b.order).map(opt => {
                            const currentAnswers = answers[question.id]?.split(',').filter(Boolean) || []
                            const isOther        = opt.value_key === '__other__'
                            const isSelected     = isOther
                              ? currentAnswers.some(a => a.startsWith('__other__:'))
                              : currentAnswers.includes(opt.value_key)
                            const limit      = (question as any).selectionLimit?.type
                            const count      = (question as any).selectionLimit?.count
                            const maxReached = (limit === 'max' || limit === 'exact') && count && currentAnswers.length >= count

                            return (
                              <div key={opt.value_key}>
                                {isOther ? (
                                  <Button
                                    variant={isSelected ? 'default' : 'outline'}
                                    disabled={!isSelected && !!maxReached}
                                    className="w-full justify-start px-4 py-2 rounded-xl h-auto"
                                    onClick={() => {
                                      if (!isSelected && maxReached) return
                                      const without = currentAnswers.filter(a => !a.startsWith('__other__:'))
                                      setAnswers(prev => ({
                                        ...prev,
                                        [question.id]: isSelected ? without.join(',') : [...without, '__other__:'].join(',')
                                      }))
                                    }}
                                  >
                                    <span className="shrink-0 text-sm font-medium">Other:</span>
                                    <input
                                      type="text"
                                      value={currentAnswers.find(a => a.startsWith('__other__:'))?.replace('__other__:', '') ?? ''}
                                      onFocus={() => {
                                        if (!isSelected && !maxReached) {
                                          const without = currentAnswers.filter(a => !a.startsWith('__other__:'))
                                          setAnswers(prev => ({ ...prev, [question.id]: [...without, '__other__:'].join(',') }))
                                        }
                                      }}
                                      onChange={e => {
                                        e.stopPropagation()
                                        const without = currentAnswers.filter(a => !a.startsWith('__other__:'))
                                        setAnswers(prev => ({ ...prev, [question.id]: [...without, `__other__:${e.target.value}`].join(',') }))
                                      }}
                                      onClick={e => e.stopPropagation()}
                                      placeholder="Please specify..."
                                      className={`flex-1 text-sm focus:outline-none bg-transparent ${
                                        isSelected ? 'text-white placeholder:text-white/60' : 'text-gray-700 placeholder:text-gray-400'
                                      }`}
                                    />
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      if (!isSelected && maxReached) return
                                      const updated = isSelected
                                        ? currentAnswers.filter(a => a !== opt.value_key)
                                        : [...currentAnswers, opt.value_key]
                                      setAnswers(prev => ({ ...prev, [question.id]: updated.join(',') }))
                                    }}
                                    disabled={!isSelected && !!maxReached}
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="w-full text-left justify-start px-4 py-3 rounded-xl text-sm transition-all"
                                  >
                                    {opt.label}
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                          {(() => {
                            const limit = (question as any).selectionLimit?.type
                            const count = (question as any).selectionLimit?.count
                            if (!limit || limit === 'unlimited' || !count) return null
                            const sel  = answers[question.id]?.split(',').filter(Boolean) || []
                            const msgs: Record<string, string> = {
                              max:   `Select up to ${count} option(s)`,
                              min:   `Select at least ${count} option(s) — ${sel.length} selected`,
                              exact: `Select exactly ${count} option(s) — ${sel.length} selected`,
                            }
                            return <p className="text-xs text-gray-400 mt-1">{msgs[limit]}</p>
                          })()}
                        </div>
                      )}

                      {/* ── Dropdown (action resolved on Next, not on change) ── */}
                      {question.type === 'dropdown' && (
                        <select
                          value={answers[question.id] ?? ''}
                          onChange={e => handleAnswer(question.id, e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Select an option...</option>
                          {[...question.options].sort((a, b) => a.order - b.order).map(opt => (
                            <option key={opt.value_key} value={opt.value_key}>{opt.label}</option>
                          ))}
                        </select>
                      )}

                      {/* ── Linear Scale ── */}
                      {(question.type === 'scale' || question.type === 'linear_scale') && (() => {
                        const min        = question.scaleMin ?? 1
                        const max        = question.scaleMax ?? 5
                        const leftLabel  = question.minLabel  || 'Low'
                        const rightLabel = question.maxLabel  || 'High'
                        const values     = Array.from({ length: max - min + 1 }, (_, i) => min + i)
                        const gridClass  = values.length <= 5 ? 'grid-cols-5' : 'grid-cols-6 sm:grid-cols-11'
                        return (
                          <div>
                            <div className={`grid ${gridClass} gap-2`}>
                              {values.map(num => (
                                <Button key={num} onClick={() => handleAnswer(question.id, num.toString())}
                                  variant={answers[question.id] === num.toString() ? 'default' : 'outline'}
                                  className="aspect-square flex items-center justify-center rounded-lg text-sm font-semibold">
                                  {num}
                                </Button>
                              ))}
                            </div>
                            <div className="flex justify-between mt-2 px-1">
                              <span className="text-xs text-gray-500">{leftLabel}</span>
                              <span className="text-xs text-gray-500">{rightLabel}</span>
                            </div>
                          </div>
                        )
                      })()}

                      {/* ── Text inputs ── */}
                      {(question.type === 'text' || question.type === 'textarea' || question.type === 'long_text') && (
                        <textarea rows={4} value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          placeholder="Type your answer…" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      )}
                      {question.type === 'short_text' && (
                        <input type="text" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          placeholder="Type your answer…" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'email' && (
                        <input type="email" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          placeholder="email@example.com" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'url' && (
                        <input type="url" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          placeholder="https://example.com" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'date' && (
                        <input type="date" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'time' && (
                        <input type="time" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'number' && (
                        <input type="number" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          placeholder="Enter a number…" className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'yes_no' && (
                        <div className="space-y-2">
                          {['Yes', 'No'].map(opt => (
                            <Button key={opt.toLowerCase()} onClick={() => handleAnswer(question.id, opt.toLowerCase())}
                              variant={answers[question.id] === opt.toLowerCase() ? 'default' : 'outline'}
                              className="w-full text-left justify-start px-4 py-3 rounded-xl text-sm">
                              {opt}
                            </Button>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              ))}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">{error}</p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="bg-white border-t border-gray-200 px-6 py-4 mt-6 rounded-3xl shadow-md">
            <div className="max-w-3xl mx-auto flex gap-3">

              {/*
                Back button rules:
                  1. Hidden on the first section — nothing to go back to.
                  2. Hidden permanently once arrivedViaJump is true.
                     Jumping forward skips sections intentionally; returning
                     would leave the flow in an inconsistent, out-of-order state.
              */}
              {canGoBack && (
                <Button variant="outline" onClick={handleBack}>← Back</Button>
              )}

              {/*
                Next / Submit:
                  • Intermediate sections → handleNext resolves any per-option
                    action (CONTINUE / SUBMIT / JUMP) before moving forward.
                  • Last section → handleSubmit directly (the respondent
                    reached the end by normal flow; no action resolution needed).
              */}
              {currentSectionIndex < sortedCategories.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canAdvanceSection || submitting}
                  className="flex-1"
                >
                  {submitting ? 'Submitting…' : 'Next Section →'}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !canAdvanceSection}
                  className="flex-1"
                >
                  {submitting ? 'Submitting…' : 'Submit Response'}
                </Button>
              )}

            </div>
          </div>
        </div>
      </div>

    </div>
  )
}