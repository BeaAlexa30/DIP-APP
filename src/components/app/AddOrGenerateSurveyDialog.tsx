'use client'

/**
 * AddOrGenerateSurveyDialog.tsx (Refactored)
 * ═════════════════════════════════════════════════════════════
 * Enhanced survey creation dialog with:
 *   - Dynamic question types matching Google Forms
 *   - Real-time option management (add, delete, reorder)
 *   - Question duplication and bulk deletion
 *   - Advanced settings (required, selection limits, scale config)
 *   - Improved UI with collapsible question blocks
 */

import { useState, useEffect, useCallback, useRef } from 'react'
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

// ── Types ──────────────────────────────────────────────────────────────────────

interface Pack {
  id: string
  name: string
  version: string
  description: string | null
}

interface ProjectContext {
  industry: string | null
  goal: string | null
  stage: string | null
  channels: string[] | null
  target_audience: string | null
}

interface Recommendation {
  packId: string
  packName: string
  reason: string
  recommended: boolean
}

interface GenerateResult {
  surveyId: string
  token: string
  shareLink: string
  surveyTitle: string
  questionCount: number
  categoryCount: number
}

interface Props {
  projectId: string
  projectName: string
  projectContext: ProjectContext
  packs: Pack[]
  existingPackIds: string[]
}

type Tab = 'recommend' | 'generate' | 'custom'
type RecommendState = 'idle' | 'loading' | 'done' | 'error'
type GenerateStep = 'form' | 'generating' | 'done' | 'error'

// ── Component ──────────────────────────────────────────────────────────────────

