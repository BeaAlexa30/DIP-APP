'use client'

import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface Option { id: string; label: string; value_key: string; order: number }
interface Question {
  id: string; type: string; prompt: string; required: boolean; order: number; options: Option[]
  scaleMin?: number; scaleMax?: number; minLabel?: string; maxLabel?: string
}
interface Category { id: string; name: string; order: number; questions: Question[] }
interface Snapshot { packName: string; version: string; categories: Category[]; ai_generated?: boolean }

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
  // Flatten all questions in order
  const allQuestions: (Question & { categoryName: string })[] = snapshot.categories
    .sort((a, b) => a.order - b.order)
    .flatMap(cat =>
      cat.questions.sort((a, b) => a.order - b.order).map(q => ({ ...q, categoryName: cat.name }))
    )

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startTime] = useState(Date.now())

  const current = allQuestions[currentIndex]
  const progress = ((currentIndex) / allQuestions.length) * 100

  const isAnswered = (q: Question) => {
    if (!q.required) return true
    const answer = answers[q.id]
    return answer !== undefined && answer !== null && answer.trim() !== ''
  }

  const canAdvance = !current?.required || isAnswered(current)

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleNext = () => {
    if (currentIndex < allQuestions.length - 1) {
      setCurrentIndex(i => i + 1)
    }
  }

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    const completionTime = Math.round((Date.now() - startTime) / 1000)
    const aiSurvey = isAiSurvey || snapshot.ai_generated || (snapshot as any).custom_survey

    const endpoint = aiSurvey
      ? '/api/assessments/submit-ai-response'
      : '/api/assessments/submit-response'

    // For AI/custom surveys include prompt text + free_text support; for standard use valueKey only
    const textTypes = ['text', 'textarea', 'long_text', 'short_text', 'email', 'url', 'number']
    const answerRows = allQuestions
      .filter(q => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id].trim() !== '')
      .map(q => {
        if (aiSurvey) {
          const isTextType = textTypes.includes(q.type)
          return {
            questionId: q.id,
            questionPrompt: q.prompt,
            valueKey: !isTextType ? answers[q.id] : undefined,
            freeText: isTextType ? answers[q.id] : undefined,
          }
        }
        return { questionId: q.id, valueKey: answers[q.id] }
      })

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        surveyId,
        tokenId,
        answers: answerRows,
        respondentMeta: {
          userAgent: navigator.userAgent,
          completionTimeSeconds: completionTime,
          platform: navigator.platform,
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
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
          <p className="text-gray-500 text-sm">Your response has been recorded. Your feedback helps drive better business decisions.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">{snapshot.packName}</p>
            <p className="text-xs text-gray-400">Question {currentIndex + 1} of {allQuestions.length}</p>
          </div>
          <p className="text-xs text-gray-400">{Math.round(progress)}% complete</p>
        </div>
        {/* Progress bar */}
        <div className="max-w-xl mx-auto mt-3">
          <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-xl">
          {current && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-8">
              {/* Category label */}
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-4">
                {current.categoryName}
              </p>

              {/* Question prompt */}
              <h2 className="text-lg font-semibold text-gray-900 leading-snug mb-6">
                {current.prompt}
                {current.required && <span className="text-red-400 ml-1">*</span>}
              </h2>

              {/* Options - Single Select (Radio) */}
              {(current.type === 'single_select' || current.type === 'radio' || current.type === 'multiple_choice') && (
                <div className="space-y-2">
                  {current.options.sort((a, b) => a.order - b.order).map(opt => (
                    <Button
                      key={opt.value_key}
                      onClick={() => handleAnswer(current.id, opt.value_key)}
                      variant={answers[current.id] === opt.value_key ? 'default' : 'outline'}
                      className="w-full text-left justify-start px-4 py-3 rounded-xl text-sm transition-all"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Checkboxes - Multiple Select */}
              {(current.type === 'checkbox' || current.type === 'checkboxes') && (
                <div className="space-y-2">
                  {current.options.sort((a, b) => a.order - b.order).map(opt => {
                    const currentAnswers = answers[current.id]?.split(',') || []
                    const isSelected = currentAnswers.includes(opt.value_key)
                    return (
                      <Button
                        key={opt.value_key}
                        onClick={() => {
                          let newAnswers: string[]
                          if (isSelected) {
                            newAnswers = currentAnswers.filter(a => a !== opt.value_key)
                          } else {
                            newAnswers = [...currentAnswers, opt.value_key]
                          }
                          handleAnswer(current.id, newAnswers.join(','))
                        }}
                        variant={isSelected ? 'default' : 'outline'}
                        className="w-full text-left justify-start px-4 py-3 rounded-xl text-sm transition-all"
                      >
                        {opt.label}
                      </Button>
                    )
                  })}
                </div>
              )}

              {/* Dropdown Select */}
              {current.type === 'dropdown' && (
                <select
                  value={answers[current.id] ?? ''}
                  onChange={e => handleAnswer(current.id, e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select an option...</option>
                  {current.options.sort((a, b) => a.order - b.order).map(opt => (
                    <option key={opt.value_key} value={opt.value_key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Scale Questions - Numeric Rating */}
              {(current.type === 'scale' || current.type === 'linear_scale') && (() => {
                // Use snapshot fields if available (AI surveys), else parse from prompt
                let min: number
                let max: number
                let leftLabel: string
                let rightLabel: string
                let isPercentage = false

                if (current.scaleMin !== undefined && current.scaleMax !== undefined) {
                  min = current.scaleMin
                  max = current.scaleMax
                  leftLabel = current.minLabel ?? 'Low'
                  rightLabel = current.maxLabel ?? 'High'
                } else {
                  // Parse scale range - match various dash types: hyphen, en-dash, em-dash, minus
                  const rangeMatch = current.prompt.match(/(\d+)\s*[\-–—−to]+\s*(\d+)(%)?/i)
                  min = 0
                  max = 10
                  if (rangeMatch) {
                    min = parseInt(rangeMatch[1])
                    max = parseInt(rangeMatch[2])
                    isPercentage = rangeMatch[3] === '%'
                  }
                  // Determine labels based on scale type
                  leftLabel = 'Low'
                  rightLabel = 'High'
                  if (min === 0 && max === 10 && current.prompt.toLowerCase().includes('recommend')) {
                    leftLabel = 'Not likely'
                    rightLabel = 'Very likely'
                  } else if (min === 0 && max === 10 && current.prompt.toLowerCase().includes('renew')) {
                    leftLabel = 'Not likely'
                    rightLabel = 'Very likely'
                  } else if (min === 0 && max === 10 && current.prompt.toLowerCase().includes('shop again')) {
                    leftLabel = 'Not likely'
                    rightLabel = 'Very likely'
                  } else if (min === 1 && max === 5 && current.prompt.toLowerCase().includes('intuitive')) {
                    leftLabel = 'Very Confusing'
                    rightLabel = 'Very Intuitive'
                  } else if (min === 1 && max === 5 && current.prompt.toLowerCase().includes('satisfied')) {
                    leftLabel = 'Very unsatisfied'
                    rightLabel = 'Very satisfied'
                  } else if (min === 1 && max === 5 && current.prompt.toLowerCase().includes('rate')) {
                    leftLabel = 'Poor'
                    rightLabel = 'Excellent'
                  } else if (min === 1 && max === 5 && current.prompt.toLowerCase().includes('value')) {
                    leftLabel = 'Poor value'
                    rightLabel = 'Great value'
                  } else if (isPercentage) {
                    leftLabel = '0%'
                    rightLabel = '100%'
                  }
                }

                // Generate scale values
                const scaleValues = Array.from({ length: max - min + 1 }, (_, i) => min + i)

                // Determine grid class based on scale length
                let gridClass = 'grid gap-2'
                if (scaleValues.length === 11) gridClass += ' grid-cols-6 sm:grid-cols-11'
                else if (scaleValues.length === 5) gridClass += ' grid-cols-5'
                else if (scaleValues.length === 6) gridClass += ' grid-cols-6'
                else if (scaleValues.length <= 10) gridClass += ' grid-cols-5 sm:grid-cols-10'
                else gridClass = 'flex flex-wrap gap-2' // For 0-100 range

                return (
                  <div>
                    <div className={gridClass}>
                      {scaleValues.map(num => (
                        <Button
                          key={num}
                          onClick={() => handleAnswer(current.id, num.toString())}
                          variant={answers[current.id] === num.toString() ? 'default' : 'outline'}
                          className={`${scaleValues.length <= 11 ? 'aspect-square' : 'px-4 py-2'} flex items-center justify-center rounded-lg text-sm font-semibold transition-all`}
                        >
                          {num}{isPercentage && num === max ? '%' : ''}
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

              {/* Long Text Input / Textarea */}
              {(current.type === 'text' || current.type === 'textarea' || current.type === 'long_text') && (
                <textarea
                  rows={4}
                  value={answers[current.id] ?? ''}
                  onChange={e => handleAnswer(current.id, e.target.value)}
                  placeholder="Type your answer here…"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              )}

              {/* Short Text Input */}
              {current.type === 'short_text' && (
                <input
                  type="text"
                  value={answers[current.id] ?? ''}
                  onChange={e => handleAnswer(current.id, e.target.value)}
                  placeholder="Type your answer…"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {/* Email Input */}
              {current.type === 'email' && (
                <input
                  type="email"
                  value={answers[current.id] ?? ''}
                  onChange={e => handleAnswer(current.id, e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {/* URL Input */}
              {current.type === 'url' && (
                <input
                  type="url"
                  value={answers[current.id] ?? ''}
                  onChange={e => handleAnswer(current.id, e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {/* Date Input */}
              {current.type === 'date' && (
                <input
                  type="date"
                  value={answers[current.id] ?? ''}
                  onChange={e => handleAnswer(current.id, e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {/* Time Input */}
              {current.type === 'time' && (
                <input
                  type="time"
                  value={answers[current.id] ?? ''}
                  onChange={e => handleAnswer(current.id, e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {/* Number Input */}
              {current.type === 'number' && (
                <input
                  type="number"
                  value={answers[current.id] ?? ''}
                  onChange={e => handleAnswer(current.id, e.target.value)}
                  placeholder="Enter a number…"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {/* Yes/No Radio */}
              {current.type === 'yes_no' && (
                <div className="space-y-2">
                  {['Yes', 'No'].map(opt => (
                    <Button
                      key={opt.toLowerCase()}
                      onClick={() => handleAnswer(current.id, opt.toLowerCase())}
                      variant={answers[current.id] === opt.toLowerCase() ? 'default' : 'outline'}
                      className="w-full text-left justify-start px-4 py-3 rounded-xl text-sm transition-all"
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              )}

              {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-xl mx-auto flex gap-3">
          {currentIndex > 0 && (
            <Button
              variant={'outline'}
              onClick={handleBack}
            >
              ← Back
            </Button>
          )}
          {currentIndex < allQuestions.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canAdvance}
              className="flex-1"
            >
              Next →
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting || !canAdvance}
              className="flex-1"
            >
              {submitting ? 'Submitting…' : 'Submit Response'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
