'use client'

/**
 * SectionEditor.tsx
 * ═════════════════════════════════════════════════════════════
 * Allows editing survey sections with descriptions and section buttons
 */

import { useState } from 'react'
import { SurveyCategory, Question, RichTextContent, SectionButton } from '@/types/SurveyBuilder'
import RichTextEditor from './RichTextEditor'

interface SectionEditorProps {
  section: SurveyCategory
  allSections: SurveyCategory[]
  isExpanded: boolean
  onExpand: () => void
  onUpdate: (updates: Partial<SurveyCategory>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  onAddQuestion?: (sectionId: string, type: string) => void
  onRemoveQuestion?: (sectionId: string, questionId: string) => void
  onUpdateQuestion?: (sectionId: string, questionId: string, updates: any) => void
  onAddOption?: (questionId: string, label?: string) => void
  onRemoveOption?: (questionId: string, optionId: string) => void
  onUpdateOption?: (questionId: string, optionId: string, updates: any) => void
  onMoveOptionUp?: (questionId: string, optionIndex: number) => void
  onMoveOptionDown?: (questionId: string, optionIndex: number) => void
  expandedQuestionId?: string | null
  onExpandQuestion?: (questionId: string | null) => void
  onChangeQuestionType?: (sectionId: string, questionId: string, newType: string) => void
}

export default function SectionEditor({
  section,
  allSections,
  isExpanded,
  onExpand,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  onMoveOptionUp,
  onMoveOptionDown,
  expandedQuestionId,
  onExpandQuestion,
  onChangeQuestionType,
}: SectionEditorProps) {
  const [showAddButton, setShowAddButton] = useState(false)
  const [buttonLabel, setButtonLabel] = useState('')
  const [buttonTarget, setButtonTarget] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [optDragIndex, setOptDragIndex] = useState<{ qId: string; idx: number } | null>(null)
  const [optDragOverIndex, setOptDragOverIndex] = useState<number | null>(null)

  function handleAddSectionButton() {
    if (!buttonLabel.trim() || !buttonTarget) return

    const newButtons = [...(section.sectionButtons || [])]
    newButtons.push({
      id: `btn-${Date.now()}`,
      label: buttonLabel,
      targetSectionId: buttonTarget,
    })

    onUpdate({ sectionButtons: newButtons })
    setButtonLabel('')
    setButtonTarget('')
    setShowAddButton(false)
  }

  function handleRemoveSectionButton(buttonId: string) {
    const newButtons = (section.sectionButtons || []).filter(b => b.id !== buttonId)
    onUpdate({ sectionButtons: newButtons })
  }

  const descriptionText =
    typeof section.description === 'string' ? section.description : section.description?.text || ''

  return (
    <div
      className={`border rounded-xl transition-all ${
        isExpanded
          ? 'border-blue-300 bg-blue-50/40 shadow-sm'
          : 'border-gray-200 bg-gray-50/30 hover:border-gray-300'
      }`}
    >
      {/* Header / Collapse Toggle */}
      <button
        onClick={onExpand}
        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-blue-50/50 transition-colors"
      >
        <div className="shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold">
          {section.order}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-gray-900">{section.name || '(Untitled Section)'}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {section.questions.length} question{section.questions.length !== 1 ? 's' : ''}
            {section.description && ' • Has description'}
          </p>
        </div>
        <span className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <>
          <div className="border-t border-blue-200 px-4 py-4 space-y-4">
            {/* Section Name */}
            <div>
              <label htmlFor={`sec-name-${section.id}`} className="block text-xs font-semibold text-gray-700 mb-1.5">
                Section Title <span className="text-red-400">*</span>
              </label>
              <input
                id={`sec-name-${section.id}`}
                name={`secName_${section.id}`}
                type="text"
                value={section.name}
                onChange={e => onUpdate({ name: e.target.value })}
                placeholder="e.g., Demographics, Product Experience"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Section Description with Rich Text */}
            <div>
              <label htmlFor={`sec-desc-${section.id}`} className="block text-xs font-semibold text-gray-700 mb-1.5">
                Section Description (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">Instructions, context, or guidance for this section</p>
              <RichTextEditor
                id={`sec-desc-${section.id}`}
                name={`section-description-${section.id}`}
                value={section.description}
                onChange={desc => onUpdate({ description: desc })}
                placeholder="Add directions or context for this section..."
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Questions in This Section */}
            {section.questions && section.questions.length > 0 && (
              <div className="pt-3 border-t border-blue-100">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Questions ({section.questions.length})
                </p>
                <div className="space-y-2 bg-white rounded-lg border border-blue-100 p-3 ">
                  {section.questions.map((q: any, idx: number) => {
                    const isQuestionExpanded = expandedQuestionId === q.id
                    return (
                      <div
                        key={q.id}
                        draggable={false}
                        onDragStart={() => setDragIndex(idx)}
                        onDragOver={e => {
                          e.preventDefault()
                          setDragOverIndex(idx)
                        }}
                        onDrop={() => {
                          if (dragIndex === null || dragIndex === idx) return
                          const reordered = [...section.questions]
                          const [moved] = reordered.splice(dragIndex, 1)
                          reordered.splice(idx, 0, moved)
                          onUpdate({ questions: reordered.map((q, i) => ({ ...q, order: i + 1 })) })
                          setDragIndex(null)
                          setDragOverIndex(null)
                        }}
                        onDragEnd={() => {
                          setDragIndex(null)
                          setDragOverIndex(null)
                        }}
                        className={`rounded border transition-all ${
                          dragOverIndex === idx && dragIndex !== idx
                            ? 'border-violet-400 bg-violet-50'
                            : 'border-transparent'
                        }`}
                      >
                        {/* Drag handle + collapse toggle row */}
                        <div className="flex items-center gap-2 w-full">
                          <div
                            className="w-5 h-5 bg-gray-300 rounded shrink-0 cursor-grab active:cursor-grabbing ml-2 mt-1 flex items-center justify-center"
                            title="Drag to reorder"
                            onMouseDown={e => {
                              // make parent draggable only when handle is grabbed
                              const parent = e.currentTarget.closest('[draggable]') as HTMLElement
                              if (parent) parent.draggable = true
                            }}
                          >
                            ⠿
                          </div>
                          <button
                          onDragStart={e => e.preventDefault()}
                            onClick={() => {
                              if (isQuestionExpanded) {
                                onExpandQuestion?.(null)
                              } else {
                                onExpandQuestion?.(q.id)
                              }
                            }}
                            className={`flex-1 flex items-start justify-between gap-2 p-2 rounded border transition-all ${
                              isQuestionExpanded
                                ? 'bg-violet-100 border-violet-300'
                                : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50 w-10/12'
                            }`}
                          >
                            <div className="flex-1 min-w-0 text-left ">
                              <p className="text-xs font-medium text-gray-900 line-clamp-2 break-words w-full ">
                                {typeof q.prompt === 'string' ? q.prompt : q.prompt?.text || '(untitled)'}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {q.type} {q.required && '• Required'}
                              </p>
                            </div>
                            <span className={`text-gray-400 shrink-0 text-lg transition-transform ${isQuestionExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </button>
                        </div>

                        {/* Expanded Question Editor */}
                        {isQuestionExpanded && (
                          <div className="mt-2 p-3 bg-violet-50 border border-violet-200 rounded space-y-3">
                            {/* Question Prompt */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Question <span className="text-red-400">*</span>
                              </label>
                              <textarea
                                value={typeof q.prompt === 'string' ? q.prompt : q.prompt?.text || ''}
                                onChange={(e) => {
                                  onUpdateQuestion?.(section.id, q.id, { 
                                    prompt: typeof q.prompt === 'object' 
                                      ? { ...q.prompt, text: e.target.value }
                                      : e.target.value
                                  })
                                }}
                                placeholder="Enter the question text..."
                                className="w-full px-2 py-2 border border-violet-200 rounded text-xs text-gray-700 bg-white hover:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                                rows={2}
                              />
                            </div>

                            {/* Change Question Type */}
                            <div>
                              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Question Type
                              </label>
                              <select
                                value={q.type}
                                onChange={(e) => {
                                  onChangeQuestionType?.(section.id, q.id, e.target.value)
                                }}
                                className="w-full px-2 py-1.5 border border-violet-200 rounded text-xs text-gray-700 bg-white hover:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
                              >
                                <option value="short_text">📝 Short Text</option>
                                <option value="long_text">📄 Long Text (Paragraph)</option>
                                <option value="multiple_choice">⭕ Multiple Choice</option>
                                <option value="checkboxes">☑️ Checkboxes</option>
                                <option value="dropdown">🔽 Dropdown</option>
                                <option value="linear_scale">📊 Linear Scale</option>
                                <option value="yes_no">✓✗ Yes/No</option>
                                <option value="email">✉️ Email</option>
                                <option value="url">🔗 URL</option>
                                <option value="date">📅 Date</option>
                                <option value="time">🕐 Time</option>
                                <option value="number">🔢 Number</option>
                              </select>
                            </div>

                            {/* Toggle Required */}
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`req-${q.id}`}
                                checked={q.required || false}
                                onChange={(e) => {
                                  onUpdateQuestion?.(section.id, q.id, { required: e.target.checked })
                                }}
                                className="w-4 h-4 accent-violet-600 rounded"
                              />
                              <label htmlFor={`req-${q.id}`} className="text-xs font-medium text-gray-700 cursor-pointer">
                                Mark as required
                              </label>
                            </div>

                            {/* Options Management for Selection-Based Questions */}
                            {['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type) && q.options && (
                              <div className="pt-3 border-t border-violet-200 space-y-3">
                                <p className="text-xs font-semibold text-gray-700">
                                  Options ({q.options.filter((o: any) => o.value_key !== '__other__').length})
                                </p>
                                <div className="space-y-2">
                                  {q.options.map((opt: any, optIdx: number) => {
                                    const isOther = opt.value_key === '__other__'
                                    return (
                                      <div
                                          key={opt.id}
                                          draggable={!isOther}
                                          onDragStart={() => setOptDragIndex({ qId: q.id, idx: optIdx })}
                                          onDragOver={e => {
                                            e.preventDefault()
                                            setOptDragOverIndex(optIdx)
                                          }}
                                          onDrop={() => {
                                            if (!optDragIndex || optDragIndex.qId !== q.id || optDragIndex.idx === optIdx) return
                                            // prevent dropping onto or after __other__
                                            if (isOther) return
                                            const reordered = [...q.options]
                                            const [moved] = reordered.splice(optDragIndex.idx, 1)
                                            reordered.splice(optIdx, 0, moved)
                                            // always keep __other__ at the end
                                            const withoutOther = reordered.filter((o: any) => o.value_key !== '__other__')
                                            const otherOpt = reordered.find((o: any) => o.value_key === '__other__')
                                            const final = otherOpt ? [...withoutOther, otherOpt] : withoutOther
                                            onUpdateQuestion?.(section.id, q.id, {
                                              options: final.map((o, i) => ({ ...o, order: i + 1 }))
                                            })
                                            setOptDragIndex(null)
                                            setOptDragOverIndex(null)
                                          }}
                                          className={`flex items-center gap-2 p-2 rounded border transition-all ${
                                            optDragOverIndex === optIdx && optDragIndex?.idx !== optIdx && optDragIndex?.qId === q.id
                                              ? 'border-violet-400 bg-violet-50'
                                              : isOther
                                                ? 'bg-blue-50 border-blue-200'
                                                : 'bg-white border-violet-100'
                                          }`}
                                        >
                                          {!isOther && (
                                            <div
                                              className="w-4 h-4 bg-gray-200 rounded shrink-0 cursor-grab active:cursor-grabbing flex items-center justify-center text-gray-400"
                                              onDragStart={e => e.stopPropagation()}
                                              onMouseDown={e => {
                                                const parent = e.currentTarget.closest('[draggable]') as HTMLElement
                                                if (parent) parent.draggable = true
                                              }}
                                            >
                                              ⠿
                                            </div>
                                          )}
                                        <input
                                          type="text"
                                          value={opt.label}
                                          disabled={isOther}
                                          onChange={(e) => {
                                            if (!isOther) {
                                              onUpdateOption?.(q.id, opt.id, { 
                                                label: e.target.value,
                                                value_key: e.target.value
                                                  .toLowerCase()
                                                  .replace(/[^\w\s-]/g, '')
                                                  .replace(/\s+/g, '_')
                                              })
                                            }
                                          }}
                                          placeholder={`Option ${optIdx + 1}`}
                                          className={`flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                                            isOther
                                              ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
                                              : 'border-violet-100 focus:ring-violet-400 bg-white w-3/12'
                                          }`}
                                        />
                                        
                                        <button
                                          onClick={() => onRemoveOption?.(q.id, opt.id)}
                                          className="px-2 py-1 text-xs text-red-600 hover:text-red-700 transition-colors"
                                          title="Delete option"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                                
                                {/* Add Option and Add Other Buttons */}
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      const hasOther = q.options?.some((o: any) => o.value_key === '__other__')
                                      if (hasOther) {
                                        const withoutOther = q.options.filter((o: any) => o.value_key !== '__other__')
                                        const otherOpt = q.options.find((o: any) => o.value_key === '__other__')
                                        const newOpt = {
                                          id: `${q.id}-opt-${q.options.length}`,
                                          label: `Option ${withoutOther.length + 1}`,
                                          value_key: `option_${withoutOther.length + 1}`,
                                          order: withoutOther.length + 1,
                                        }
                                        onUpdateQuestion?.(section.id, q.id, {
                                          options: [...withoutOther, newOpt, otherOpt].map((o, i) => ({ ...o, order: i + 1 }))
                                        } as any)
                                      } else {
                                        onAddOption?.(q.id)
                                      }
                                    }}
                                    className="flex-1 px-2 py-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium border border-violet-200 rounded hover:bg-violet-50 transition-colors"
                                  >
                                    + Add Option
                                  </button>
                                  {q.type !== 'dropdown' && !q.options.some((o: any) => o.value_key === '__other__') && (
                                    <button
                                      onClick={() => {
                                        // Add "Other" option directly with special value_key
                                        const newId = `${q.id}-opt-other`
                                        onUpdateQuestion?.(section.id, q.id, {
                                          options: [
                                            ...(q.options || []),
                                            {
                                              id: newId,
                                              label: 'Other:',
                                              value_key: '__other__',
                                              order: (q.options?.length || 0) + 1,
                                            }
                                          ]
                                        } as any)
                                      }}
                                      className="flex-1 px-2 py-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                                    >
                                      + Add "Other"
                                    </button>
                                  )}
                                </div>

                                {/* Selection Limit for Checkboxes */}
                                {q.type === 'checkboxes' && (
                                  <div className="pt-2 border-t border-violet-100 space-y-2">
                                    <p className="text-xs font-semibold text-gray-700">Selection Limit</p>
                                    <div className="flex gap-2 items-center">
                                      <select
                                        value={(q as any).selectionLimit?.type || 'unlimited'}
                                        onChange={(e) => {
                                          const newLimit = e.target.value === 'unlimited' 
                                            ? { type: 'unlimited' }
                                            : { type: e.target.value, count: (q as any).selectionLimit?.count || 1 }
                                          onUpdateQuestion?.(section.id, q.id, { selectionLimit: newLimit } as any)
                                        }}
                                        className="flex-1 px-2 py-1 text-xs border border-violet-200 rounded bg-white hover:border-violet-300 focus:outline-none focus:ring-1 focus:ring-violet-400"
                                      >
                                        <option value="unlimited">Unlimited</option>
                                        <option value="max">Select at most</option>
                                        <option value="min">Select at least</option>
                                        <option value="exact">Select exactly</option>
                                      </select>
                                      {(q as any).selectionLimit?.type !== 'unlimited' && (
                                        <input
                                          type="number"
                                          min="1"
                                          value={(q as any).selectionLimit?.count || 1}
                                          onChange={(e) => {
                                            const count = Math.max(1, parseInt(e.target.value) || 1)
                                            onUpdateQuestion?.(section.id, q.id, { 
                                              selectionLimit: { 
                                                type: (q as any).selectionLimit?.type,
                                                count
                                              } 
                                            } as any)
                                          }}
                                          className="w-16 px-2 py-1 text-xs border border-violet-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-400"
                                        />
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Remove Button */}
                            {onRemoveQuestion && (
                              <button
                                onClick={() => {
                                  onRemoveQuestion(section.id, q.id)
                                  onExpandQuestion?.(null)
                                }}
                                className="w-full px-2 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded transition-colors"
                              >
                                🗑️ Delete Question
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Add Question Type Dropdown - Section-Specific */}
            {onAddQuestion && (
              <div className="pt-3 border-t border-blue-100">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Add Question to This Section
                </p>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onAddQuestion(section.id, e.target.value)
                      ;(e.target as HTMLSelectElement).value = ''
                    }
                  }}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-xs text-gray-700 bg-white hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
                >
                  <option value="">📝 Select question type...</option>
                  <option value="short_text">📝 Short Text</option>
                  <option value="long_text">📄 Long Text (Paragraph)</option>
                  <option value="multiple_choice">⭕ Multiple Choice</option>
                  <option value="checkboxes">☑️ Checkboxes</option>
                  <option value="dropdown">🔽 Dropdown</option>
                  <option value="linear_scale">📊 Linear Scale</option>
                  <option value="yes_no">✓✗ Yes/No</option>
                  <option value="email">✉️ Email</option>
                  <option value="url">🔗 URL</option>
                  <option value="date">📅 Date</option>
                  <option value="time">🕐 Time</option>
                  <option value="number">🔢 Number</option>
                </select>
              </div>
            )}

            {/* Section Buttons / Shortcuts */}
            <div className="pt-3 border-t border-blue-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-700">Section Shortcuts</p>
                <p className="text-xs text-gray-500">Jump to other sections</p>
              </div>

              {(section.sectionButtons || []).length > 0 && (
                <div className="space-y-2 mb-3">
                  {(section.sectionButtons || []).map(btn => {
                    const targetSection = allSections.find(s => s.id === btn.targetSectionId)
                    return (
                      <div
                        key={btn.id}
                        className="flex items-center justify-between gap-2 bg-white border border-blue-200 rounded p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{btn.label}</p>
                          <p className="text-xs text-gray-500">
                            → {targetSection?.name || 'Unknown Section'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveSectionButton(btn.id)}
                          className="text-red-600 hover:text-red-700 text-xs font-medium shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {!showAddButton ? (
                <button
                  onClick={() => setShowAddButton(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  + Add Section Shortcut
                </button>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded p-3 space-y-2">
                  <input
                    type="text"
                    value={buttonLabel}
                    onChange={e => setButtonLabel(e.target.value)}
                    placeholder="Button label (e.g., 'Skip to Section 3')"
                    className="w-full px-2 py-1.5 border border-blue-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <select
                    value={buttonTarget}
                    onChange={e => setButtonTarget(e.target.value)}
                    className="w-full px-2 py-1.5 border border-blue-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Select target section...</option>
                    {allSections
                      .filter(s => s.id !== section.id)
                      .map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name || `Section ${s.order}`}
                        </option>
                      ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddSectionButton}
                      disabled={!buttonLabel.trim() || !buttonTarget}
                      className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs rounded font-medium transition-colors"
                    >
                      Add Button
                    </button>
                    <button
                      onClick={() => {
                        setShowAddButton(false)
                        setButtonLabel('')
                        setButtonTarget('')
                      }}
                      className="flex-1 px-2 py-1 bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs rounded font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Collapse Option */}
            <div className="flex items-center gap-2 pt-2 border-t border-blue-100">
              <input
                id={`sec-collapse-${section.id}`}
                name={`secCollapse_${section.id}`}
                type="checkbox"
                checked={section.collapsedByDefault || false}
                onChange={e => onUpdate({ collapsedByDefault: e.target.checked })}
                className="w-4 h-4 accent-blue-600 rounded"
              />
              <label
                htmlFor={`sec-collapse-${section.id}`}
                className="text-sm text-gray-700 cursor-pointer"
              >
                Collapse this section by default
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="border-t border-blue-200 px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {canMoveUp && (
                <button
                  onClick={onMoveUp}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
                  title="Move section up"
                >
                  ▲
                </button>
              )}
              {canMoveDown && (
                <button
                  onClick={onMoveDown}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
                  title="Move section down"
                >
                  ▼
                </button>
              )}
            </div>
            <button
              onClick={onRemove}
              className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors font-medium"
            >
              🗑️ Delete Section
            </button>
          </div>
        </>
      )}
    </div>
  )
}
