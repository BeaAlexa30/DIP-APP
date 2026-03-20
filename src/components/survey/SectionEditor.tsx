'use client'

/**
 * SectionEditor.tsx
 * ═════════════════════════════════════════════════════════════
 * Allows editing survey sections with descriptions and section buttons.
 * Supports per-option conditional navigation (jump logic) for
 * multiple_choice and dropdown questions.
 *
 * Cross-section drag-and-drop:
 *   - Drag state is lifted to the parent (EditCustomSurveyDialog).
 *   - SectionEditor receives a `crossDragState` prop describing the
 *     currently-dragged item and callbacks to update it.
 *   - Each section renders as a valid drop zone, highlighted whenever
 *     a drag is in progress.
 *
 * Section drag-and-drop:
 *   - Drop position indicators (above/below) shown as animated lines
 *     between sections during drag, communicated via `sectionDropPosition`
 *     and `sectionDropTargetId` props from parent.
 */

import { useState, useRef } from 'react'
import { SurveyCategory, Question, RichTextContent, SectionButton } from '@/types/SurveyBuilder'
import RichTextEditor from './RichTextEditor'

// ─── Cross-section drag types (shared with parent) ────────────────────────

export interface CrossSectionDragState {
  sourceSectionId: string
  questionId: string
  sourceIndex: number
}

// ─── Section drop position indicator (shared with parent) ─────────────────

/**
 * Describes where a dragged section will be inserted.
 * `position: 'above'` = insert before `targetSectionId`
 * `position: 'below'` = insert after  `targetSectionId`
 */
export interface SectionDropIndicator {
  targetSectionId: string
  position: 'above' | 'below'
}

// ─── Option Action Types ───────────────────────────────────────────────────

export type OptionActionType = 'next' | 'jump' | 'submit'

