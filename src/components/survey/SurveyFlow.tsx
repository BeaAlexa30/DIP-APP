'use client'

import { useState } from 'react'

interface Option { id: string; label: string; value_key: string; order: number }
interface Question { id: string; type: string; prompt: string; required: boolean; order: number; options: Option[] }
interface Category { id: string; name: string; order: number; questions: Question[] }
interface Snapshot { packName: string; version: string; categories: Category[] }

export default function SurveyFlow({
  surveyId,
  tokenId,
  snapshot,
}: {
  surveyId: string
  tokenId: string
  snapshot: Snapshot
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

    // Build answer array
    const answerRows = Object.entries(answers).map(([questionId, valueKey]) => ({
      questionId,
      valueKey,
    }))

    // Submit via server API route (uses service client, bypasses RLS issues)
    const res = await fetch('/api/survey/submit', {
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

              {/* Options */}
              {(current.type === 'single_select' || current.type === 'scale') && (
                <div className="space-y-2">
                  {current.options.sort((a, b) => a.order - b.order).map(opt => (
                    <button
                      key={opt.value_key}
                      onClick={() => handleAnswer(current.id, opt.value_key)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                        answers[current.id] === opt.value_key
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

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
            <button
              onClick={handleBack}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
          )}
          {currentIndex < allQuestions.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canAdvance}
              className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canAdvance}
              className="flex-1 bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
            >
              {submitting ? 'Submitting…' : 'Submit Response'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
