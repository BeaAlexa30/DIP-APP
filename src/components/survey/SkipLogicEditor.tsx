'use client'

/**
 * SkipLogicEditor.tsx
 * ═════════════════════════════════════════════════════════════
 * Allows editing skip logic for questions (conditional branching)
 */

import { useState } from 'react'
import { Question, SkipLogic, SurveyCategory, getText } from '@/types/SurveyBuilder'

interface SkipLogicEditorProps {
  question: Question
  allQuestions: Question[]
  allSections: SurveyCategory[]
  skipLogic: SkipLogic | null
  onUpdate: (skipLogic: SkipLogic | null) => void
}

export default function SkipLogicEditor({
  question,
  allQuestions,
  allSections,
  skipLogic,
  onUpdate,
}: SkipLogicEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [operator, setOperator] = useState<SkipLogic['operator']>(skipLogic?.operator || 'equals')
  const [values, setValues] = useState<string[]>(skipLogic?.values || [])
  const [jumpType, setJumpType] = useState<'section' | 'question'>(
    skipLogic?.jumpToSectionId ? 'section' : 'question'
  )
  const [jumpTarget, setJumpTarget] = useState(
    skipLogic?.jumpToSectionId || skipLogic?.jumpToQuestionId || ''
  )

  // Get options from the source question
  const sourceQuestion = allQuestions.find(q => q.id === question.id)
  const hasOptions =
    sourceQuestion &&
    ['multiple_choice', 'checkboxes', 'dropdown'].includes(sourceQuestion.type)
  const options = hasOptions ? sourceQuestion.options || [] : []

  function handleSave() {
    if (!jumpTarget) {
      alert('Please select a jump destination')
      return
    }

    if (hasOptions && values.length === 0) {
      alert('Please select at least one option value')
      return
    }

    const newSkipLogic: SkipLogic = {
      sourceQuestionId: question.id,
      operator,
      values: hasOptions ? values : ['any'], // 'any' for non-option questions
      jumpToSectionId: jumpType === 'section' ? jumpTarget : null,
      jumpToQuestionId: jumpType === 'question' ? jumpTarget : undefined,
    }

    onUpdate(newSkipLogic)
    setIsEditing(false)
  }

  function handleReset() {
    onUpdate(null)
    setIsEditing(false)
  }

  const questionLabel = typeof question.prompt === 'string' ? question.prompt : question.prompt?.text || `Q${question.order}`

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
      {/* Info Section */}
      {!isEditing && !skipLogic && (
        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded p-2 mb-3">
          💡 <strong>Skip Logic:</strong> Show/hide questions based on answers. If respondent selects an option, 
          they can jump to another question or section.
        </p>
      )}

      {/* Show/Hide Toggle */}
      <button
        onClick={() => setIsEditing(!isEditing)}
        className="w-full text-left flex items-center justify-between gap-2 hover:text-blue-600 transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-gray-900">🔀 Skip Logic (Branching)</p>
          {skipLogic && (
            <p className="text-xs text-gray-500 mt-0.5">
              <strong>Rule:</strong> When answer {operator} <em>{skipLogic.values.join(', ')}</em> → Jump to{' '}
              <strong>
                {skipLogic.jumpToSectionId
                  ? allSections.find(s => s.id === skipLogic.jumpToSectionId)?.name
                  : skipLogic.jumpToQuestionId
                  ? getText(allQuestions.find(q => q.id === skipLogic.jumpToQuestionId)?.prompt)
                  : 'Unknown'}
              </strong>
            </p>
          )}
          {!skipLogic && <p className="text-xs text-gray-500 mt-0.5">Not configured</p>}
        </div>
        <span className={`text-gray-400 transition-transform ${isEditing ? 'rotate-180' : ''}`}>
          ⚙️
        </span>
      </button>

      {/* Editor */}
      {isEditing && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-4">
          {/* Operator Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              When the answer
            </label>
            <select
              value={operator}
              onChange={e => setOperator(e.target.value as SkipLogic['operator'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="equals">is exactly</option>
              <option value="notEquals">is not</option>
              <option value="contains">contains</option>
              <option value="greaterThan">is greater than</option>
              <option value="lessThan">is less than</option>
            </select>
          </div>

          {/* Values Selection (for option-based questions) */}
          {hasOptions && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Trigger when respondent selects:
              </label>
              <p className="text-xs text-gray-500 mb-2">Choose one or more options that will trigger the skip</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto bg-white border border-gray-300 rounded p-2">
                {options.map(opt => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-1 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={values.includes(opt.value_key || opt.label)}
                      onChange={e => {
                        const val = opt.value_key || opt.label
                        if (e.target.checked) {
                          setValues([...values, val])
                        } else {
                          setValues(values.filter(v => v !== val))
                        }
                      }}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {!hasOptions && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
              ℹ️ This question type doesn't have selectable options. Skip logic will trigger on any response.
            </div>
          )}

          {/* Jump Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              <strong>Action:</strong> Jump respondent to...
            </label>
            <p className="text-xs text-gray-500 mb-2">Choose whether to skip to a new section or a specific question</p>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => {
                  setJumpType('section')
                  setJumpTarget('')
                }}
                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  jumpType === 'section'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📑 Section
              </button>
              <button
                onClick={() => {
                  setJumpType('question')
                  setJumpTarget('')
                }}
                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  jumpType === 'question'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ❓ Specific Question
              </button>
            </div>

            {/* Target Selection */}
            {jumpType === 'section' ? (
              <select
                value={jumpTarget}
                onChange={e => setJumpTarget(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select section...</option>
                {allSections.map(section => (
                  <option key={section.id} value={section.id}>
                    {section.name || `Section ${section.order}`}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={jumpTarget}
                onChange={e => setJumpTarget(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select question...</option>
                {allQuestions
                  .filter(q => q.id !== question.id)
                  .map(q => {
                    const qLabel = typeof q.prompt === 'string' ? q.prompt : q.prompt?.text
                    return (
                      <option key={q.id} value={q.id}>
                        Q{q.order}: {qLabel}
                      </option>
                    )
                  })}
              </select>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t border-gray-200">
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
            >
              ✓ Apply
            </button>
            {skipLogic && (
              <button
                onClick={handleReset}
                className="flex-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded transition-colors"
              >
                🗑️ Clear
              </button>
            )}
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-3 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs font-medium rounded transition-colors"
            >
              ✕ Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
