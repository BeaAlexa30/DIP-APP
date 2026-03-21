'use client'

import { Button } from '@/components/ui/button'
import { useState, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

type OptionActionType = 'continue' | 'submit' | 'jump'

interface OptionAction {
  type: OptionActionType
  targetSectionId?: string
}

interface Option {
  id: string
  label: string
  value_key: string
  order: number
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

  const allQuestions: (Question & { categoryName: string })[] = sortedCategories.flatMap(cat =>
    [...cat.questions].sort((a, b) => a.order - b.order).map(q => ({ ...q, categoryName: cat.name }))
  )

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [answers, setAnswers]       = useState<Record<string, string>>({})
  const [submitted, setSubmitted]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [startTime]                 = useState(Date.now())
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

  // ─── Answer handler ───────────────────────────────────────────────────────

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

  const handleNext = useCallback(async () => {
    for (const question of currentSectionQuestions) {
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

      if (action.type === 'submit') {
        await doSubmit(answers)
        return
      }

      if (action.type === 'jump' && action.targetSectionId) {
        const targetIdx = sortedCategories.findIndex(s => s.id === action.targetSectionId)
        if (targetIdx !== -1) {
          setArrivedViaJump(true)
          setCurrentSectionIndex(targetIdx)
          window.scrollTo(0, 0)
          return
        }
      }
    }

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
    const html = typeof content === 'string' ? content : content?.text || ''
    if (!html) return null
    return <span dangerouslySetInnerHTML={{ __html: html }} />
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

      {/* Header — my branch styling (big title, responsive padding) */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex-row items-center justify-between mb-3 w-full">
            <div className='p-2'>
              <p className="text-3xl font-medium text-gray-700 break-words w-full">{snapshot.packName}</p>
              <p className="text-xs text-gray-400 mt-2">Section {currentSectionIndex + 1} of {sortedCategories.length}</p>
            </div>
            <p className="text-xs text-gray-400 whitespace-nowrap mt-3">{Math.round(progress)}% complete</p>
          </div>

          {currentSectionIndex === 0 && snapshot.description && (
            <div className="mb-3 pl-4 text-sm text-gray-600">
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
      <div className="flex-1 flex items-start justify-center px-3 sm:px-6 py-6 sm:py-10 w-full overflow-x-hidden">
        <div className="w-full max-w-3xl">
          {currentSection && (
            <div className="space-y-4 sm:space-y-6">

              {/* Section header */}
              <div className={`${sectionColors[currentSectionIndex % sectionColors.length]} rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 md:p-8`}>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 bg-gray-200 px-2 py-1 rounded inline-block w-fit">
                  {currentSection.name}
                </p>
                {currentSection.description && (
                  <div className="mb-4 pl-4 rounded-lg text-sm text-gray-800 font-medium break-words">
                    {renderRichText(currentSection.description)}
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {questionsInCurrentSection} question{questionsInCurrentSection !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Questions */}
              {currentSectionQuestions.map((question, qIndex) => (
                <div key={question.id} className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 md:p-8">
                  <div className="flex gap-3 sm:gap-4">
                    <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold">
                      {qIndex + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug mb-4 sm:mb-5 break-words">
                        {question.prompt}
                        {question.required && <span className="text-red-400 ml-1">*</span>}
                      </h3>

                      {/* Multiple Choice */}
                      {(question.type === 'single_select' || question.type === 'radio' || question.type === 'multiple_choice') && (
                        <div className="space-y-3 sm:space-y-4 ">
                          {[...question.options].sort((a, b) => a.order - b.order).map(opt => {
                            const isOther    = opt.value_key === '__other__'
                            const isSelected = isOther
                              ? answers[question.id]?.startsWith('__other__:')
                              : answers[question.id] === opt.value_key

                            return (
                              <div key={opt.value_key} className='w-full bg-green-100 flex '>
                                {isOther ? (
                                  <Button
                                    variant={isSelected ? 'default' : 'outline'}
                                    className=" break-words w-full flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl h-auto text-xs sm:text-sm border sm:border-2 text-left"
                                    onClick={() => { if (!isSelected) handleAnswer(question.id, '__other__:') }}
                                  >
                                    <span className="font-medium whitespace-nowrap">Other:</span>
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
                                      className={`flex-1 min-w-[100px] text-xs sm:text-sm focus:outline-none bg-transparent ${
                                        isSelected ? 'text-white placeholder:text-white/60 break-words' : 'text-gray-700 placeholder:text-gray-400 break-all'
                                      }`}
                                    />
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => handleAnswer(question.id, opt.value_key)}
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="  justify-start px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all border sm:border-2 h-auto whitespace  text-left break-all w-full whitespace-normal "
                                  >
                                    {opt.label}
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Checkboxes */}
                      {(question.type === 'checkbox' || question.type === 'checkboxes') && (
                        <div className="space-y-3 sm:space-y-4">
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
                                    className="w-full flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl h-auto text-xs sm:text-sm border sm:border-2 text-left"
                                    onClick={() => {
                                      if (!isSelected && maxReached) return
                                      const without = currentAnswers.filter(a => !a.startsWith('__other__:'))
                                      setAnswers(prev => ({
                                        ...prev,
                                        [question.id]: isSelected ? without.join(',') : [...without, '__other__:'].join(',')
                                      }))
                                    }}
                                  >
                                    <span className="font-medium whitespace-nowrap">Other:</span>
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
                                      className={`flex-1 min-w-[100px] text-xs sm:text-sm focus:outline-none bg-transparent ${
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
                                    className="justify-start px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm transition-all border sm:border-2 h-auto whitespace  text-left break-all w-full whitespace-normal"
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

                      {/* Dropdown */}
                      {question.type === 'dropdown' && (
                        <select
                          value={answers[question.id] ?? ''}
                          onChange={e => handleAnswer(question.id, e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Select an option...</option>
                          {[...question.options].sort((a, b) => a.order - b.order).map(opt => (
                            <option key={opt.value_key} value={opt.value_key}>{opt.label}</option>
                          ))}
                        </select>
                      )}

                      {/* Linear Scale */}
                      {(question.type === 'scale' || question.type === 'linear_scale') && (() => {
                        const min        = question.scaleMin ?? 1
                        const max        = question.scaleMax ?? 5
                        const leftLabel  = question.minLabel  || 'Low'
                        const rightLabel = question.maxLabel  || 'High'
                        const values     = Array.from({ length: max - min + 1 }, (_, i) => min + i)
                        const gridClass  = values.length <= 5 ? 'grid-cols-5' : 'grid-cols-6 sm:grid-cols-11'
                        return (
                          <div>
                            <div className={`grid ${gridClass} gap-1 sm:gap-2`}>
                              {values.map(num => (
                                <Button
                                  key={num}
                                  onClick={() => handleAnswer(question.id, num.toString())}
                                  variant={answers[question.id] === num.toString() ? 'default' : 'outline'}
                                  className="aspect-square flex items-center justify-center rounded-lg text-xs sm:text-sm font-semibold p-1 sm:p-2"
                                >
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

                      {/* Text inputs */}
                      {(question.type === 'text' || question.type === 'textarea' || question.type === 'long_text') && (
                        <textarea rows={4} value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          placeholder="Type your answer…" className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      )}
                      {question.type === 'short_text' && (
                        <input type="text" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          placeholder="Type your answer…" className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'email' && (
                        <input type="email" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          placeholder="email@example.com" className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'url' && (
                        <input type="url" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          placeholder="https://example.com" className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'date' && (
                        <input type="date" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'time' && (
                        <input type="time" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'number' && (
                        <input type="number" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)}
                          placeholder="Enter a number…" className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'yes_no' && (
                        <div className="space-y-3 sm:space-y-4">
                          {['Yes', 'No'].map(opt => (
                            <Button key={opt.toLowerCase()} onClick={() => handleAnswer(question.id, opt.toLowerCase())}
                              variant={answers[question.id] === opt.toLowerCase() ? 'default' : 'outline'}
                              className="w-full justify-start px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm border sm:border-2 h-auto text-left">
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
          <div className="bg-white border-t border-gray-200 px-3 sm:px-6 py-4 mt-6 rounded-2xl sm:rounded-3xl shadow-md">
            <div className="max-w-3xl mx-auto flex gap-2 sm:gap-3">
              {canGoBack && (
                <Button variant="outline" onClick={handleBack} className="text-xs sm:text-sm">← Back</Button>
              )}
              {currentSectionIndex < sortedCategories.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canAdvanceSection || submitting}
                  className="flex-1 text-xs sm:text-sm"
                >
                  {submitting ? 'Submitting…' : 'Next Section →'}
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !canAdvanceSection}
                  className="flex-1 text-xs sm:text-sm"
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