export default function AddOrGenerateSurveyDialog({
  projectId,
  projectName,
  projectContext,
  packs,
  existingPackIds,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('recommend')

  // — Recommendations state —
  const [recState, setRecState] = useState<RecommendState>('idle')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [recError, setRecError] = useState<string | null>(null)
  const [addingPackId, setAddingPackId] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [addedPackIds, setAddedPackIds] = useState<Set<string>>(new Set())

  // — Generate state —
  const [genStep, setGenStep] = useState<GenerateStep>('form')
  const [surveyDescription, setSurveyDescription] = useState('')
  const [showTips, setShowTips] = useState(false)
  const [genResult, setGenResult] = useState<GenerateResult | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // — Custom Survey state (Sections Only) ——
  const [customSurveyTitle, setCustomSurveyTitle] = useState('')
  const [customSurveyDescription, setCustomSurveyDescription] = useState<RichTextContent | undefined>()
  const [customSections, setCustomSections] = useState<SurveyCategory[]>([])
  const [expandedQuestionIds, setExpandedQuestionIds] = useState<Set<string>>(new Set())
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(new Set())
  const [customSaving, setCustomSaving] = useState(false)
  const [customError, setCustomError] = useState<string | null>(null)
  const [customSuccess, setCustomSuccess] = useState(false)
  const [invalidQuestionIds, setInvalidQuestionIds] = useState<Set<string>>(new Set())
  const [invalidSectionIds, setInvalidSectionIds] = useState<Set<string>>(new Set())

  // ── Cross-section (question) drag state ──────────────────────────────
  const [crossDragState, setCrossDragState] = useState<CrossSectionDragState | null>(null)

  // ── Section-card drag state ───────────────────────────────────────────
  const [draggingSectionIndex, setDraggingSectionIndex] = useState<number | null>(null)
  const [sectionDropIndicator, setSectionDropIndicator] = useState<SectionDropIndicator | null>(null)
  const sectionCardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  const isDraggingSection = draggingSectionIndex !== null

  // ── Auto-scroll during drag ───────────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const dragClientY = useRef<number>(0)
  const scrollRafRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)

  useEffect(() => {
    isDraggingRef.current = crossDragState !== null || isDraggingSection
  }, [crossDragState, isDraggingSection])

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

  const availablePacks = packs.filter(p =>
    !existingPackIds.includes(p.id) && !addedPackIds.has(p.id)
  )

  // ── Fetch recommendations when dialog opens on recommend tab ─────────────────
  const fetchRecommendations = useCallback(async () => {
    if (availablePacks.length === 0) return
    setRecState('loading')
    setRecError(null)
    try {
      const res = await fetch('/api/survey/recommend-frameworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          availablePackIds: availablePacks.map(p => p.id),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setRecError(json.error ?? 'Failed to get recommendations.')
        setRecState('error')
        return
      }
      setRecommendations(json.recommendations ?? [])
      setRecState('done')
    } catch (e: any) {
      setRecError(e.message)
      setRecState('error')
    }
  }, [projectId, availablePacks.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && tab === 'recommend' && recState === 'idle' && availablePacks.length > 0) {
      fetchRecommendations()
    }
  }, [isOpen, tab, recState, fetchRecommendations, availablePacks.length])

  // ── Add a recommended framework pack ────────────────────────────────────────
  async function handleAddPack(packId: string) {
    setAddingPackId(packId)
    setAddError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated.')

      const pack = packs.find(p => p.id === packId)
      const isAiPack = pack?.version?.startsWith('ai-')

      let snapshot: any

      if (isAiPack) {
        const { data: existingSurvey, error: snapErr } = await (supabase as any)
          .from('surveys')
          .select('pack_version_snapshot')
          .eq('pack_id', packId)
          .limit(1)
          .single()
        if (snapErr || !existingSurvey) throw new Error('Could not retrieve AI framework snapshot.')
        snapshot = existingSurvey.pack_version_snapshot
      } else {
        const snapRes = await fetch('/api/assessment-frameworks/capture-version', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ packId }),
        })
        if (!snapRes.ok) throw new Error('Failed to create framework snapshot.')
        snapshot = await snapRes.json()
      }

      const { data: survey, error: surveyErr } = await (supabase as any)
        .from('surveys')
        .insert({
          project_id: projectId,
          pack_id: packId,
          pack_version_snapshot: snapshot,
          status: 'published',
        })
        .select()
        .single()
      if (surveyErr || !survey) throw new Error(surveyErr?.message ?? 'Failed to create survey.')

      const token = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      await (supabase as any).from('survey_tokens').insert({
        survey_id: survey.id,
        token,
        max_responses: null,
        expires_at: null,
      })

      setAddedPackIds(prev => new Set([...prev, packId]))
      router.refresh()
    } catch (e: any) {
      setAddError(e.message)
    } finally {
      setAddingPackId(null)
    }
  }

  // ── Generate new AI survey ─────────────────────────────────────────────────
  const isGenFormValid = surveyDescription.trim().length > 20

  async function handleGenerate() {
    if (!isGenFormValid) return
    setGenStep('generating')
    setGenError(null)
    try {
      const res = await fetch('/api/survey/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          surveyDescription: surveyDescription.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setGenError(json.error ?? 'Failed to generate survey.')
        setGenStep('error')
        return
      }
      setGenResult(json)
      setGenStep('done')
    } catch (e: any) {
      setGenError(e.message)
      setGenStep('error')
    }
  }

  async function handleCopyLink() {
    if (!genResult) return
    await navigator.clipboard.writeText(`${window.location.origin}${genResult.shareLink}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Custom Survey Functions ────────────────────────────────────────────────
  function addNewQuestion(sectionId: string, type: QuestionType) {
    // Add to the specified section
    const targetSection = customSections.find(s => s.id === sectionId)
    if (!targetSection) {
      // If section doesn't exist, create one and add the question
      const newSection: SurveyCategory = {
        id: `sec-${Date.now()}`,
        name: `Section ${customSections.length + 1}`,
        description: undefined,
        order: customSections.length + 1,
        questions: [],
        sectionButtons: [],
        collapsedByDefault: false,
      }
      const newQuestion = createQuestion(type)
      newSection.questions = [newQuestion]
      setCustomSections(prev => [...prev, newSection])
      setExpandedQuestionIds(prev => new Set(prev).add(newQuestion.id))
      setExpandedSectionIds(prev => new Set(prev).add(newSection.id))
      return
    }
    
    const newQuestion = createQuestion(type)
    setCustomSections(prev =>
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
    setCustomSections(prev =>
      prev.map(s => ({
        ...s,
        questions: (s.questions || []).filter(q => q.id !== id)
      }))
    )
    setExpandedQuestionIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  function duplicateQuestion(id: string) {
    setCustomSections(prev =>
      prev.map(s => {
        const qIdx = (s.questions || []).findIndex(q => q.id === id)
        if (qIdx === -1) return s
        
        const original = s.questions![qIdx]
        const duplicate: Question = {
          ...original,
          id: createQuestion(original.type).id,
          options: original.options?.map((opt, idx) => ({
            ...opt,
            id: `${createQuestion(original.type).id}-opt-${idx}`,
          })),
        }
        
        const newQuestions = [...(s.questions || [])]
        newQuestions.splice(qIdx + 1, 0, duplicate)
        setExpandedQuestionIds(prev => new Set(prev).add(duplicate.id))
        return { ...s, questions: newQuestions }
      })
    )
  }

  function updateQuestion(id: string, updates: Partial<Question>) {
    setCustomSections(prev =>
      prev.map(s => ({
        ...s,
        questions: (s.questions || []).map(q => (q.id === id ? { ...q, ...updates } : q))
      }))
    )
  }

  function changeQuestionType(sectionId: string, questionId: string, newType: string) {
    setCustomSections(prev =>
      prev.map(s => {
        if (s.id !== sectionId) return s
        return {
          ...s,
          questions: (s.questions || []).map(q => {
            if (q.id !== questionId) return q
            // Create a new question of the new type, preserving the prompt and required status
            const newQuestion: Question = {
              id: q.id,
              type: newType as QuestionType,
              prompt: q.prompt,
              required: q.required,
              order: q.order,
            }
            // Add default options for selection-based types
            if (['multiple_choice', 'checkboxes', 'dropdown'].includes(newType)) {
              newQuestion.options = q.options && q.options.length > 0 
                ? q.options 
                : [
                    { id: `${questionId}-opt-1`, label: 'Option 1', value_key: 'option_1', order: 1 },
                    { id: `${questionId}-opt-2`, label: 'Option 2', value_key: 'option_2', order: 2 },
                  ]
              // Preserve selection limit for checkboxes
              if (newType === 'checkboxes' && (q as any).selectionLimit) {
                newQuestion.selectionLimit = (q as any).selectionLimit
              }
            }
            // Add scale config for linear scale
            if (newType === 'linear_scale') {
              newQuestion.scaleMin = q.scaleMin || 1
              newQuestion.scaleMax = q.scaleMax || 5
              newQuestion.minLabel = q.minLabel || 'Strongly Disagree'
              newQuestion.maxLabel = q.maxLabel || 'Strongly Agree'
            }
            return newQuestion
          })
        }
      })
    )
  }

  function moveQuestionUp(index: number) {
    // Not applicable for section-based structure  
  }

  function moveQuestionDown(index: number) {
    // Not applicable for section-based structure
  }

  function addOptionToQuestion(questionId: string, label: string = '') {
    setCustomSections(prev =>
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
        })
      }))
    )
  }

  function removeOptionFromQuestion(questionId: string, optionId: string) {
    setCustomSections(prev =>
      prev.map(s => ({
        ...s,
        questions: (s.questions || []).map(q => {
          if (q.id !== questionId) return q
          return {
            ...q,
            options: (q.options || []).filter(o => o.id !== optionId).map((o, idx) => ({ ...o, order: idx + 1 })),
          }
        })
      }))
    )
  }

  function updateOption(questionId: string, optionId: string, updates: Partial<QuestionOption>) {
    setCustomSections(prev =>
      prev.map(s => ({
        ...s,
        questions: (s.questions || []).map(q => {
          if (q.id !== questionId) return q
          return {
            ...q,
            options: (q.options || []).map(o =>
              o.id === optionId ? { ...o, ...updates } : o
            ),
          }
        })
      }))
    )
  }

  function moveOptionUp(questionId: string, optionIndex: number) {
    if (optionIndex === 0) return
    setCustomSections(prev =>
      prev.map(s => ({
        ...s,
        questions: (s.questions || []).map(q => {
          if (q.id !== questionId) return q
          const opts = [...(q.options || [])]
          ;[opts[optionIndex - 1], opts[optionIndex]] = [opts[optionIndex], opts[optionIndex - 1]]
          return {
            ...q,
            options: opts.map((o, idx) => ({ ...o, order: idx + 1 })),
          }
        })
      }))
    )
  }

  function moveOptionDown(questionId: string, optionIndex: number) {
    setCustomSections(prev =>
      prev.map(s => {
        const q = (s.questions || []).find(qq => qq.id === questionId)
        if (!q || !q.options || optionIndex === q.options.length - 1) return s
        
        return {
          ...s,
          questions: (s.questions || []).map(qq => {
            if (qq.id !== questionId) return qq
            const opts = [...(qq.options || [])]
            ;[opts[optionIndex], opts[optionIndex + 1]] = [opts[optionIndex + 1], opts[optionIndex]]
            return {
              ...qq,
              options: opts.map((o, idx) => ({ ...o, order: idx + 1 })),
            }
          })
        }
      })
    )
  }

  // ── Section Management Functions ───────────────────────────────────────────
  function addNewSection() {
    const newSection: SurveyCategory = {
      id: `sec-${Date.now()}`,
      name: `Section ${customSections.length + 1}`,
      description: undefined,
      order: customSections.length + 1,
      questions: [],
      sectionButtons: [],
      collapsedByDefault: false,
    }
    setCustomSections(prev => [...prev, newSection])
    setExpandedSectionIds(prev => new Set(prev).add(newSection.id))
  }

  function removeSection(id: string) {
    setCustomSections(prev => prev.filter(s => s.id !== id))
    setExpandedSectionIds(prev => { const next = new Set(prev); next.delete(id); return next })
  }

  function updateSection(id: string, updates: Partial<SurveyCategory>) {
    setCustomSections(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    )
  }

  function moveSectionUp(index: number) {
    if (index === 0) return
    setCustomSections(prev => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr.map((s, idx) => ({ ...s, order: idx + 1 }))
    })
  }

  function moveSectionDown(index: number) {
    if (index === customSections.length - 1) return
    setCustomSections(prev => {
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr.map((s, idx) => ({ ...s, order: idx + 1 }))
    })
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

      setCustomSections(prev => {
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
  }

  function handleSectionDragEnd() {
    setDraggingSectionIndex(null)
    setSectionDropIndicator(null)
    isDraggingRef.current = crossDragState !== null
    stopAutoScroll()
  }

  function handleSectionCardDragOver(
    e: React.DragEvent,
    targetSectionId: string,
    targetIndex: number,
  ) {
    if (!isDraggingSection) return
    if (!e.dataTransfer.types.includes('section-drag-index')) return
    if (targetIndex === draggingSectionIndex) {
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

    setCustomSections(prev => {
      const arr = [...prev]
      const [moved] = arr.splice(fromIndex, 1)

      let insertAt = targetIndex > fromIndex ? targetIndex - 1 : targetIndex
      if (indicator?.position === 'below') insertAt = Math.min(insertAt + 1, arr.length)

      arr.splice(insertAt, 0, moved)
      return arr.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  async function handleSaveCustomSurvey() {
    // Validation - check for at least one question across all sections
    const totalQuestions = customSections.reduce((sum, s) => sum + (s.questions?.length || 0), 0)
    if (!customSurveyTitle.trim() || totalQuestions === 0) {
      setCustomError('Survey title and at least one question are required.')
      return
    }

    // Validate questions and collect invalid IDs
    const invalidIds = new Set(
      customSections.flatMap(s =>
        (s.questions || []).filter(q => validateQuestion(q).length > 0).map(q => q.id)
      )
    )
    // Validate sections (empty names)
    const emptySectionIds = new Set(
      customSections.filter(s => !s.name?.trim()).map(s => s.id)
    )
    // Get sections with question errors
    const sectionsWithQuestionErrors = customSections.filter(s =>
      (s.questions || []).some(q => invalidIds.has(q.id))
    )
    // All sections to expand
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
      setCustomError('Please fill up the required fields.')
      return
    }

    setCustomSaving(true)
    setCustomError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated.')

      // Build snapshot with section-based structure
      const categories: SurveyCategory[] = customSections.map((section, idx) => ({
        ...section,
        order: idx + 1,
        questions: section.questions || [],
      }))

      const snapshot: SurveySnapshot = {
        packName: customSurveyTitle,
        version: `custom-${Date.now()}`,
        ai_generated: false,
        custom_survey: true,
        description: customSurveyDescription,
        categories,
      }

      const { data: survey, error: surveyErr } = await (supabase as any)
        .from('surveys')
        .insert({
          project_id: projectId,
          pack_id: null,
          pack_version_snapshot: snapshot,
          status: 'published',
        })
        .select()
        .single()

      if (surveyErr) {
        throw new Error(`Database error: ${surveyErr?.message || 'Failed to create survey'}`)
      }
      if (!survey) throw new Error('Failed to create survey.')

      // Create token
      const token = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      const { error: tokenErr } = await (supabase as any).from('survey_tokens').insert({
        survey_id: survey.id,
        token,
        max_responses: null,
        expires_at: null,
      })

      if (tokenErr) {
        throw new Error(tokenErr?.message ?? 'Failed to create survey token.')
      }

      setCustomSuccess(true)
      setTimeout(() => {
        router.refresh()
        handleClose()
      }, 1500)
    } catch (e: any) {
      setCustomError(e.message)
    } finally {
      setCustomSaving(false)
    }
  }

  // Helper functions for expanded state (single-value compatibility)
  function setExpandedQuestionId(id: string | null) {
    setExpandedQuestionIds(prev => {
      const next = new Set(prev)
      if (id === null) next.clear()
      else next.add(id)
      return next
    })
  }

  function setExpandedSectionId(id: string | null) {
    setExpandedSectionIds(prev => {
      const next = new Set(prev)
      if (id === null) next.clear()
      else next.add(id)
      return next
    })
  }

  const expandedQuestionId = Array.from(expandedQuestionIds)[0] || null
  const expandedSectionId = Array.from(expandedSectionIds)[0] || null

  // ── Open/close ─────────────────────────────────────────────────────────────
  function handleOpen() {
    setIsOpen(true)
    setTab('recommend')
    setAddError(null)
    setGenStep('form')
    setSurveyDescription('')
    setShowTips(false)
    setGenResult(null)
    setGenError(null)
    setCopied(false)
    setCustomSurveyTitle('')
    setCustomSurveyDescription(undefined)
    setCustomSections([{
      id: `sec-${Date.now()}`,
      name: 'Section 1',
      description: undefined,
      order: 1,
      questions: [],
      sectionButtons: [],
      collapsedByDefault: false,
    }])
    setExpandedQuestionIds(new Set())
    setExpandedSectionIds(new Set())
    setCustomSaving(false)
    setCustomError(null)
    setCustomSuccess(false)
    if (recState === 'idle' || addedPackIds.size > 0) {
      setRecommendations([])
      setRecState('idle')
    }
  }

  function handleClose() {
    setIsOpen(false)
    if (genStep === 'done') router.refresh()
  }

  // ── Group recommendations ──────────────────────────────────────────────────
  const recommended = recommendations.filter(r => r.recommended)
  const notRecommended = recommendations.filter(r => !r.recommended)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-medium px-5 py-3 rounded-xl transition-all shadow-sm"
      >
        <span className="text-base">✨</span>
        Add or Generate AI Survey
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between rounded-t-2xl z-10">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-lg">✨</span>
                  <h2 className="text-lg font-bold text-gray-900">Add or Generate AI Survey</h2>
                  <span className="text-xs bg-violet-100 text-violet-700 font-medium px-2 py-0.5 rounded-full">
                    Powered by Groq
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Project: <span className="font-medium text-gray-700">{projectName}</span>
                </p>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none mt-0.5">
                ×
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              {(['recommend', 'generate', 'custom'] as const).map(tabName => (
                <button
                  key={tabName}
                  onClick={() => setTab(tabName)}
                  className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                    tab === tabName
                      ? 'border-violet-600 text-violet-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {{
                    recommend: 'AI Recommendations',
                    generate: 'Generate New Survey',
                    custom: 'Create Custom',
                  }[tabName]}
                </button>
              ))}
            </div>

            <div className="px-6 py-6 space-y-5 flex-1 overflow-y-auto">
              {/* ══════════ TAB: AI Recommendations ══════════ */}
              {tab === 'recommend' && (
                <RecommendationsTab
                  availablePacks={availablePacks}
                  packs={packs}
                  recState={recState}
                  recommendations={recommendations}
                  recommended={recommended}
                  notRecommended={notRecommended}
                  recError={recError}
                  addError={addError}
                  addingPackId={addingPackId}
                  addedPackIds={addedPackIds}
                  onAddPack={handleAddPack}
                  onFetchRecommendations={fetchRecommendations}
                  onResetRecommendations={() => setRecommendations([])}
                />
              )}

              {/* ══════════ TAB: Generate New AI Survey ══════════ */}
              {tab === 'generate' && (
                <GenerateTab
                  genStep={genStep}
                  surveyDescription={surveyDescription}
                  showTips={showTips}
                  isGenFormValid={isGenFormValid}
                  genResult={genResult}
                  genError={genError}
                  copied={copied}
                  onSurveyDescriptionChange={setSurveyDescription}
                  onShowTipsToggle={() => setShowTips(v => !v)}
                  onGenerate={handleGenerate}
                  onClose={handleClose}
                  onCopyLink={handleCopyLink}
                />
              )}

              {/* ══════════ TAB: Create Custom Survey ══════════ */}
              {tab === 'custom' && (
                <CustomSurveyTab
                  customSurveyTitle={customSurveyTitle}
                  customSurveyDescription={customSurveyDescription}
                  customSections={customSections}
                  expandedQuestionId={expandedQuestionId}
                  expandedSectionId={expandedSectionId}
                  customError={customError}
                  customSaving={customSaving}
                  customSuccess={customSuccess}
                  invalidQuestionIds={invalidQuestionIds}
                  invalidSectionIds={invalidSectionIds}
                  crossDragState={crossDragState}
                  onCrossDragStart={handleCrossDragStart}
                  onCrossDragEnd={handleCrossDragEnd}
                  onCrossDrop={handleCrossDrop}
                  isDraggingSection={isDraggingSection}
                  sectionDropIndicator={sectionDropIndicator}
                  onTitleChange={setCustomSurveyTitle}
                  onDescriptionChange={setCustomSurveyDescription}
                  onAddQuestion={addNewQuestion}
                  onRemoveQuestion={removeQuestion}
                  onDuplicateQuestion={duplicateQuestion}
                  onMoveUp={moveQuestionUp}
                  onMoveDown={moveQuestionDown}
                  onUpdateQuestion={updateQuestion}
                  onExpandQuestion={(id: string | null) => setExpandedQuestionId(id === expandedQuestionId ? null : id)}
                  onChangeQuestionType={changeQuestionType}
                  onAddOption={addOptionToQuestion}
                  onRemoveOption={removeOptionFromQuestion}
                  onUpdateOption={updateOption}
                  onMoveOptionUp={moveOptionUp}
                  onMoveOptionDown={moveOptionDown}
                  onAddSection={addNewSection}
                  onRemoveSection={removeSection}
                  onUpdateSection={updateSection}
                  onMoveSectionUp={moveSectionUp}
                  onMoveSectionDown={moveSectionDown}
                  onExpandSection={(id: string) => setExpandedSectionId(id === expandedSectionId ? null : id)}
                  onSave={handleSaveCustomSurvey}
                  onClose={handleClose}
                  onSectionDragStart={handleSectionDragStart}
                  onSectionDragEnd={handleSectionDragEnd}
                  onSectionCardDragOver={handleSectionCardDragOver}
                  onSectionCardDragLeave={handleSectionCardDragLeave}
                  onSectionCardDrop={handleSectionCardDrop}
                  sectionCardRefs={sectionCardRefs}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Recommendations Tab Component ────────────────────────────────────────────

interface RecommendationsTabProps {
  availablePacks: Pack[]
  packs: Pack[]
  recState: RecommendState
  recommendations: Recommendation[]
  recommended: Recommendation[]
  notRecommended: Recommendation[]
  recError: string | null
  addError: string | null
  addingPackId: string | null
  addedPackIds: Set<string>
  onAddPack: (packId: string) => Promise<void>
  onFetchRecommendations: () => Promise<void>
  onResetRecommendations: () => void
}

function RecommendationsTab({
  availablePacks,
  packs,
  recState,
  recommendations,
  recommended,
  notRecommended,
  recError,
  addError,
  addingPackId,
  addedPackIds,
  onAddPack,
  onFetchRecommendations,
  onResetRecommendations,
}: RecommendationsTabProps) {
  return (
    <>
      {availablePacks.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <p className="text-base mb-1">All available frameworks are already added.</p>
          <p className="text-xs">Switch to "Generate New Survey" to create a custom one.</p>
        </div>
      )}

      {recState === 'loading' && availablePacks.length > 0 && (
        <div className="py-10 flex flex-col items-center gap-3 text-gray-500">
          <span className="animate-spin w-8 h-8 border-4 border-violet-300 border-t-violet-600 rounded-full inline-block" />
          <p className="text-sm">Groq is analyzing your project and finding applicable frameworks…</p>
        </div>
      )}

      {recState === 'error' && (
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {recError}
          </div>
          <button
            onClick={onFetchRecommendations}
            className="text-sm text-violet-600 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {recState === 'done' && availablePacks.length > 0 && (
        <>
          {addError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {addError}
            </div>
          )}

          {recommended.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Applicable to this project
              </p>
              <div className="space-y-3">
                {recommended.map(rec => {
                  const pack = packs.find(p => p.id === rec.packId)
                  const isAdded = addedPackIds.has(rec.packId)
                  const isAdding = addingPackId === rec.packId
                  if (!pack || isAdded) return null
                  return (
                    <div
                      key={rec.packId}
                      className="border border-violet-200 bg-violet-50 rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {rec.packName}
                            </span>
                            <span className="text-xs font-mono text-violet-500 bg-white px-1.5 py-0.5 rounded border border-violet-200">
                              v{pack.version}
                            </span>
                            <span className="text-xs font-medium text-violet-600 bg-violet-100 px-2 py-0.5 rounded-full">
                              Recommended
                            </span>
                          </div>
                          <p className="text-xs text-violet-800 leading-relaxed">
                            {rec.reason}
                          </p>
                        </div>
                        <button
                          onClick={() => onAddPack(rec.packId)}
                          disabled={!!addingPackId}
                          className="shrink-0 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                        >
                          {isAdding ? 'Adding…' : 'Add Framework'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {notRecommended.length > 0 &&
            notRecommended.some(
              r =>
                !addedPackIds.has(r.packId) &&
                packs.find(p => p.id === r.packId)
            ) && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-2">
                  Not applicable to this project
                </p>
                <div className="space-y-2">
                  {notRecommended.map(rec => {
                    const pack = packs.find(p => p.id === rec.packId)
                    const isAdded = addedPackIds.has(rec.packId)
                    const isAdding = addingPackId === rec.packId
                    if (!pack || isAdded) return null
                    return (
                      <div
                        key={rec.packId}
                        className="border border-gray-200 rounded-xl p-4 bg-gray-50/50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-medium text-gray-700">
                                {rec.packName}
                              </span>
                              <span className="text-xs font-mono text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                v{pack.version}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                              {rec.reason}
                            </p>
                          </div>
                          <button
                            onClick={() => onAddPack(rec.packId)}
                            disabled={!!addingPackId}
                            className="shrink-0 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                          >
                            {isAdding ? 'Adding…' : 'Add Anyway'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          <div className="pt-2 border-t border-gray-100 flex justify-end">
            <button
              onClick={onResetRecommendations}
              className="text-xs text-violet-500 hover:text-violet-700 hover:underline"
            >
              Re-analyze frameworks
            </button>
          </div>
        </>
      )}
    </>
  )
}

// ── Generate Tab Component ───────────────────────────────────────────────────

interface GenerateTabProps {
  genStep: GenerateStep
  surveyDescription: string
  showTips: boolean
  isGenFormValid: boolean
  genResult: GenerateResult | null
  genError: string | null
  copied: boolean
  onSurveyDescriptionChange: (value: string) => void
  onShowTipsToggle: () => void
  onGenerate: () => Promise<void>
  onClose: () => void
  onCopyLink: () => Promise<void>
}

function GenerateTab({
  genStep,
  surveyDescription,
  showTips,
  isGenFormValid,
  genResult,
  genError,
  copied,
  onSurveyDescriptionChange,
  onShowTipsToggle,
  onGenerate,
  onClose,
  onCopyLink,
}: GenerateTabProps) {
  if (genStep === 'done' && genResult) {
    return (
      <div className="space-y-5">
        <div className="text-center py-2">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🎉</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">AI Survey Generated!</h3>
          <p className="text-sm text-gray-500">Your survey is organized into sections, uses diverse question types, and is ready for respondents.</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">{genResult.surveyTitle}</p>
            <p className="text-xs text-gray-500 mt-1">All features available: rich text formatting, section descriptions, selection limits for checkboxes, skip logic, and more.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-white rounded p-2 border border-blue-100">
              <div className="font-semibold text-blue-700">{genResult.categoryCount}</div>
              <div className="text-gray-500">Sections</div>
            </div>
            <div className="bg-white rounded p-2 border border-blue-100">
              <div className="font-semibold text-blue-700">{genResult.questionCount}</div>
              <div className="text-gray-500">Questions</div>
            </div>
            <div className="bg-white rounded p-2 border border-blue-100">
              <div className="font-semibold text-green-700">✓</div>
              <div className="text-gray-500">Published</div>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
            Public Shareable Link
          </label>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}${genResult.shareLink}`}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 focus:outline-none"
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <button
              onClick={onCopyLink}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                copied
                  ? 'bg-green-100 text-green-700 border border-green-200'
                  : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Done
          </button>
          <a
            href={genResult.shareLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors text-center flex items-center justify-center gap-2"
          >
            <span>📤</span> Share
          </a>
        </div>
      </div>
    )
  }

  if (genStep === 'error') {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          <p className="font-medium mb-1">Generation Failed</p>
          <p>{genError}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="border border-amber-200 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={onShowTipsToggle}
          className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
        >
          <span className="flex items-center gap-2">💡 Prompting Tips for Better Surveys</span>
          <span className="text-amber-600 text-xs">{showTips ? '▲ Hide' : '▼ Show'}</span>
        </button>
        {showTips && (
          <div className="px-4 py-4 bg-white text-xs text-gray-600 space-y-3 border-t border-amber-100">
            <div>
              <p className="font-semibold text-gray-800 mb-0.5">1. Sections (Categories)</p>
              <p>
                Ask for <em>"2-5 thematic sections"</em> to organize questions logically (like Google Forms) — e.g. <em>"Divide into: Product Experience, Feature Usage, and Feedback."</em>
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-0.5">2. Question Diversity</p>
              <p>
                Specify the mix — e.g. <em>"60% rating scales, 25% multiple choice, 15% open-ended"</em> — to create engaging, multi-format surveys.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-0.5">3. Target Audience & Context</p>
              <p>
                Describe who'll respond — e.g. <em>"Tech-savvy professionals aged 25–45"</em> — so questions are relevant and appropriately phrased.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-0.5">4. Duration & Length</p>
              <p>
                Specify completion time — e.g. <em>"3–5 minutes max"</em> — and mention preference for brevity or depth.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-0.5">5. Tone & Constraints</p>
              <p>
                Define style and guardrails — e.g. <em>"Friendly, conversational, avoid jargon, no personal data."</em>
              </p>
            </div>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="survey-description" className="block text-sm font-semibold text-gray-800 mb-1.5">
          Survey Description <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Describe your project, target audience, desired sections, preferred question types, tone, and goals. The AI will create a Google Forms-style survey with organized sections and diverse question types.
        </p>
        <textarea
          id="survey-description"
          name="surveyDescription"
          rows={8}
          value={surveyDescription}
          onChange={e => onSurveyDescriptionChange(e.target.value)}
          disabled={genStep === 'generating'}
          placeholder={`e.g. Create a customer experience survey for a mobile banking app targeting 18-35 year old professionals. Organize into 3 sections: App Usability, Feature Preferences, and Overall Satisfaction. Use 50% rating scales, 35% multiple choice, and 15% open-ended questions. Keep it conversational, 4-5 minutes max, and avoid asking for personal information. Goal: identify the top 3 pain points and feature requests.`}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none disabled:bg-gray-50 disabled:text-gray-400"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{surveyDescription.length} chars</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          disabled={genStep === 'generating'}
          className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onGenerate}
          disabled={!isGenFormValid || genStep === 'generating'}
          className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2"
        >
          {genStep === 'generating' ? (
            <>
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
              Generating Survey…
            </>
          ) : (
            <>
              <span>✨</span> Generate Survey
            </>
          )}
        </button>
      </div>

      {genStep === 'generating' && (
        <p className="text-center text-sm text-gray-500 animate-pulse">
          AI is crafting your survey — this usually takes 5–15 seconds…
        </p>
      )}
    </>
  )
}