export interface OptionAction {
  type: OptionActionType
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

function OptionActionDropdown({ optId, action, allSections, currentSectionId, onChange }: OptionActionDropdownProps) {
  const [open, setOpen] = useState(false)
  const otherSections = allSections.filter(s => s.id !== currentSectionId)
  const currentType = action?.type || 'next'

  function handleSelectType(type: OptionActionType, targetSectionId?: string) {
    onChange({ type, targetSectionId })
    if (type !== 'jump') setOpen(false)
  }

  const badgeColors: Record<OptionActionType, string> = {
    next:   'bg-gray-100 text-gray-500 border-gray-200',
    jump:   'bg-blue-50 text-blue-600 border-blue-200',
    submit: 'bg-amber-50 text-amber-600 border-amber-200',
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        title="Set action for this option"
        className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium border rounded-full transition-colors hover:opacity-80 ${badgeColors[currentType]}`}
      >
        {currentType === 'next'   && <span>↓</span>}
        {currentType === 'jump'   && <span>⤵</span>}
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

// ─── DropPositionLine ─────────────────────────────────────────────────────

/**
 * An animated drop-position indicator rendered between sections.
 * Appears with a smooth scale-in so it never feels jarring.
 */
function DropPositionLine({ label }: { label: string }) {
  return (
    <div
      className="relative flex items-center gap-2 px-1 pointer-events-none"
      style={{
        animation: 'dropLineReveal 120ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      }}
    >
      {/* Pill label */}
      <span
        className="shrink-0 px-2 py-0.5 text-[10px] font-semibold text-white rounded-full shadow-sm"
        style={{ background: 'linear-gradient(90deg, #7c3aed, #6366f1)' }}
      >
        {label}
      </span>
      {/* Line */}
      <div
        className="flex-1 h-0.5 rounded-full"
        style={{ background: 'linear-gradient(90deg, #7c3aed, #818cf8, transparent)' }}
      />
      {/* Dot cap */}
      <div className="shrink-0 w-2 h-2 rounded-full bg-violet-500 shadow-sm shadow-violet-300" />

      <style>{`
        @keyframes dropLineReveal {
          from { opacity: 0; transform: scaleX(0.6); }
          to   { opacity: 1; transform: scaleX(1); }
        }
      `}</style>
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
  expandedQuestionId?: Set<string> | string | null
  onExpandQuestion?: (questionId: string | null) => void
  onChangeQuestionType?: (sectionId: string, questionId: string, newType: string) => void
  invalidQuestionIds?: Set<string>
  invalidSectionIds?: Set<string>
  // ── Cross-section drag props ──────────────────────────────────────────
  crossDragState: CrossSectionDragState | null
  onCrossDragStart: (state: CrossSectionDragState) => void
  onCrossDragEnd: () => void
  onCrossDrop: (targetSectionId: string, targetIndex: number) => void
  // ── Section-level drag-drop indicator props ───────────────────────────
  /**
   * When a section card is being dragged over this section, the parent
   * resolves whether the drop would land "above" or "below" and passes
   * the result here so we can render the correct indicator.
   */
  sectionDropIndicator?: SectionDropIndicator | null
  /** True while ANY section card is being dragged (not a question drag). */
  isSectionDragging?: boolean
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
  invalidQuestionIds,
  invalidSectionIds,
  crossDragState,
  onCrossDragStart,
  onCrossDragEnd,
  onCrossDrop,
  sectionDropIndicator,
  isSectionDragging = false,
}: SectionEditorProps) {
  const [showAddButton, setShowAddButton] = useState(false)
  const [buttonLabel, setButtonLabel] = useState('')
  const [buttonTarget, setButtonTarget] = useState('')

  // ── local option-drag state ───────────────────────────────────────────
  const [optDragIndex, setOptDragIndex] = useState<{ qId: string; idx: number } | null>(null)
  const [optDragOverIndex, setOptDragOverIndex] = useState<number | null>(null)

  // ── cross-section: which slot inside *this* section is hovered ────────
  const [dropOverIndex, setDropOverIndex] = useState<number | null>(null)

  const draggableEls = useRef<Map<string, HTMLElement>>(new Map())

  const isDragging   = crossDragState !== null
  const dragFromHere = crossDragState?.sourceSectionId === section.id

  // ── section-level drop indicator derivations ─────────────────────────
  const showAboveLine =
    isSectionDragging &&
    sectionDropIndicator?.targetSectionId === section.id &&
    sectionDropIndicator?.position === 'above'

  const showBelowLine =
    isSectionDragging &&
    sectionDropIndicator?.targetSectionId === section.id &&
    sectionDropIndicator?.position === 'below'

  const sectionIsDragTarget =
    isSectionDragging &&
    sectionDropIndicator?.targetSectionId === section.id

  // ── helpers ───────────────────────────────────────────────────────────

  function supportsJumpLogic(type: string) {
    return ['multiple_choice', 'dropdown'].includes(type)
  }

  function handleOptionActionChange(q: any, optId: string, newAction: OptionAction) {
    const updatedOptions = (q.options || []).map((o: any) =>
      o.id === optId ? { ...o, action: newAction } : o
    )
    onUpdateQuestion?.(section.id, q.id, { options: updatedOptions })
  }

  function handleAddSectionButton() {
    if (!buttonLabel.trim() || !buttonTarget) return
    const newButtons = [...(section.sectionButtons || [])]
    newButtons.push({ id: `btn-${Date.now()}`, label: buttonLabel, targetSectionId: buttonTarget })
    onUpdate({ sectionButtons: newButtons })
    setButtonLabel('')
    setButtonTarget('')
    setShowAddButton(false)
  }

  function handleRemoveSectionButton(buttonId: string) {
    const newButtons = (section.sectionButtons || []).filter(b => b.id !== buttonId)
    onUpdate({ sectionButtons: newButtons })
  }

  // ── question drag handlers ────────────────────────────────────────────

  function handleQuestionDragStart(e: React.DragEvent, q: any, idx: number) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('question-drag', JSON.stringify({ questionId: q.id, sourceSectionId: section.id }))
    onCrossDragStart({ sourceSectionId: section.id, questionId: q.id, sourceIndex: idx })
  }

  function handleQuestionDragEnd(e: React.DragEvent, elKey: string) {
    const el = draggableEls.current.get(elKey)
    if (el) el.draggable = false
    setDropOverIndex(null)
    onCrossDragEnd()
  }

  // ── section drag-over / drop handlers ────────────────────────────────

  function handleSectionDragOver(e: React.DragEvent) {
    if (!isDragging) return
    if (!e.dataTransfer.types.includes('question-drag')) return
    e.preventDefault()
    e.stopPropagation()
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
    if (!isDragging) return
    e.preventDefault()
    e.stopPropagation()
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

  // ── insert-line helper ────────────────────────────────────────────────

  const showInsertLine = (targetIdx: number, sourceQuestionId: string) => {
    if (!isDragging || dropOverIndex !== targetIdx) return false
    const sourceIdx = section.questions.findIndex(q => q.id === sourceQuestionId)
    if (dragFromHere && (targetIdx === sourceIdx || targetIdx === sourceIdx + 1)) return false
    return true
  }

  // ── derived drag states ───────────────────────────────────────────────

  const questionAreaIsDragTarget  = isDragging && !dragFromHere
  const questionAreaIsActiveDrop  = isDragging && dropOverIndex !== null && !dragFromHere
  const sectionWrapperRef = useRef<HTMLDivElement>(null)

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* ── ABOVE drop indicator ──────────────────────────────────────── */}
      {showAboveLine && (
        <div className="mb-1">
          <DropPositionLine label="Insert above" />
        </div>
      )}

      <div
        ref={sectionWrapperRef}
        draggable={false}
        onDragStart={e => {
          if ((e.target as HTMLElement).closest('[data-section-handle]')) {
            e.dataTransfer.effectAllowed = 'move'
          }
        }}
        className={`border rounded-xl transition-all duration-150 ${
          sectionIsDragTarget
            ? 'border-violet-300 bg-violet-50/50 shadow-md ring-2 ring-violet-200 ring-offset-1 scale-[1.005]'
            : questionAreaIsActiveDrop
            ? 'border-violet-400 bg-violet-50/60 shadow-md ring-2 ring-violet-300'
            : questionAreaIsDragTarget
            ? 'border-blue-300 bg-blue-50/30 border-dashed border-3'
            : isExpanded
            ? 'border-blue-300 bg-blue-50/40 shadow-sm'
            : 'border-gray-200 bg-gray-50/30 hover:border-gray-300'
        }`}
        onDragOver={handleSectionDragOver}
        onDrop={handleSectionDrop}
        onDragLeave={handleSectionDragLeave}
      >
        {/* Header / Collapse Toggle */}
        <div className="flex items-center">
          <div
            data-section-handle
            className="w-5 h-5 bg-gray-300 rounded shrink-0 cursor-grab active:cursor-grabbing flex items-center justify-center text-gray-500 ml-3"
            title="Drag to reorder section"
            onMouseDown={() => {
              const wrapper = sectionWrapperRef.current?.parentElement as HTMLElement
              if (wrapper) wrapper.draggable = true
            }}
            onMouseUp={() => {
              const wrapper = sectionWrapperRef.current?.parentElement as HTMLElement
              if (wrapper) wrapper.draggable = false
            }}
          >
            ⠿
          </div>
          <button
            onClick={onExpand}
            className="flex-1 px-4 py-3 flex items-start gap-3 hover:bg-blue-50/50 transition-colors w-full"
          >
            <div className="shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-semibold">
              {section.order}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-gray-900 break-words">{section.name || '(Untitled Section)'}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {section.questions.length} question{section.questions.length !== 1 ? 's' : ''}
                {sectionIsDragTarget && (
                  <span className="ml-2 text-violet-500 font-medium animate-pulse">
                    {sectionDropIndicator?.position === 'above' ? '↑ Drop above' : '↓ Drop below'}
                  </span>
                )}
                {questionAreaIsDragTarget && !sectionIsDragTarget && (
                  <span className="ml-2 text-violet-500 font-medium animate-pulse">↓ Drop here</span>
                )}
              </p>
            </div>
            <span className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>

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
                  className={`w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 transition-colors ${
                    invalidSectionIds?.has(section.id)
                      ? 'border-red-400 focus:ring-red-300'
                      : 'border-gray-200 focus:ring-blue-400'
                  }`}
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

              {/* Questions */}
              {section.questions && section.questions.length > 0 && (
                <div className="pt-3 border-t border-blue-100">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Questions ({section.questions.length})
                  </p>

                  <div
                    className={`space-y-2 rounded-lg border p-3 transition-colors ${
                      questionAreaIsActiveDrop ? 'border-violet-300 bg-violet-50/40' : 'bg-white border-blue-100'
                    }`}
                    onDragOver={handleSectionBodyDragOver}
                  >
                    {section.questions.map((q: any, idx: number) => {
                      const isQuestionExpanded = expandedQuestionId instanceof Set
                        ? expandedQuestionId.has(q.id)
                        : expandedQuestionId === q.id
                      const hasJumpLogic   = supportsJumpLogic(q.type)
                      const isBeingDragged = crossDragState?.questionId === q.id && crossDragState?.sourceSectionId === section.id
                      const showLineAbove  = showInsertLine(idx, crossDragState?.questionId ?? '')

                      return (
                        <div key={q.id}>
                          {/* Insert-before indicator */}
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
                            {/* Drag handle + collapse toggle row */}
                            <div className="flex items-center gap-2 w-full">
                              {!isQuestionExpanded && (
                                <div
                                  className="w-5 h-5 bg-gray-300 hover:bg-violet-300 rounded shrink-0 cursor-grab active:cursor-grabbing ml-2 mt-1 flex items-center justify-center text-gray-500 hover:text-violet-700 transition-colors select-none"
                                  title="Drag to reorder (across sections)"
                                  draggable
                                  onDragStart={e => handleQuestionDragStart(e, q, idx)}
                                  onDragEnd={e => handleQuestionDragEnd(e, q.id)}
                                >
                                  ⠿
                                </div>
                              )}

                              <button
                                onDragStart={e => e.preventDefault()}
                                onClick={() => onExpandQuestion?.(q.id)}
                                className={`w-10/12 flex items-start justify-between gap-2 p-2 rounded border transition-all ${
                                  isQuestionExpanded
                                    ? 'bg-violet-100 border-violet-300'
                                    : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50'
                                }`}
                              >
                                <div className=" text-left w-11/12">
                                  <p className="text-xs font-medium text-gray-900 break-words w-full ">
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
                                    onChange={(e) => {
                                      onUpdateQuestion?.(section.id, q.id, {
                                        prompt: typeof q.prompt === 'object'
                                          ? { ...q.prompt, text: e.target.value }
                                          : e.target.value,
                                      })
                                    }}
                                    placeholder="Enter the question text..."
                                    className={`w-full px-2 py-2 border rounded text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 resize-none transition-colors ${
                                      invalidQuestionIds?.has(q.id)
                                        ? 'border-red-400 focus:ring-red-300'
                                        : 'border-violet-200 hover:border-violet-300 focus:ring-violet-400'
                                    }`}
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
                                    onChange={(e) => onUpdateQuestion?.(section.id, q.id, { required: e.target.checked })}
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
                                              onUpdateQuestion?.(section.id, q.id, { options: final.map((o, i) => ({ ...o, order: i + 1 })) })
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
                                                    value_key: e.target.value.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_'),
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
                                                onChange={(newAction) => handleOptionActionChange(q, opt.id, newAction)}
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

                    {/* Trailing drop zone */}
                    {isDragging && (() => {
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

              {/* Empty section drop zone */}
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

      {/* ── BELOW drop indicator ──────────────────────────────────────── */}
      {showBelowLine && (
        <div className="mt-1">
          <DropPositionLine label="Insert below" />
        </div>
      )}
    </div>
  )
}