'use client'

/**
 * SectionEditor.tsx
 * ═════════════════════════════════════════════════════════════
 * Allows editing survey sections with descriptions and section buttons.
 * Supports per-option conditional navigation (jump logic) for
 * multiple_choice, checkboxes, and dropdown questions.
 *
 * Cross-section drag-and-drop:
 *   - Drag state is lifted to the parent (EditCustomSurveyDialog).
 *   - SectionEditor receives a `dragState` prop describing the
 *     currently-dragged item and callbacks to update it.
 *   - Each section renders as a valid drop zone, highlighted whenever
 *     a drag is in progress.
 */

import { useState, useRef } from 'react'
import { SurveyCategory, Question, RichTextContent, SectionButton } from '@/types/SurveyBuilder'
import RichTextEditor from './RichTextEditor'

// ─── Cross-section drag types (shared with parent) ────────────────────────

export interface CrossSectionDragState {
  /** Section the dragged question came from */
  sourceSectionId: string
  /** The question being dragged */
  questionId: string
  /** Visual placeholder index inside the source section */
  sourceIndex: number
}

// ─── Option Action Types ───────────────────────────────────────────────────

export type OptionActionType = 'next' | 'jump' | 'submit'

export interface OptionAction {
  type: OptionActionType
  /** Only used when type === 'jump' */
  targetSectionId?: string
}

// ─── Helper ───────────────────────────────────────────────────────────────

function getActionLabel(action: OptionAction | undefined, allSections: SurveyCategory[]): string {
  if (!action || action.type === 'next') return 'Continue'
  if (action.type === 'submit') return 'Submit form'
  if (action.type === 'jump') {
    const sec = allSections.find(s => s.id === action.targetSectionId)
    return sec ? `→ ${sec.name || `Section ${sec.order}`}` : 'Jump (unknown)'
  }
  return 'Continue'
}

// ─── OptionActionDropdown ─────────────────────────────────────────────────

interface OptionActionDropdownProps {
  optId: string
  action: OptionAction | undefined
  allSections: SurveyCategory[]
  currentSectionId: string
  onChange: (action: OptionAction) => void
}