// ── Custom Survey Tab Component ────────────────────────────────────────────

interface CustomSurveyTabProps {
  customSurveyTitle: string
  customSurveyDescription: RichTextContent | undefined
  customSections: SurveyCategory[]
  expandedQuestionId: string | null
  expandedSectionId: string | null
  customError: string | null
  customSaving: boolean
  customSuccess: boolean
  invalidQuestionIds: Set<string>
  invalidSectionIds: Set<string>
  crossDragState: CrossSectionDragState | null
  onCrossDragStart: (state: CrossSectionDragState) => void
  onCrossDragEnd: () => void
  onCrossDrop: (targetSectionId: string, targetIndex: number) => void
  isDraggingSection: boolean
  sectionDropIndicator: SectionDropIndicator | null
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: RichTextContent) => void
  onAddQuestion: (sectionId: string, type: QuestionType) => void
  onRemoveQuestion: (id: string) => void
  onDuplicateQuestion: (id: string) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onUpdateQuestion: (id: string, updates: Partial<Question>) => void
  onExpandQuestion: (id: string | null) => void
  onChangeQuestionType: (sectionId: string, questionId: string, newType: string) => void
  onAddOption: (questionId: string, label?: string) => void
  onRemoveOption: (questionId: string, optionId: string) => void
  onUpdateOption: (questionId: string, optionId: string, updates: Partial<QuestionOption>) => void
  onMoveOptionUp: (questionId: string, optionIndex: number) => void
  onMoveOptionDown: (questionId: string, optionIndex: number) => void
  onAddSection: () => void
  onRemoveSection: (id: string) => void
  onUpdateSection: (id: string, updates: Partial<SurveyCategory>) => void
  onMoveSectionUp: (index: number) => void
  onMoveSectionDown: (index: number) => void
  onExpandSection: (id: string) => void
  onSave: () => Promise<void>
  onClose: () => void
  onSectionDragStart: (e: React.DragEvent, index: number) => void
  onSectionDragEnd: () => void
  onSectionCardDragOver: (e: React.DragEvent, targetSectionId: string, targetIndex: number) => void
  onSectionCardDragLeave: (e: React.DragEvent, targetSectionId: string) => void
  onSectionCardDrop: (e: React.DragEvent, targetIndex: number) => void
  sectionCardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>
}

