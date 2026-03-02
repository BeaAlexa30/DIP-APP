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
    return !!answers[q.id]
  }

  const canAdvance = !current?.required || !!answers[current?.id]

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
    const aiSurvey = isAiSurvey || snapshot.ai_generated

    const endpoint = aiSurvey
      ? '/api/assessments/submit-ai-response'
      : '/api/assessments/submit-response'

    // For AI surveys include prompt text + free_text support; for standard use valueKey only
    const answerRows = allQuestions
      .filter(q => answers[q.id] !== undefined)
      .map(q => {
        if (aiSurvey) {
          return {
            questionId: q.id,
            questionPrompt: q.prompt,
            valueKey: q.type !== 'text' ? answers[q.id] : undefined,
            freeText: q.type === 'text' ? answers[q.id] : undefined,
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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              {/* Category label */}
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-4">
                {current.categoryName}
              </p>

              {/* Question prompt */}
              <h2 className="text-lg font-semibold text-gray-900 leading-snug mb-6">
                {current.prompt}
                {current.required && <span className="text-red-400 ml-1">*</span>}
              </h2>

              {/* Options - Single Select */}
              {current.type === 'single_select' && (
                <div className="space-y-2">
                  {current.options.sort((a, b) => a.order - b.order).map(opt => (
                    <Button
                      key={opt.value_key}
                      onClick={() => handleAnswer(current.id, opt.value_key)}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Scale Questions - Numeric Rating */}
              {current.type === 'scale' && (() => {
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
                if (scaleValues.length === 11) gridClass += ' grid-cols-11'
                else if (scaleValues.length === 5) gridClass += ' grid-cols-5'
                else if (scaleValues.length === 6) gridClass += ' grid-cols-6'
                else if (scaleValues.length <= 10) gridClass += ' grid-cols-10'
                else gridClass = 'flex flex-wrap gap-2' // For 0-100 range

                return (
                  <div>
                    <div className={gridClass}>
                      {scaleValues.map(num => (
                        <Button
                          key={num}
                          onClick={() => handleAnswer(current.id, num.toString())}
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

              {/* Text Input */}
              {current.type === 'text' && (
                <textarea
                  rows={4}
                  value={answers[current.id] ?? ''}
                  onChange={e => handleAnswer(current.id, e.target.value)}
                  placeholder="Type your answer here…"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
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