function OptionActionDropdown({
  optId,
  action,
  allSections,
  currentSectionId,
  onChange,
}: OptionActionDropdownProps) {
  const [open, setOpen] = useState(false)
  const otherSections = allSections.filter(s => s.id !== currentSectionId)

  const currentType = action?.type || 'next'

  function handleSelectType(type: OptionActionType, targetSectionId?: string) {
    onChange({ type, targetSectionId })
    if (type !== 'jump') setOpen(false)
  }

  const badgeColors: Record<OptionActionType, string> = {
    next: 'bg-gray-100 text-gray-500 border-gray-200',
    jump: 'bg-blue-50 text-blue-600 border-blue-200',
    submit: 'bg-amber-50 text-amber-600 border-amber-200',
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="Set action for this option"
        className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border rounded-full transition-colors hover:opacity-80 ${badgeColors[currentType]}`}
      >
        {currentType === 'next' && <span>↓</span>}
        {currentType === 'jump' && <span>⤵</span>}
        {currentType === 'submit' && <span>✓</span>}
        <span className="max-w-[80px] truncate">{getActionLabel(action, allSections)}</span>
        <span className="ml-0.5 opacity-60">▾</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 z-20 w-48 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            <button
              onClick={() => handleSelectType('next')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                currentType === 'next' ? 'bg-gray-50 font-semibold text-gray-800' : 'text-gray-700'
              }`}
            >
              <span className="text-gray-400">↓</span>
              Continue to next question
              {currentType === 'next' && <span className="ml-auto text-green-500">✓</span>}
            </button>

            <button
              onClick={() => handleSelectType('submit')}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-amber-50 transition-colors border-t border-gray-100 ${
                currentType === 'submit' ? 'bg-amber-50 font-semibold text-amber-700' : 'text-gray-700'
              }`}
            >
              <span className="text-amber-500">✓</span>
              Submit form
              {currentType === 'submit' && <span className="ml-auto text-green-500">✓</span>}
            </button>

            {otherSections.length > 0 && (
              <div className="border-t border-gray-100">
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                  Jump to section
                </p>
                {otherSections.map(sec => {
                  const isSelected = currentType === 'jump' && action?.targetSectionId === sec.id
                  return (
                    <button
                      key={sec.id}
                      onClick={() => handleSelectType('jump', sec.id)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-blue-50 transition-colors ${
                        isSelected ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-blue-400 shrink-0">⤵</span>
                      <span className="truncate">{sec.name || `Section ${sec.order}`}</span>
                      {isSelected && <span className="ml-auto text-green-500 shrink-0">✓</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────

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

  // ── Cross-section drag props ──────────────────────────────────────────
  /** Current global drag state (null when nothing is being dragged) */
  crossDragState: CrossSectionDragState | null
  /** Called when a drag on a question in *this* section starts */
  onCrossDragStart: (state: CrossSectionDragState) => void
  /** Called when the drag ends (dropped or cancelled) */
  onCrossDragEnd: () => void
  /**
   * Called when the user drops onto this section.
   * @param targetSectionId  – this section's id
   * @param targetIndex      – position in this section's questions array to insert at
   */
  onCrossDrop: (targetSectionId: string, targetIndex: number) => void
}

// ─── Component ────────────────────────────────────────────────────────────

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
  crossDragState,
  onCrossDragStart,
  onCrossDragEnd,
  onCrossDrop,
}: SectionEditorProps) {
  // ── local option-drag state (only within a single question's options) ──
  const [optDragIndex, setOptDragIndex] = useState<{ qId: string; idx: number } | null>(null)
  const [optDragOverIndex, setOptDragOverIndex] = useState<number | null>(null)

  // ── cross-section: which slot inside *this* section is hovered ─────────
  const [dropOverIndex, setDropOverIndex] = useState<number | null>(null)

  // Ref to prevent draggable being stuck on after mouseup
  const draggableEls = useRef<Map<string, HTMLElement>>(new Map())

  // Is a cross-section drag currently in progress?
  const isDragging = crossDragState !== null
  // Is the currently-dragged question from THIS section?
  const dragFromHere = crossDragState?.sourceSectionId === section.id

  // ── helpers ────────────────────────────────────────────────────────────

  function handleOptionActionChange(q: any, optId: string, newAction: OptionAction) {
    const updatedOptions = (q.options || []).map((o: any) =>
      o.id === optId ? { ...o, action: newAction } : o,
    )
    onUpdateQuestion?.(section.id, q.id, { options: updatedOptions })
  }

  function supportsJumpLogic(type: string) {
    return ['multiple_choice', 'dropdown'].includes(type)
  }

  // ── question-level drag handlers ───────────────────────────────────────

  function handleQuestionDragStart(e: React.DragEvent, q: any, idx: number) {
    e.dataTransfer.effectAllowed = 'move'
    // Store minimal payload (also used by drop target in another section)
    e.dataTransfer.setData('text/plain', JSON.stringify({ questionId: q.id, sourceSectionId: section.id }))
    onCrossDragStart({ sourceSectionId: section.id, questionId: q.id, sourceIndex: idx })
  }

  function handleQuestionDragEnd(e: React.DragEvent, elKey: string) {
    // Reset draggable on the row element so it doesn't stay sticky
    const el = draggableEls.current.get(elKey)
    if (el) el.draggable = false
    setDropOverIndex(null)
    onCrossDragEnd()
  }

  // ── section-level drag-over / drop handlers ────────────────────────────

  function handleSectionDragOver(e: React.DragEvent) {
    if (!isDragging) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleQuestionRowDragOver(e: React.DragEvent, idx: number) {
    if (!isDragging) return
    e.preventDefault()
    e.stopPropagation()
    setDropOverIndex(idx)
  }

  function handleSectionBodyDragOver(e: React.DragEvent) {
    if (!isDragging) return
    e.preventDefault()
    if (dropOverIndex === null) setDropOverIndex(section.questions.length)
  }

  function handleSectionDrop(e: React.DragEvent) {
    e.preventDefault()
    if (!isDragging) return
    const insertAt = dropOverIndex ?? section.questions.length
    setDropOverIndex(null)
    onCrossDrop(section.id, insertAt)
  }

  function handleQuestionRowDrop(e: React.DragEvent, idx: number) {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) return
    setDropOverIndex(null)
    onCrossDrop(section.id, idx)
  }

  function handleSectionDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropOverIndex(null)
    }
  }

  // ── render ─────────────────────────────────────────────────────────────

  // Cross-section: highlight when a drag from ANOTHER section hovers here
  const sectionIsDragTarget = isDragging && !dragFromHere
  const sectionIsActiveDrop = isDragging && dropOverIndex !== null && !dragFromHere

  // Same-section reorder: show insert line whenever we have a hovered slot,
  // regardless of source section
  const showInsertLine = (targetIdx: number, sourceQuestionId: string) => {
    if (!isDragging || dropOverIndex !== targetIdx) return false
    // Don't show the line on the dragged item itself or directly after it
    // (dropping there would be a no-op)
    const sourceIdx = section.questions.findIndex(q => q.id === sourceQuestionId)
    if (dragFromHere && (targetIdx === sourceIdx || targetIdx === sourceIdx + 1)) return false
    return true
  }

  return (
    <div
      className={`border rounded-xl transition-all ${
        sectionIsActiveDrop
          ? 'border-violet-400 bg-violet-50/60 shadow-md ring-2 ring-violet-300'
          : sectionIsDragTarget
          ? 'border-blue-300 bg-blue-50/30 border-dashed border-3 '
          : isExpanded
          ? 'border-blue-300 bg-blue-50/40 shadow-sm ' 
          : 'border-gray-200 bg-gray-50/30 hover:border-gray-300 '
      }`}
      onDragOver={handleSectionDragOver}
      onDrop={handleSectionDrop}
      onDragLeave={handleSectionDragLeave}
    >
      {/* ── Header / Collapse Toggle ── */}
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
            {sectionIsDragTarget && (
              <span className="ml-2 text-violet-500 font-medium animate-pulse">↓ Drop here</span>
            )}
          </p>
        </div>
        <span className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* ── Expanded Content ── */}
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

            {/* Section Description */}
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

            {/* ── Questions ── */}
            {section.questions && section.questions.length > 0 && (
              <div className="pt-3 border-t border-blue-100">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Questions ({section.questions.length})
                </p>

                {/* Drop zone: wraps all rows + a trailing empty-zone */}
                <div
                  className={`space-y-2 rounded-lg border p-3 transition-colors ${
                    sectionIsActiveDrop
                      ? 'border-violet-300 bg-violet-50/40'
                      : 'bg-white border-blue-100 '
                  }`}
                  onDragOver={handleSectionBodyDragOver}
                >
                  {section.questions.map((q: any, idx: number) => {
                    const isQuestionExpanded = expandedQuestionId === q.id
                    const hasJumpLogic = supportsJumpLogic(q.type)
                    const isBeingDragged =
                      crossDragState?.questionId === q.id &&
                      crossDragState?.sourceSectionId === section.id
                    const showLineAbove = showInsertLine(idx, crossDragState?.questionId ?? '')

                    return (
                      <div key={q.id}>
                        {/* ── Insert-before indicator ── */}
                        {showLineAbove && (
                          <div className="h-1 my-1 rounded-full bg-violet-400 transition-all shadow-sm" />
                        )}

                        <div
                          onDragOver={e => handleQuestionRowDragOver(e, idx)}
                          onDrop={e => handleQuestionRowDrop(e, idx)}
                          className={`rounded border transition-all ${
                            isBeingDragged
                              ? 'opacity-40 border-dashed border-violet-300 bg-violet-50'
                              : 'border-transparent'
                          }`}
                        >
                          {/* Drag handle + collapse toggle */}
                          <div className="flex items-center gap-2 w-full">
                            {/* ── Drag handle ── */}
                            <div
                              className="w-5 h-5 bg-gray-300 hover:bg-violet-300 rounded shrink-0 cursor-grab active:cursor-grabbing ml-2 mt-1 flex items-center justify-center text-gray-500 hover:text-violet-700 transition-colors select-none"
                              title="Drag to reorder (across sections)"
                              draggable
                              onDragStart={e => handleQuestionDragStart(e, q, idx)}
                              onDragEnd={e => handleQuestionDragEnd(e, q.id)}
                            >
                              ⠿
                            </div>

                            <button
                              onDragStart={e => e.preventDefault()}
                              onClick={() => onExpandQuestion?.(isQuestionExpanded ? null : q.id)}
                              className={`flex-1 flex items-start justify-between gap-2 p-2 rounded border transition-all ${
                                isQuestionExpanded
                                  ? 'bg-violet-100 border-violet-300 w-10/12'
                                  : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50 w-10/12'
                              }`}
                            >
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-xs font-medium text-gray-900 line-clamp-2 break-words w-full">
                                  {typeof q.prompt === 'string' ? q.prompt : q.prompt?.text || '(untitled)'}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {q.type} {q.required && '• Required'}
                                  {hasJumpLogic && ' • Jump logic'}
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
                                  onChange={(e) =>
                                    onUpdateQuestion?.(section.id, q.id, {
                                      prompt: typeof q.prompt === 'object'
                                        ? { ...q.prompt, text: e.target.value }
                                        : e.target.value,
                                    })
                                  }
                                  placeholder="Enter the question text..."
                                  className="w-full px-2 py-2 border border-violet-200 rounded text-xs text-gray-700 bg-white hover:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                                  rows={2}
                                />
                              </div>

                              {/* Question Type */}
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                  Question Type
                                </label>
                                <select
                                  value={q.type}
                                  onChange={(e) => onChangeQuestionType?.(section.id, q.id, e.target.value)}
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

                              {/* Required */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`req-${q.id}`}
                                  checked={q.required || false}
                                  onChange={(e) =>
                                    onUpdateQuestion?.(section.id, q.id, { required: e.target.checked })
                                  }
                                  className="w-4 h-4 accent-violet-600 rounded"
                                />
                                <label htmlFor={`req-${q.id}`} className="text-xs font-medium text-gray-700 cursor-pointer">
                                  Mark as required
                                </label>
                              </div>

                              {/* Options + Jump Logic */}
                              {['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type) && q.options && (
                                <div className="pt-3 border-t border-violet-200 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-gray-700">
                                      Options ({q.options.filter((o: any) => o.value_key !== '__other__').length})
                                    </p>
                                    {hasJumpLogic && (
                                      <span className="text-[10px] bg-blue-50 text-blue-500 border border-blue-100 rounded-full px-2 py-0.5 font-medium">
                                        ⤵ Jump logic enabled
                                      </span>
                                    )}
                                  </div>

                                  {hasJumpLogic && (
                                    <div className="flex items-center gap-2 px-2">
                                      <div className="w-4 shrink-0" />
                                      <p className="flex-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Option</p>
                                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide w-28 text-right">When selected</p>
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    {q.options.map((opt: any, optIdx: number) => {
                                      const isOther = opt.value_key === '__other__'
                                      return (
                                        <div
                                          key={opt.id}
                                          draggable={!isOther}
                                          onDragStart={() => setOptDragIndex({ qId: q.id, idx: optIdx })}
                                          onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOptDragOverIndex(optIdx) }}
                                          onDrop={e => {
                                            e.stopPropagation()
                                            if (!optDragIndex || optDragIndex.qId !== q.id || optDragIndex.idx === optIdx) return
                                            if (isOther) return
                                            const reordered = [...q.options]
                                            const [moved] = reordered.splice(optDragIndex.idx, 1)
                                            reordered.splice(optIdx, 0, moved)
                                            const withoutOther = reordered.filter((o: any) => o.value_key !== '__other__')
                                            const otherOpt = reordered.find((o: any) => o.value_key === '__other__')
                                            const final = otherOpt ? [...withoutOther, otherOpt] : withoutOther
                                            onUpdateQuestion?.(section.id, q.id, {
                                              options: final.map((o, i) => ({ ...o, order: i + 1 }))
                                            })
                                            setOptDragIndex(null); setOptDragOverIndex(null)
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
                                            <div className="w-4 h-4 bg-gray-200 rounded shrink-0 cursor-grab active:cursor-grabbing flex items-center justify-center text-gray-400 text-[10px]">
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
                                                    .replace(/\s+/g, '_'),
                                                })
                                              }
                                            }}
                                            placeholder={`Option ${optIdx + 1}`}
                                            className={`flex-1 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 ${
                                              isOther
                                                ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed'
                                                : 'border-violet-100 focus:ring-violet-400 bg-white'
                                            }`}
                                          />

                                          {hasJumpLogic && !isOther && (
                                            <OptionActionDropdown
                                              optId={opt.id}
                                              action={opt.action as OptionAction | undefined}
                                              allSections={allSections}
                                              currentSectionId={section.id}
                                              onChange={(newAction) =>
                                                handleOptionActionChange(q, opt.id, newAction)
                                              }
                                            />
                                          )}

                                          <button
                                            onClick={() => onRemoveOption?.(q.id, opt.id)}
                                            className="px-2 py-1 text-xs text-red-600 hover:text-red-700 transition-colors shrink-0"
                                            title="Delete option"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      )
                                    })}
                                  </div>

                                  {/* Add Option / Add Other */}
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
                                          const newId = `${q.id}-opt-other`
                                          onUpdateQuestion?.(section.id, q.id, {
                                            options: [
                                              ...(q.options || []),
                                              { id: newId, label: 'Other:', value_key: '__other__', order: (q.options?.length || 0) + 1 },
                                            ],
                                          } as any)
                                        }}
                                        className="flex-1 px-2 py-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                                      >
                                        + Add "Other"
                                      </button>
                                    )}
                                  </div>

                                  {/* Selection limit for checkboxes */}
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
                                                selectionLimit: { type: (q as any).selectionLimit?.type, count }
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

                              {/* Delete Question */}
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
                      </div>
                    )
                  })}

                  {/* ── Trailing drop zone (append to end) ── */}
                  {isDragging && (() => {
                    // Hide the "drop at end" zone if the dragged item is already
                    // the last question in this section (would be a no-op)
                    const srcIdx = dragFromHere
                      ? section.questions.findIndex(q => q.id === crossDragState?.questionId)
                      : -1
                    const isAlreadyLast = dragFromHere && srcIdx === section.questions.length - 1
                    if (isAlreadyLast) return null
                    return (
                      <div
                        onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropOverIndex(section.questions.length) }}
                        onDrop={e => { e.preventDefault(); e.stopPropagation(); onCrossDrop(section.id, section.questions.length); setDropOverIndex(null) }}
                        className={`mt-1 rounded border-2 border-dashed text-center py-2 text-xs font-medium transition-all select-none ${
                          dropOverIndex === section.questions.length
                            ? 'border-violet-400 bg-violet-50 text-violet-600'
                            : 'border-gray-200 text-gray-400'
                        }`}
                      >
                        {dropOverIndex === section.questions.length ? '⬇ Drop here' : '+ Drop at end'}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* Empty section drop zone (shown when section has no questions) */}
            {(!section.questions || section.questions.length === 0) && isDragging && (
              <div
                onDragOver={e => { e.preventDefault(); setDropOverIndex(0) }}
                onDrop={e => { e.preventDefault(); onCrossDrop(section.id, 0); setDropOverIndex(null) }}
                className={`rounded-lg border-2 border-dashed py-6 text-center text-xs font-medium transition-all ${
                  dropOverIndex === 0
                    ? 'border-violet-400 bg-violet-50 text-violet-600'
                    : 'border-gray-200 text-gray-400'
                }`}
              >
                ↓ Drop question here
              </div>
            )}

            {/* Add Question */}
            {onAddQuestion && (
              <div className="pt-3 border-t border-blue-100">
                <p className="text-xs font-semibold text-gray-700 mb-2">Add Question to This Section</p>
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

            
          </div>

          {/* Action Buttons */}
          <div className="border-t border-blue-200 px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {canMoveUp && (
                <button onClick={onMoveUp} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors" title="Move section up">▲</button>
              )}
              {canMoveDown && (
                <button onClick={onMoveDown} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors" title="Move section down">▼</button>
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