function CustomSurveyTab({
  customSurveyTitle,
  customSurveyDescription,
  customSections,
  expandedQuestionId,
  expandedSectionId,
  customError,
  customSaving,
  customSuccess,
  invalidQuestionIds,
  invalidSectionIds,
  crossDragState,
  onCrossDragStart,
  onCrossDragEnd,
  onCrossDrop,
  isDraggingSection,
  sectionDropIndicator,
  onTitleChange,
  onDescriptionChange,
  onAddQuestion,
  onRemoveQuestion,
  onDuplicateQuestion,
  onMoveUp,
  onMoveDown,
  onUpdateQuestion,
  onExpandQuestion,
  onChangeQuestionType,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
  onMoveOptionUp,
  onMoveOptionDown,
  onAddSection,
  onRemoveSection,
  onUpdateSection,
  onMoveSectionUp,
  onMoveSectionDown,
  onExpandSection,
  onSave,
  onClose,
  onSectionDragStart,
  onSectionDragEnd,
  onSectionCardDragOver,
  onSectionCardDragLeave,
  onSectionCardDrop,
  sectionCardRefs,
}: CustomSurveyTabProps) {
  // Render rich text with formatting
  const renderRichText = (content: string | RichTextContent | undefined) => {
    if (!content) return null
    
    const text = typeof content === 'string' ? content : content?.text || ''
    const marks = typeof content === 'object' && content.marks ? content.marks : []
    
    if (!marks || marks.length === 0) {
      return text
    }

    // Sort marks by start position
    const sortedMarks = [...marks].sort((a, b) => a.start - b.start)
    const segments: Array<{ text: string; marks: any[] }> = []
    let lastEnd = 0

    sortedMarks.forEach(mark => {
      if (mark.start > lastEnd) {
        segments.push({ text: text.substring(lastEnd, mark.start), marks: [] })
      }

      const markText = text.substring(mark.start, mark.end)
      const existingSegment = segments.find(s => s.text === markText && s.marks.some(m => m.type === mark.type))
      if (!existingSegment) {
        segments.push({ text: markText, marks: [mark] })
      }
      lastEnd = mark.end
    })

    if (lastEnd < text.length) {
      segments.push({ text: text.substring(lastEnd), marks: [] })
    }

    return (
      <span>
        {segments.map((seg, idx) => {
          let element: React.ReactNode = seg.text
          
          seg.marks.forEach(mark => {
            if (mark.type === 'bold') {
              element = <strong key={`${idx}-bold`}>{element}</strong>
            } else if (mark.type === 'italic') {
              element = <em key={`${idx}-italic`}>{element}</em>
            } else if (mark.type === 'underline') {
              element = <u key={`${idx}-underline`}>{element}</u>
            } else if (mark.type === 'strikethrough') {
              element = <s key={`${idx}-strikethrough`}>{element}</s>
            } else if (mark.type === 'link' && mark.url) {
              element = <a key={`${idx}-link`} href={mark.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{element}</a>
            }
          })
          
          return <span key={idx}>{element}</span>
        })}
      </span>
    )
  }

  if (customSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">✓</span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">Survey Created!</h3>
        <p className="text-sm text-gray-500">Your custom survey has been created successfully.</p>
      </div>
    )
  }

  return (
    <>
      <div>
        <label htmlFor="custom-survey-title" className="block text-sm font-semibold text-gray-800 mb-2">
          Survey Title <span className="text-red-400">*</span>
        </label>
        <input
          id="custom-survey-title"
          name="customSurveyTitle"
          type="text"
          value={customSurveyTitle}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="e.g., Customer Satisfaction Survey"
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
        />
      </div>

      {/* Survey Description - Rich Text */}
      <div>
        <label htmlFor="custom-survey-description" className="block text-sm font-semibold text-gray-800 mb-2">
          Form Description <span className="text-gray-400">(Optional)</span>
        </label>
        <RichTextEditor
          id="custom-survey-description"
          name="customSurveyDescription"
          value={customSurveyDescription}
          onChange={onDescriptionChange}
          placeholder="Add context, instructions, or help text for respondents..."
          rows={3}
        />
      </div>

      {/* Sections Management */}
      {customSections.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Sections ({customSections.length})
          </p>
          {customSections.map((section, index) => (
            <div
              key={section.id}
              ref={el => {
                if (el) sectionCardRefs.current.set(section.id, el)
                else sectionCardRefs.current.delete(section.id)
              }}
              draggable={false}
              onDragStart={e => onSectionDragStart(e, index)}
              onDragEnd={onSectionDragEnd}
              onDragOver={e => onSectionCardDragOver(e, section.id, index)}
              onDragLeave={e => onSectionCardDragLeave(e, section.id)}
              onDrop={e => onSectionCardDrop(e, index)}
            >
              <SectionEditor
                section={{
                  ...section,
                  order: index + 1,
                }}
                allSections={customSections}
                isExpanded={expandedSectionId === section.id}
                onExpand={() => onExpandSection(section.id)}
                onUpdate={(updates) => onUpdateSection(section.id, updates)}
                onRemove={() => onRemoveSection(section.id)}
                onMoveUp={() => onMoveSectionUp(index)}
                onMoveDown={() => onMoveSectionDown(index)}
                canMoveUp={index > 0}
                canMoveDown={index < customSections.length - 1}
                onAddQuestion={(sectionId, type) => onAddQuestion(sectionId, type as QuestionType)}
                onRemoveQuestion={(sectionId, qId) => onRemoveQuestion(qId)}
                onUpdateQuestion={(sectionId, qId, updates) => onUpdateQuestion(qId, updates)}
                onAddOption={onAddOption}
                onRemoveOption={onRemoveOption}
                onUpdateOption={onUpdateOption}
                onMoveOptionUp={onMoveOptionUp}
                onMoveOptionDown={onMoveOptionDown}
                expandedQuestionId={expandedQuestionId}
                onExpandQuestion={onExpandQuestion}
                onChangeQuestionType={onChangeQuestionType}
                invalidQuestionIds={invalidQuestionIds}
                invalidSectionIds={invalidSectionIds}
                crossDragState={crossDragState}
                onCrossDragStart={onCrossDragStart}
                onCrossDragEnd={onCrossDragEnd}
                onCrossDrop={onCrossDrop}
                sectionDropIndicator={sectionDropIndicator}
                isSectionDragging={isDraggingSection}
              />
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onAddSection}
        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mb-4"
      >
        + Add Section
      </button>

      {/* Live Preview */}
      {(customSurveyTitle || customSurveyDescription) && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Preview</p>
          {customSurveyTitle && (
            <div>
              <p className="text-sm font-semibold text-gray-900">{customSurveyTitle}</p>
            </div>
          )}
          {customSurveyDescription && (
            <div className="text-xs text-gray-700 whitespace-pre-wrap">
              {typeof customSurveyDescription === 'string'
                ? customSurveyDescription
                : renderRichText(customSurveyDescription)}
            </div>
          )}
        </div>
      )}

      {customError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 whitespace-pre-wrap">
          {customError}
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button
          onClick={onClose}
          disabled={customSaving}
          className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!customSurveyTitle.trim() || (customSections.reduce((sum, s) => sum + (s.questions?.length || 0), 0) === 0) || customSaving}
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2"
        >
          {customSaving ? (
            <>
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
              Creating…
            </>
          ) : (
            <>💾 Create ({customSections.reduce((sum, s) => sum + (s.questions?.length || 0), 0)} questions)</>
          )}
        </button>
      </div>
    </>
  )
}

// ── Question Block Component ───────────────────────────────────────────────

interface QuestionBlockProps {
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

function QuestionBlock({
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
}: QuestionBlockProps) {
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
      {/* Header / Collapse Toggle */}
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
        <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <>
          <div className="border-t border-violet-200 px-4 py-4 space-y-4">
            {/* Question Prompt with Rich Text */}
            <div>
              <label htmlFor={`q-prompt-${question.id}`} className="block text-xs font-semibold text-gray-700 mb-1.5">
                Question <span className="text-red-400">*</span>
              </label>
              <RichTextEditor
                id={`q-prompt-${question.id}`}
                name={`question-prompt-${question.id}`}
                value={question.prompt}
                onChange={(richText) => onUpdate({ prompt: richText })}
                placeholder="Enter your question here..."
                rows={2}
              />
            </div>

            {/* Question Description with Rich Text */}
            {false && (
              <div>
                <label htmlFor={`q-desc-${question.id}`} className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Description (Optional)
                </label>
                <RichTextEditor
                  id={`q-desc-${question.id}`}
                  name={`question-description-${question.id}`}
                  value={question.description}
                  onChange={(richText) => onUpdate({ description: richText })}
                  placeholder="Add help text or context for this question..."
                  rows={2}
                />
              </div>
            )}

            {/* Required Checkbox */}
            <div className="flex items-center gap-2">
              <input
                id={`q-required-${question.id}`}
                name={`qRequired_${question.id}`}
                type="checkbox"
                checked={question.required}
                onChange={e => onUpdate({ required: e.target.checked })}
                className="w-4 h-4 accent-violet-600 rounded"
              />
              <label htmlFor={`q-required-${question.id}`} className="text-sm text-gray-700 cursor-pointer">
                This question is required
              </label>
            </div>

            {/* Skip Logic */}
            <SkipLogicEditor
              question={question}
              allQuestions={allQuestions}
              allSections={allSections}
              skipLogic={question.skipLogic ? question.skipLogic[0] : null}
              onUpdate={(skipLogic) => onUpdate({ skipLogic: skipLogic ? [skipLogic] : undefined })}
            />

            {/* Options for Selection Questions */}
            {isSelectionQuestion && (
              <div className="space-y-2 pt-2 border-t border-violet-100">
                <p className="text-xs font-semibold text-gray-700">Options</p>
                {(question.options || []).map((option, optIdx) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 shrink-0">{optIdx + 1}.</span>
                    <input
                      id={`opt-${question.id}-${option.id}`}
                      name={`opt_${question.id}_${option.id}`}
                      type="text"
                      value={option.label}
                      onChange={e => onUpdateOption(option.id, { label: e.target.value })}
                      placeholder={`Option ${optIdx + 1}`}
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <div className="flex gap-1">
                      {optIdx > 0 && (
                        <button
                          onClick={() => onMoveOptionUp(optIdx)}
                          className="p-1 text-gray-400 hover:text-gray-600 text-xs"
                          title="Move up"
                        >
                          ▲
                        </button>
                      )}
                      {optIdx < (question.options || []).length - 1 && (
                        <button
                          onClick={() => onMoveOptionDown(optIdx)}
                          className="p-1 text-gray-400 hover:text-gray-600 text-xs"
                          title="Move down"
                        >
                          ▼
                        </button>
                      )}
                      {(question.options || []).length > 2 && (
                        <button
                          onClick={() => onRemoveOption(option.id)}
                          className="p-1 text-red-500 hover:text-red-700 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => onAddOption()}
                  className="text-xs text-violet-600 hover:text-violet-700 font-medium mt-2"
                >
                  + Add Option
                </button>
              </div>
            )}

            {/* Scale Configuration */}
            {isScaleQuestion && (
              <div className="space-y-3 pt-2 border-t border-violet-100">
                <p className="text-xs font-semibold text-gray-700">Scale Configuration</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`scale-min-${question.id}`} className="block text-xs text-gray-600 mb-1">
                      Min Value
                    </label>
                    <input
                      id={`scale-min-${question.id}`}
                      name={`scaleMin_${question.id}`}
                      type="number"
                      min="1"
                      value={question.scaleMin || 1}
                      onChange={e => onUpdate({ scaleMin: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label htmlFor={`scale-max-${question.id}`} className="block text-xs text-gray-600 mb-1">
                      Max Value
                    </label>
                    <input
                      id={`scale-max-${question.id}`}
                      name={`scaleMax_${question.id}`}
                      type="number"
                      min="2"
                      max="10"
                      value={question.scaleMax || 5}
                      onChange={e => onUpdate({ scaleMax: parseInt(e.target.value) || 5 })}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`scale-min-label-${question.id}`} className="block text-xs text-gray-600 mb-1">
                      Min Label
                    </label>
                    <input
                      id={`scale-min-label-${question.id}`}
                      name={`scaleMinLabel_${question.id}`}
                      type="text"
                      value={question.minLabel || ''}
                      onChange={e => onUpdate({ minLabel: e.target.value })}
                      placeholder="e.g., Strongly Disagree"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label htmlFor={`scale-max-label-${question.id}`} className="block text-xs text-gray-600 mb-1">
                      Max Label
                    </label>
                    <input
                      id={`scale-max-label-${question.id}`}
                      name={`scaleMaxLabel_${question.id}`}
                      type="text"
                      value={question.maxLabel || ''}
                      onChange={e => onUpdate({ maxLabel: e.target.value })}
                      placeholder="e.g., Strongly Agree"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="border-t border-violet-200 px-4 py-3 flex items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {index > 0 && (
                <button
                  onClick={onMoveUp}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
                  title="Move up"
                >
                  ▲
                </button>
              )}
              {index < totalQuestions - 1 && (
                <button
                  onClick={onMoveDown}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded transition-colors"
                  title="Move down"
                >
                  ▼
                </button>
              )}
              <button
                onClick={onDuplicate}
                className="px-2.5 py-1.5 text-xs text-gray-600 hover:text-gray-900 hover:bg-white rounded transition-colors font-medium"
                title="Duplicate this question"
              >
                📋 Duplicate
              </button>
            </div>
            <button
              onClick={onRemove}
              className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors font-medium"
            >
              🗑️ Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
