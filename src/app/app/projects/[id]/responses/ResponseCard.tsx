'use client'

import { useState } from 'react'

interface AnswerWithQuestion {
  id: string
  question_id: string
  option_value_key: string | null
  free_text: string | null
  framework_questions: {
    prompt: string
    category_id: string
    framework_categories: { name: string } | null
  } | null
}

interface ResponseCardProps {
  response: {
    id: string
    submitted_at: string
    response_answers: AnswerWithQuestion[]
  }
  responseNumber: number
  optionsMap: Record<string, string>
}

// Helper function to format raw value keys into human-readable text
function formatValueKey(valueKey: string): string {
  // If it's a number (scale rating), return as is
  if (!isNaN(Number(valueKey))) {
    return valueKey
  }
  
  // Convert snake_case to Title Case
  return valueKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export default function ResponseCard({ response, responseNumber, optionsMap }: ResponseCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  const answersByCategory = response.response_answers.reduce((acc, answer) => {
    const category = answer.framework_questions?.framework_categories?.name ?? 'Uncategorized'
    if (!acc[category]) acc[category] = []
    acc[category].push(answer)
    return acc
  }, {} as Record<string, AnswerWithQuestion[]>)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Clickable Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full bg-gray-50 px-6 py-4 border-b border-gray-200 text-left hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Response #{responseNumber}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Submitted{' '}
              {new Date(response.submitted_at).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">{response.response_answers.length} {response.response_answers.length === 1 ? 'answer' : 'answers'}</span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Collapsible Answers */}
      {isOpen && (
        <div className="p-6 space-y-6">
          {Object.entries(answersByCategory).map(([category, answers]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                {category}
              </h4>
              <div className="space-y-3">
                {answers.map((answer) => (
                  <div key={answer.id} className="pl-4">
                    <p className="text-sm text-gray-600 mb-1">
                      {answer.framework_questions?.prompt ?? 'Question not available'}
                    </p>
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-gray-400 mt-0.5">Response:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {answer.option_value_key
                          ? (optionsMap[`${answer.question_id}:${answer.option_value_key}`] ?? formatValueKey(answer.option_value_key))
                          : answer.free_text ?? 'No response provided'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
