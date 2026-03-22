'use client'

/**
 * EditCustomSurveyDialog.tsx (Refactored)
 * ═════════════════════════════════════════════════════════════
 * Enhanced survey editing dialog with:
 *   - Real-time local state updates before persistence
 *   - Google Forms-style question block UI
 *   - Duplicate and delete per question
 *   - Full option management with drag-and-drop
 *   - Advanced question settings (required, scale config, etc.)
 *   - Cross-section drag-and-drop for questions
 *   - Validation with red borders on invalid fields
 *   - Section drag-and-drop with above/below drop position indicators
 *
 * Cross-section D&D architecture:
 *   crossDragState is owned HERE and passed down to every SectionEditor.
 *   SectionEditor calls onCrossDragStart / onCrossDragEnd / onCrossDrop.
 *   handleCrossDrop() splices the question out of the source section and
 *   inserts it at the correct position in the target section, then
 *   re-numbers all questions globally.
 *
 * Section D&D architecture:
 *   - Each section wrapper div is made draggable via its handle.
 *   - onDragOver compares cursor Y vs the target card's midpoint to
 *     resolve 'above' | 'below' without any delay.
 *   - sectionDropIndicator (targetSectionId + position) is passed to
 *     every SectionEditor so it can render the animated DropPositionLine.
 *   - isDraggingSection gates all unrelated hover styles.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/DatabaseClientManager'
import {
  Question,
  QuestionType,
  SurveySnapshot,
  SurveyCategory,
  QuestionOption,
  RichTextContent,
  SkipLogic,
  createQuestion,
  validateQuestion,
} from '@/types/SurveyBuilder'
import RichTextEditor from '@/components/survey/RichTextEditor'
import SectionEditor, {
  CrossSectionDragState,
  SectionDropIndicator,
} from '@/components/survey/SectionEditor'
import SkipLogicEditor from '@/components/survey/SkipLogicEditor'



interface Props {
  surveyId: string
  snapshot: SurveySnapshot
}

function parseQuestionsFromSnapshot(snapshot: SurveySnapshot): Question[] {
  const allCats: SurveyCategory[] = snapshot?.categories ?? []
  const raw: any[] = allCats.flatMap((c: any) => c.questions ?? [])

  return raw.map((q: any) => {
    let type: QuestionType = q.type as QuestionType
    if ((type as string) === 'single_select') type = 'multiple_choice'
    if ((type as string) === 'scale') type = 'linear_scale'

    const hasOptions = ['multiple_choice', 'checkboxes', 'dropdown'].includes(type)
    const isScale = type === 'linear_scale'

    return {
      id: q.id ?? `q-${Math.random().toString(36).substr(2, 9)}`,
      type,
      prompt: q.prompt ?? '',
      required: q.required ?? false,
      ...(hasOptions
        ? {
            options: (q.options ?? []).map((o: any, idx: number) => {
              const label = typeof o === 'string' ? o : o.label ?? ''
              return {
                id: o.id ?? `opt-${idx}`,
                label,
                value_key: o.value_key ?? label.toLowerCase().replace(/\s+/g, '_'),
                order: o.order ?? idx + 1,
              } as QuestionOption
            }),
          }
        : {}),
      ...(isScale
        ? {
            scaleMin: q.scaleMin ?? 1,
            scaleMax: q.scaleMax ?? 5,
            minLabel: q.minLabel ?? 'Low',
            maxLabel: q.maxLabel ?? 'High',
          }
        : {}),
      ...(type === 'checkboxes' && q.selectionLimit
        ? { selectionLimit: q.selectionLimit }
        : {}),
    } as Question
  })
}

export default function EditCustomSurveyDialog({ surveyId, snapshot }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState<RichTextContent | undefined>()
  const [sections, setSections] = useState<SurveyCategory[]>([])
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<string>>(new Set())
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invalidQuestionIds, setInvalidQuestionIds] = useState<Set<string>>(new Set())
  const [invalidSectionIds, setInvalidSectionIds] = useState<Set<string>>(new Set())

  // ── Cross-section (question) drag state ──────────────────────────────
  const [crossDragState, setCrossDragState] = useState<CrossSectionDragState | null>(null)

  // ── Section-card drag state ───────────────────────────────────────────
  const [draggingSectionIndex, setDraggingSectionIndex] = useState<number | null>(null)
  const [sectionDropIndicator, setSectionDropIndicator] = useState<SectionDropIndicator | null>(null)
  // Refs for each section card so we can read their DOMRects during dragOver
  const sectionCardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const isDraggingSection = draggingSectionIndex !== null

  // ── Auto-scroll during drag ───────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const dragClientY = useRef<number>(0)
  const scrollRafRef = useRef<number | null>(null)

  function runAutoScroll() {
    const el = scrollContainerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const y = dragClientY.current
    const ZONE = 80
    const MAX_SPEED = 18
    let speed = 0
    if (y < rect.top + ZONE && y > rect.top) {
      speed = -MAX_SPEED * (1 - (y - rect.top) / ZONE)
    } else if (y > rect.bottom - ZONE && y < rect.bottom) {
      speed = MAX_SPEED * (1 - (rect.bottom - y) / ZONE)
    }
    if (speed !== 0) el.scrollBy({ top: speed })
    scrollRafRef.current = requestAnimationFrame(runAutoScroll)
  }

  function startAutoScroll() {
    if (scrollRafRef.current !== null) return
    scrollRafRef.current = requestAnimationFrame(runAutoScroll)
  }

  function stopAutoScroll() {
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current)
      scrollRafRef.current = null
    }
  }

  useEffect(() => {
    if (!crossDragState && !isDraggingSection) stopAutoScroll()
  }, [crossDragState, isDraggingSection])

  useEffect(() => () => stopAutoScroll(), [])

  // ── Enable scroll wheel during drag ──────────────────────────────────
  const isDraggingRef = useRef(false)

  useEffect(() => {
    isDraggingRef.current = crossDragState !== null || isDraggingSection
  }, [crossDragState, isDraggingSection])

  useEffect(() => {
    function handleWheel(e: WheelEvent) {
      if (!isDraggingRef.current) return
      const el = scrollContainerRef.current
      if (!el) return
      e.preventDefault()
      e.stopPropagation()
      el.scrollTop += e.deltaY
    }

    window.addEventListener('wheel', handleWheel, { passive: false, capture: true })
    return () => window.removeEventListener('wheel', handleWheel, { capture: true })
  }, [])

  function handleScrollContainerDragOver(e: React.DragEvent) {
    dragClientY.current = e.clientY
    startAutoScroll()
  }

  function handleScrollContainerDragLeave() {
    stopAutoScroll()
  }

  // ── Open / Close ──────────────────────────────────────────────────────

  function handleOpen() {
    setTitle(snapshot?.packName ?? '')
    const desc = snapshot?.description
    if (!desc) {
      setDescription(undefined)
    } else if (typeof desc === 'string') {
      setDescription({ text: desc })
    } else {
      setDescription(desc as RichTextContent)
    }
    setSections(snapshot?.categories ?? [])
    setExpandedQuestionIds(new Set())
    setExpandedSectionIds(new Set())
    setSaving(false)
    setError(null)
    setSuccess(false)
    setInvalidQuestionIds(new Set())
    setInvalidSectionIds(new Set())
    setCrossDragState(null)
    setDraggingSectionIndex(null)
    setSectionDropIndicator(null)
    setIsOpen(true)
  }

  function handleClose() {
    setCrossDragState(null)
    setDraggingSectionIndex(null)
    setSectionDropIndicator(null)
    setIsOpen(false)
  }

  // ── Cross-section (question) drag handlers ────────────────────────────

  const handleCrossDragStart = useCallback((state: CrossSectionDragState) => {
    setCrossDragState(state)
  }, [])

  const handleCrossDragEnd = useCallback(() => {
    setCrossDragState(null)
  }, [])

  const handleCrossDrop = useCallback(
    (targetSectionId: string, targetIndex: number) => {
      if (!crossDragState) return
      const { sourceSectionId, questionId } = crossDragState
      setCrossDragState(null)

      setSections(prev => {
        const sourceSection = prev.find(s => s.id === sourceSectionId)
        if (!sourceSection) return prev
        const questionToMove = sourceSection.questions.find(q => q.id === questionId)
        if (!questionToMove) return prev

        return prev.map(section => {
          if (section.id === sourceSectionId && section.id === targetSectionId) {
            const sourceIdx = section.questions.findIndex(q => q.id === questionId)
            if (sourceIdx === -1) return section
            const qs = [...section.questions]
            qs.splice(sourceIdx, 1)
            const insertAt = targetIndex > sourceIdx
              ? Math.min(targetIndex - 1, qs.length)
              : Math.min(targetIndex, qs.length)
            qs.splice(insertAt, 0, questionToMove)
            return { ...section, questions: qs.map((q, i) => ({ ...q, order: i + 1 })) }
          }
          if (section.id === sourceSectionId) {
            return {
              ...section,
              questions: section.questions
                .filter(q => q.id !== questionId)
                .map((q, i) => ({ ...q, order: i + 1 })),
            }
          }
          if (section.id === targetSectionId) {
            const qs = [...section.questions]
            qs.splice(Math.min(targetIndex, qs.length), 0, questionToMove)
            return { ...section, questions: qs.map((q, i) => ({ ...q, order: i + 1 })) }
          }
          return section
        })
      })
    },
    [crossDragState],
  )

  // ── Section-card drag handlers ────────────────────────────────────────

  function handleSectionDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('section-drag-index', String(index))
    setDraggingSectionIndex(index)
    isDraggingRef.current = true

    const cardEl = sectionCardRefs.current.get(sections[index].id)
    if (cardEl) {
      const clone = cardEl.cloneNode(true) as HTMLElement
      clone.style.position = 'fixed'
      clone.style.top = '-9999px'
      clone.style.left = '-9999px'
      clone.style.width = `${cardEl.offsetWidth}px`
      clone.style.opacity = '1'
      clone.style.pointerEvents = 'none'
      clone.style.borderRadius = '12px'
      clone.style.boxShadow = '0 8px 30px rgba(0,0,0,0.18)'
      document.body.appendChild(clone)
      const cardRect = cardEl.getBoundingClientRect()
      e.dataTransfer.setDragImage(clone, e.clientX - cardRect.left, e.clientY - cardRect.top)
      setTimeout(() => document.body.removeChild(clone), 0)
    }
  }

  function handleSectionDragEnd() {
    setDraggingSectionIndex(null)
    setSectionDropIndicator(null)
    isDraggingRef.current = crossDragState !== null
    stopAutoScroll()
  }

  /**
   * Resolves above/below by comparing cursor Y to the target card's midpoint.
   * Uses a stable-reference equality check to avoid redundant re-renders.
   */
  function handleSectionCardDragOver(
    e: React.DragEvent,
    targetSectionId: string,
    targetIndex: number,
  ) {
    if (!isDraggingSection) return
    // Only respond to section drags, not question drags
    if (!e.dataTransfer.types.includes('section-drag-index')) return
    if (targetIndex === draggingSectionIndex) {
      // Hovering over self — clear indicator
      setSectionDropIndicator(prev => (prev === null ? null : null))
      return
    }
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'

    dragClientY.current = e.clientY
    startAutoScroll()

    const cardEl = sectionCardRefs.current.get(targetSectionId)
    if (!cardEl) return
    const rect = cardEl.getBoundingClientRect()
    const position: 'above' | 'below' = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below'

    // Suppress indicator if the drop would not actually change position.
    // e.g. dragging index 1 "below" index 0 → would land at index 1 = no change
    // dragging index 1 "above" index 2 → would land at index 1 = no change
    const fromIndex = draggingSectionIndex!
    const wouldLandAt = position === 'above' ? targetIndex : targetIndex + 1
    const effectiveInsert = wouldLandAt > fromIndex ? wouldLandAt - 1 : wouldLandAt
    if (effectiveInsert === fromIndex) {
      setSectionDropIndicator(null)
      return
    }

    setSectionDropIndicator(prev =>
      prev?.targetSectionId === targetSectionId && prev?.position === position
        ? prev
        : { targetSectionId, position },
    )
  }

  function handleSectionCardDragLeave(e: React.DragEvent, targetSectionId: string) {
    const cardEl = sectionCardRefs.current.get(targetSectionId)
    if (cardEl && cardEl.contains(e.relatedTarget as Node)) return
    setSectionDropIndicator(prev =>
      prev?.targetSectionId === targetSectionId ? null : prev,
    )
  }

  function handleSectionCardDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault()
    e.stopPropagation()

    const raw = e.dataTransfer.getData('section-drag-index')
    if (!raw) return
    const fromIndex = parseInt(raw, 10)
    if (isNaN(fromIndex)) return

    const indicator = sectionDropIndicator
    setDraggingSectionIndex(null)
    setSectionDropIndicator(null)
    isDraggingRef.current = crossDragState !== null

    if (fromIndex === targetIndex) return

    setSections(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(fromIndex, 1)

      // Adjust insertion index after removal
      let insertAt = targetIndex > fromIndex ? targetIndex - 1 : targetIndex
      // If dropping 'below', shift one more
      if (indicator?.position === 'below') insertAt = Math.min(insertAt + 1, arr.length)

      arr.splice(insertAt, 0, moved)
      return arr.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  // ── Section CRUD ──────────────────────────────────────────────────────

  function addNewSection() {
    const newSection: SurveyCategory = {
      id: `sec-${Date.now()}`,
      name: `Section ${sections.length + 1}`,
      description: '',
      order: sections.length + 1,
      questions: [],
    }
    setSections(prev => [...prev, newSection])
    setExpandedSectionIds(prev => new Set(prev).add(newSection.id))
  }

  function removeSection(id: string) {
    setSections(prev => prev.filter(s => s.id !== id))
    setExpandedSectionIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  function updateSection(id: string, updates: Partial<SurveyCategory>) {
    setSections(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)))
    if (updates.name?.trim()) {
      setInvalidSectionIds(prev => { const next = new Set(prev); next.delete(id); return next })
    }
  }

  function moveSectionUp(index: number) {
    if (index === 0) return
    setSections(prev => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr.map((s, idx) => ({ ...s, order: idx + 1 }))
    })
  }

  function moveSectionDown(index: number) {
    if (index === sections.length - 1) return
    setSections(prev => {
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr.map((s, idx) => ({ ...s, order: idx + 1 }))
    })
  }

  // ── Question CRUD ─────────────────────────────────────────────────────

  function addNewQuestion(sectionId: string, type: QuestionType) {
    const targetSection = sections.find(s => s.id === sectionId)
    if (!targetSection) {
      const newSection: SurveyCategory = {
        id: `sec-${Date.now()}`,
        name: `Section ${sections.length + 1}`,
        description: undefined,
        order: sections.length + 1,
        questions: [],
        sectionButtons: [],
        collapsedByDefault: false,
      }
      const newQuestion = createQuestion(type)
      newSection.questions = [newQuestion]
      setSections(prev => [...prev, newSection])
      setExpandedQuestionIds(prev => new Set(prev).add(newQuestion.id))
      setExpandedSectionIds(prev => new Set(prev).add(newSection.id))
      return
    }

    const newQuestion = createQuestion(type)
    setSections(prev =>
      prev.map(s =>
        s.id === sectionId
          ? { ...s, questions: [...(s.questions || []), newQuestion] }
          : s
      )
    )
    setExpandedQuestionIds(prev => new Set(prev).add(newQuestion.id))
    setExpandedSectionIds(prev => new Set(prev).add(sectionId))
  }

  function removeQuestion(id: string) {
    setSections(prev =>
      prev.map(s => ({
        ...s,
        questions: (s.questions || []).filter(q => q.id !== id),
      }))
    )
    setExpandedQuestionIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  function updateQuestion(id: string, updates: Partial<Question>) {
    setSections(prev =>
      prev.map(s => ({
        ...s,
        questions: (s.questions || []).map(q => (q.id === id ? { ...q, ...updates } : q)),
      }))
    )
    setInvalidQuestionIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function changeQuestionType(sectionId: string, questionId: string, newType: string) {
    setSections(prev =>
      prev.map(s => {
        if (s.id !== sectionId) return s
        return {
          ...s,
          questions: (s.questions || []).map(q => {
            if (q.id !== questionId) return q
            const newQuestion: Question = {
              id: q.id,
              type: newType as QuestionType,
              prompt: q.prompt,
              required: q.required,
              order: q.order,
            }
            if (['multiple_choice', 'checkboxes', 'dropdown'].includes(newType)) {
              newQuestion.options =
                q.options && q.options.length > 0
                  ? q.options
                  : [
                      { id: `${questionId}-opt-1`, label: 'Option 1', value_key: 'option_1', order: 1 },
                      { id: `${questionId}-opt-2`, label: 'Option 2', value_key: 'option_2', order: 2 },
                    ]
              if (newType === 'checkboxes' && (q as any).selectionLimit) {
                newQuestion.selectionLimit = (q as any).selectionLimit
              }
            }
            if (newType === 'linear_scale') {
              newQuestion.scaleMin = q.scaleMin || 1
              newQuestion.scaleMax = q.scaleMax || 5
              newQuestion.minLabel = q.minLabel || 'Strongly Disagree'
              newQuestion.maxLabel = q.maxLabel || 'Strongly Agree'
            }
            return newQuestion
          }),
        }
      })
    )
  }

  // ── Option CRUD ───────────────────────────────────────────────────────

  function addOptionToQuestion(questionId: string, label: string = '') {
    setSections(prev =>
      prev.map(s => ({
        ...s,
        questions: (s.questions || []).map(q => {
          if (q.id !== questionId) return q
          const newOptions = [...(q.options || [])]
          const newId = `${questionId}-opt-${newOptions.length}`
          newOptions.push({
            id: newId,
            label: label || `Option ${newOptions.length + 1}`,
            value_key: (label || `Option ${newOptions.length + 1}`)
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '_'),
            order: newOptions.length,
          })
          return { ...q, options: newOptions }
        }),
      }))
    )
  }

  function removeOptionFromQuestion(questionId: string, optionId: string) {
    setSections(prev =>
      prev.map(s => ({
        ...s,
        questions: (s.questions || []).map(q => {
          if (q.id !== questionId) return q
          return {
            ...q,
            options: (q.options || [])
              .filter(o => o.id !== optionId)
              .map((o, idx) => ({ ...o, order: idx + 1 })),
          }
        }),
      }))
    )
  }

  function updateOption(questionId: string, optionId: string, updates: Partial<QuestionOption>) {
    setSections(prev =>
      prev.map(s => ({
        ...s,
        questions: (s.questions || []).map(q => {
          if (q.id !== questionId) return q
          return {
            ...q,
            options: (q.options || []).map(o => (o.id === optionId ? { ...o, ...updates } : o)),
          }
        }),
      }))
    )
  }

  function moveOptionUp(questionId: string, optionIndex: number) {
    if (optionIndex === 0) return
    setSections(prev =>
      prev.map(s => ({
        ...s,
        questions: (s.questions || []).map(q => {
          if (q.id !== questionId) return q
          const opts = [...(q.options || [])]
          ;[opts[optionIndex - 1], opts[optionIndex]] = [opts[optionIndex], opts[optionIndex - 1]]
          return { ...q, options: opts.map((o, idx) => ({ ...o, order: idx + 1 })) }
        }),
      }))
    )
  }

  function moveOptionDown(questionId: string, optionIndex: number) {
    setSections(prev =>
      prev.map(s => {
        const q = (s.questions || []).find(qq => qq.id === questionId)
        if (!q || !q.options || optionIndex === q.options.length - 1) return s
        return {
          ...s,
          questions: (s.questions || []).map(qq => {
            if (qq.id !== questionId) return qq
            const opts = [...(qq.options || [])]
            ;[opts[optionIndex], opts[optionIndex + 1]] = [opts[optionIndex + 1], opts[optionIndex]]
            return { ...qq, options: opts.map((o, idx) => ({ ...o, order: idx + 1 })) }
          }),
        }
      })
    )
  }

  // ── Save ──────────────────────────────────────────────────────────────

  async function handleSave() {
    const totalQuestions = sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0)
    if (!title.trim() || totalQuestions === 0) {
      setError('Survey title and at least one question are required.')
      return
    }

    const invalidIds = new Set(
      sections.flatMap(s =>
        (s.questions || []).filter(q => validateQuestion(q).length > 0).map(q => q.id)
      )
    )
    const emptySectionIds = new Set(
      sections.filter(s => !s.name?.trim()).map(s => s.id)
    )
    const sectionsWithQuestionErrors = sections.filter(s =>
      (s.questions || []).some(q => invalidIds.has(q.id))
    )
    const allSectionsToExpand = new Set([
      ...emptySectionIds,
      ...sectionsWithQuestionErrors.map(s => s.id),
    ])

    if (emptySectionIds.size > 0 || invalidIds.size > 0) {
      if (emptySectionIds.size > 0) setInvalidSectionIds(emptySectionIds)
      if (invalidIds.size > 0) {
        setInvalidQuestionIds(invalidIds)
        setExpandedQuestionIds(new Set(invalidIds))
      }
      setExpandedSectionIds(allSectionsToExpand)
      setError('Please fill up the required fields.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const categories: SurveyCategory[] = sections.map((section, idx) => ({
        ...section,
        order: idx + 1,
        questions: (section.questions || []).map((q, qIdx) => ({
          ...q,
          order: qIdx + 1,
          options: q.options?.map((opt, optIdx) => ({ ...opt, order: optIdx + 1 })),
        })),
      }))

      const newSnapshot: SurveySnapshot = {
        ...snapshot,
        packName: title,
        description: description,
        categories,
      }

      const { error: updateErr } = await (supabase as any)
        .from('surveys')
        .update({ pack_version_snapshot: newSnapshot })
        .eq('id', surveyId)

      if (updateErr) throw new Error(updateErr.message || 'Failed to save survey')

      setSuccess(true)
      setTimeout(() => {
        router.refresh()
        handleClose()
      }, 1200)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
      >
        <span>✏️</span> Edit Questions
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit Survey Questions</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Changes apply to new responses immediately
                  {crossDragState && (
                    <span className="ml-2 text-violet-500 font-medium animate-pulse">
                      ✦ Dragging question — drop into any section
                    </span>
                  )}
                  {isDraggingSection && (
                    <span className="ml-2 text-blue-500 font-medium animate-pulse">
                      ✦ Dragging section — drop above or below another
                    </span>
                  )}
                </p>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                ×
              </button>
            </div>

            <div
              ref={scrollContainerRef}
              className="px-6 py-6 space-y-5 flex-1 overflow-y-auto"
              onDragOver={handleScrollContainerDragOver}
              onDragLeave={handleScrollContainerDragLeave}
            >
              {!success ? (
                <>
                  {/* Title */}
                  <div>
                    <label htmlFor="edit-survey-title" className="block text-sm font-semibold text-gray-800 mb-2">
                      Survey Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="edit-survey-title"
                      name="editSurveyTitle"
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g., Customer Satisfaction Survey"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="edit-survey-description" className="block text-sm font-semibold text-gray-800 mb-2">
                      Form Description <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <RichTextEditor
                      id="edit-survey-description"
                      name="editSurveyDescription"
                      value={description}
                      onChange={setDescription}
                      placeholder="Add context or instructions for respondents..."
                      rows={3}
                    />
                  </div>

                  {/* Sections */}
                  {sections.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Sections ({sections.length})
                      </p>
                      {sections.map((section, index) => (
                        <div
                          key={section.id}
                          style={{
                            display: 'grid',
                            gridTemplateRows: draggingSectionIndex === index ? '0fr' : '1fr',
                            transition: 'grid-template-rows 200ms ease',
                          }}
                          onDragStart={e => handleSectionDragStart(e, index)}
                          onDragEnd={e => {
                            ;(e.currentTarget as HTMLElement).draggable = false
                            handleSectionDragEnd()
                          }}
                          onDragOver={e => handleSectionCardDragOver(e, section.id, index)}
                          onDragLeave={e => handleSectionCardDragLeave(e, section.id)}
                          onDrop={e => handleSectionCardDrop(e, index)}
                        >
                          <div
                            ref={el => {
                              if (el) sectionCardRefs.current.set(section.id, el)
                              else sectionCardRefs.current.delete(section.id)
                            }}
                            style={{ overflow: 'hidden', opacity: draggingSectionIndex === index ? 0 : 1, transition: 'opacity 150ms ease' }}
                          >
                            <SectionEditor
                              section={{ ...section, order: index + 1 }}
                              invalidQuestionIds={invalidQuestionIds}
                              invalidSectionIds={invalidSectionIds}
                              allSections={sections}
                              isExpanded={expandedSectionIds.has(section.id)}
                              onExpand={() => setExpandedSectionIds(prev => {
                                const next = new Set(prev)
                                if (next.has(section.id)) { next.delete(section.id) } else { next.add(section.id) }
                                return next
                              })}
                              onUpdate={(updates) => updateSection(section.id, updates)}
                              onRemove={() => removeSection(section.id)}
                              onMoveUp={() => moveSectionUp(index)}
                              onMoveDown={() => moveSectionDown(index)}
                              canMoveUp={index > 0}
                              canMoveDown={index < sections.length - 1}
                              onAddQuestion={(sectionId, type) => addNewQuestion(sectionId, type as QuestionType)}
                              onRemoveQuestion={(sectionId, qId) => removeQuestion(qId)}
                              onUpdateQuestion={(sectionId, qId, updates) => updateQuestion(qId, updates)}
                              onAddOption={addOptionToQuestion}
                              onRemoveOption={removeOptionFromQuestion}
                              onUpdateOption={updateOption}
                              onMoveOptionUp={moveOptionUp}
                              onMoveOptionDown={moveOptionDown}
                              expandedQuestionId={expandedQuestionIds}
                              onExpandQuestion={(id: string | null) =>
                                setExpandedQuestionIds(prev => {
                                  const next = new Set(prev)
                                  if (id === null) return next
                                  if (next.has(id)) next.delete(id)
                                  else next.add(id)
                                  return next
                                })
                              }
                              onChangeQuestionType={changeQuestionType}
                              crossDragState={crossDragState}
                              onCrossDragStart={handleCrossDragStart}
                              onCrossDragEnd={handleCrossDragEnd}
                              onCrossDrop={handleCrossDrop}
                              isSectionDragging={isDraggingSection}
                              sectionDropIndicator={sectionDropIndicator}
                              onSectionHandleDragStart={e => handleSectionDragStart(e, index)}
                              onSectionHandleDragEnd={handleSectionDragEnd}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={addNewSection}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mb-4"
                  >
                    + Add Section
                  </button>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 whitespace-pre-wrap">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={handleClose}
                      disabled={saving}
                      className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={
                        !title.trim() ||
                        sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0) === 0 ||
                        saving
                      }
                      className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                          Saving…
                        </>
                      ) : (
                        <>💾 Save Changes ({sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0)})</>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">✓</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Survey Updated!</h3>
                  <p className="text-sm text-gray-500">Your changes have been saved successfully.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── QuestionEditBlock ─────────────────────────────────────────────────────

interface QuestionEditBlockProps {
  question: Question
  allQuestions: Question[]
  allSections: SurveyCategory[]
  index: number
  isExpanded: boolean
  totalQuestions: number
  onExpand: () => void
  onUpdate: (updates: Partial<Question>) => void
  onRemove: () => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddOption: (label?: string) => void
  onRemoveOption: (optionId: string) => void
  onUpdateOption: (optionId: string, updates: Partial<QuestionOption>) => void
  onMoveOptionUp: (optionIndex: number) => void
  onMoveOptionDown: (optionIndex: number) => void
}

function QuestionEditBlock({
  question,
  allQuestions,
  allSections,
  index,
  isExpanded,
  totalQuestions,
  onExpand,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  onMoveOptionUp,
  onMoveOptionDown,
}: QuestionEditBlockProps) {
  const typeLabels: Record<QuestionType, string> = {
    short_text: 'Short Text',
    long_text: 'Long Text',
    multiple_choice: 'Multiple Choice',
    checkboxes: 'Checkboxes',
    dropdown: 'Dropdown',
    linear_scale: 'Linear Scale',
    yes_no: 'Yes/No',
    email: 'Email',
    url: 'URL',
    date: 'Date',
    time: 'Time',
    number: 'Number',
  }

  const isSelectionQuestion = ['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type)
  const isScaleQuestion = question.type === 'linear_scale'

  return (
    <div
      className={`border rounded-xl transition-all ${
        isExpanded
          ? 'border-violet-300 bg-violet-50/40 shadow-sm'
          : 'border-gray-200 bg-gray-50/30 hover:border-gray-300'
      }`}
    >
      <button
        onClick={onExpand}
        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-violet-50/50 transition-colors"
      >
        <div className="shrink-0 w-8 h-8 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-xs font-semibold">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-medium text-gray-900 truncate">
            {typeof question.prompt === 'string' ? question.prompt : question.prompt?.text || '(untitled)'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded border border-gray-200">
              {typeLabels[question.type]}
            </span>
            {question.required && (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-medium">
                Required
              </span>
            )}
          </div>
        </div>
        <span className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {isExpanded && (
        <>
          <div className="border-t border-violet-200 px-4 py-4 space-y-4">
            <div>
              <label htmlFor={`edit-q-prompt-${question.id}`} className="block text-xs font-semibold text-gray-700 mb-1.5">
                Question <span className="text-red-400">*</span>
              </label>
              <RichTextEditor
                id={`edit-q-prompt-${question.id}`}
                name={`edit-question-prompt-${question.id}`}
                value={question.prompt}
                onChange={(richText) => onUpdate({ prompt: richText })}
                placeholder="Enter your question here..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id={`edit-q-required-${question.id}`}
                name={`editQRequired_${question.id}`}
                type="checkbox"
                checked={question.required}
                onChange={e => onUpdate({ required: e.target.checked })}
                className="w-4 h-4 accent-violet-600 rounded"
              />
              <label htmlFor={`edit-q-required-${question.id}`} className="text-sm text-gray-700 cursor-pointer">
                This question is required
              </label>
            </div>

            <SkipLogicEditor
              question={question}
              allQuestions={allQuestions}
              allSections={allSections}
              skipLogic={question.skipLogic ? question.skipLogic[0] : null}
              onUpdate={(skipLogic) => onUpdate({ skipLogic: skipLogic ? [skipLogic] : undefined })}
            />

            {isSelectionQuestion && (
              <div className="space-y-2 pt-2 border-t border-violet-100">
                <p className="text-xs font-semibold text-gray-700">Options</p>
                {(question.options || []).map((option, optIdx) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 shrink-0">{optIdx + 1}.</span>
                    <input
                      id={`edit-opt-${question.id}-${option.id}`}
                      name={`editOpt_${question.id}_${option.id}`}
                      type="text"
                      value={option.label}
                      onChange={e => onUpdateOption(option.id, { label: e.target.value })}
                      placeholder={`Option ${optIdx + 1}`}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <div className="flex gap-1">
                      {optIdx > 0 && (
                        <button onClick={() => onMoveOptionUp(optIdx)} className="p-1 text-gray-400 hover:text-gray-600 text-xs" title="Move up">▲</button>
                      )}
                      {optIdx < (question.options || []).length - 1 && (
                        <button onClick={() => onMoveOptionDown(optIdx)} className="p-1 text-gray-400 hover:text-gray-600 text-xs" title="Move down">▼</button>
                      )}
                      {(question.options || []).length > 2 && (
                        <button onClick={() => onRemoveOption(option.id)} className="p-1 text-red-500 hover:text-red-700 text-xs">✕</button>
                      )}
                    </div>
                  </div>
                ))}
                <button onClick={() => onAddOption()} className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-2">
                  + Add Option
                </button>
              </div>
            )}

            {isScaleQuestion && (
              <div className="space-y-3 pt-2 border-t border-violet-100">
                <p className="text-xs font-semibold text-gray-700">Scale Configuration</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`edit-scale-min-${question.id}`} className="block text-xs text-gray-600 mb-1">Min Value</label>
                    <input id={`edit-scale-min-${question.id}`} name={`editScaleMin_${question.id}`} type="number" min="1" value={question.scaleMin || 1} onChange={e => onUpdate({ scaleMin: parseInt(e.target.value) || 1 })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label htmlFor={`edit-scale-max-${question.id}`} className="block text-xs text-gray-600 mb-1">Max Value</label>
                    <input id={`edit-scale-max-${question.id}`} name={`editScaleMax_${question.id}`} type="number" min="2" max="10" value={question.scaleMax || 5} onChange={e => onUpdate({ scaleMax: parseInt(e.target.value) || 5 })} className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`edit-scale-min-label-${question.id}`} className="block text-xs text-gray-600 mb-1">Min Label</label>
                    <input id={`edit-scale-min-label-${question.id}`} name={`editScaleMinLabel_${question.id}`} type="text" value={question.minLabel || ''} onChange={e => onUpdate({ minLabel: e.target.value })} placeholder="e.g., Strongly Disagree" className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label htmlFor={`edit-scale-max-label-${question.id}`} className="block text-xs text-gray-600 mb-1">Max Label</label>
                    <input id={`edit-scale-max-label-${question.id}`} name={`editScaleMaxLabel_${question.id}`} type="text" value={question.maxLabel || ''} onChange={e => onUpdate({ maxLabel: e.target.value })} placeholder="e.g., Strongly Agree" className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-violet-200 px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {index > 0 && (
                <button onClick={onMoveUp} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors" title="Move up">▲</button>
              )}
              {index < totalQuestions - 1 && (
                <button onClick={onMoveDown} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors" title="Move down">▼</button>
              )}
              <button onClick={onDuplicate} className="px-2.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors font-medium" title="Duplicate">
                📋 Duplicate
              </button>
            </div>
            <button onClick={onRemove} className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors font-medium">
              🗑️ Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}