'use client'

/**
 * EditCustomSurveyDialog.tsx (Refactored)
 * ═════════════════════════════════════════════════════════════
 * Enhanced survey editing dialog with:
 *   - Real-time local state updates before persistence
 *   - Google Forms-style question block UI
 *   - Duplicate and delete per question
 *   - Full option management with drag-and-drop via arrow keys
 *   - Advanced question settings (required, scale config, etc.)
 */

import { useState } from 'react'
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
import SectionEditor from '@/components/survey/SectionEditor'
import SkipLogicEditor from '@/components/survey/SkipLogicEditor'

interface Props {
  surveyId: string
  snapshot: SurveySnapshot
}

/**
 * Parse legacy snapshot format (from AI-generated or older custom surveys)
 * and normalize to new Question interface
 */
function parseQuestionsFromSnapshot(snapshot: SurveySnapshot): Question[] {
  const allCats: SurveyCategory[] = snapshot?.categories ?? []
  const raw: any[] = allCats.flatMap((c: any) => c.questions ?? [])

  return raw.map((q: any) => {
    // Normalize legacy type names
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
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

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
    setExpandedQuestionId(null)
    setExpandedSectionId(null)
    setSaving(false)
    setError(null)
    setSuccess(false)
    setIsOpen(true)
  }

  function handleClose() {
    setIsOpen(false)
  }

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

  function addNewSection() {
    const newSection: SurveyCategory = {
      id: `sec-${Date.now()}`,
      name: `Section ${sections.length + 1}`,
      description: '',
      order: sections.length + 1,
      questions: [],
    }
    setSections(prev => [...prev, newSection])
    setExpandedSectionId(newSection.id)
  }

  function removeSection(id: string) {
    setSections(prev => prev.filter(s => s.id !== id))
    if (expandedSectionId === id) setExpandedSectionId(null)
  }

  function updateSection(id: string, updates: Partial<SurveyCategory>) {
    setSections(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    )
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

  function addNewQuestion(sectionId: string, type: QuestionType) {
    const newQuestion = createQuestion(type)

    setSections(prev =>
      prev.map(s =>
        s.id === sectionId
          ? { ...s, questions: [...(s.questions || []), newQuestion] }
          : s
      )
    )

    setExpandedQuestionId(newQuestion.id)
    setExpandedSectionId(sectionId)
  }

  function removeQuestion(id: string) {
    setSections(prev =>
      prev.map(s => ({
        ...s,
        questions: (s.questions || []).filter(q => q.id !== id)
      }))
    )
    if (expandedQuestionId === id) setExpandedQuestionId(null)
  }

  function updateQuestion(id: string, updates: Partial<Question>) {
    setSections(prev =>
      prev.map(s => ({
        ...s,
        questions: (s.questions || []).map(q => (q.id === id ? { ...q, ...updates } : q))
      }))
    )
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
        })
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
            options: (q.options || []).filter(o => o.id !== optionId).map((o, idx) => ({ ...o, order: idx + 1 })),
          }
        })
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
    setSections(prev =>
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
            return {
              ...qq,
              options: opts.map((o, idx) => ({ ...o, order: idx + 1 })),
            }
          })
        }
      })
    )
  }

  async function handleSave() {
    // Validation
    const totalQuestions = sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0)
    if (!title.trim() || totalQuestions === 0) {
      setError('Survey title and at least one question are required.')
      return
    }

    const validationErrors = sections
      .flatMap(s => s.questions || [])
      .flatMap(q => validateQuestion(q))
    if (validationErrors.length > 0) {
      setError(
        `Validation errors:\n${validationErrors.map(e => `- ${e.message}`).join('\n')}`
      )
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Build updated snapshot with sections
      const categories: SurveyCategory[] = sections.map((section, idx) => ({
        ...section,
        order: idx + 1,
        questions: (section.questions || []).map((q, qIdx) => ({
          ...q,
          order: qIdx + 1,
          options: q.options?.map((opt, optIdx) => ({
            ...opt,
            order: optIdx + 1,
          })),
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

      if (updateErr) {
        throw new Error(updateErr.message || 'Failed to save survey')
      }

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
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-6 space-y-5 flex-1 overflow-y-auto">
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

                  {/* Live Preview */}
                  {(title || description) && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Preview</p>
                      {title && (
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{title}</p>
                        </div>
                      )}
                      {description && (
                        <div className="text-xs text-gray-700 whitespace-pre-wrap">
                          {typeof description === 'string'
                            ? description
                            : renderRichText(description)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sections Management */}
                  {sections.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Sections ({sections.length})
                      </p>
                      {sections.map((section, index) => (
                        <SectionEditor
                          key={section.id}
                          section={{
                            ...section,
                            order: index + 1,
                          }}
                          allSections={sections}
                          isExpanded={expandedSectionId === section.id}
                          onExpand={() => setExpandedSectionId(section.id === expandedSectionId ? null : section.id)}
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
                          expandedQuestionId={expandedQuestionId}
                          onExpandQuestion={(id: string | null) => setExpandedQuestionId(id === expandedQuestionId ? null : id)}
                          onChangeQuestionType={changeQuestionType}
                        />
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
                      disabled={!title.trim() || sections.reduce((sum, s) => sum + (s.questions?.length || 0), 0) === 0 || saving}
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
                  <p className="text-sm text-gray-500">
                    Your changes have been saved successfully.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Question Edit Block Component ──────────────────────────────────────────

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

  const isSelectionQuestion = ['multiple_choice', 'checkboxes', 'dropdown'].includes(
    question.type
  )
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
        <span
          className={`text-gray-400 transition-transform shrink-0 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        >
          ▼
        </span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <>
          <div className="border-t border-violet-200 px-4 py-4 space-y-4">
            {/* Question Prompt with Rich Text */}
            <div>
              <label
                htmlFor={`edit-q-prompt-${question.id}`}
                className="block text-xs font-semibold text-gray-700 mb-1.5"
              >
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

            {/* Required Checkbox */}
            <div className="flex items-center gap-2">
              <input
                id={`edit-q-required-${question.id}`}
                name={`editQRequired_${question.id}`}
                type="checkbox"
                checked={question.required}
                onChange={e => onUpdate({ required: e.target.checked })}
                className="w-4 h-4 accent-violet-600 rounded"
              />
              <label
                htmlFor={`edit-q-required-${question.id}`}
                className="text-sm text-gray-700 cursor-pointer"
              >
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
                    <label
                      htmlFor={`edit-scale-min-${question.id}`}
                      className="block text-xs text-gray-600 mb-1"
                    >
                      Min Value
                    </label>
                    <input
                      id={`edit-scale-min-${question.id}`}
                      name={`editScaleMin_${question.id}`}
                      type="number"
                      min="1"
                      value={question.scaleMin || 1}
                      onChange={e =>
                        onUpdate({ scaleMin: parseInt(e.target.value) || 1 })
                      }
                      className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`edit-scale-max-${question.id}`}
                      className="block text-xs text-gray-600 mb-1"
                    >
                      Max Value
                    </label>
                    <input
                      id={`edit-scale-max-${question.id}`}
                      name={`editScaleMax_${question.id}`}
                      type="number"
                      min="2"
                      max="10"
                      value={question.scaleMax || 5}
                      onChange={e =>
                        onUpdate({ scaleMax: parseInt(e.target.value) || 5 })
                      }
                      className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor={`edit-scale-min-label-${question.id}`}
                      className="block text-xs text-gray-600 mb-1"
                    >
                      Min Label
                    </label>
                    <input
                      id={`edit-scale-min-label-${question.id}`}
                      name={`editScaleMinLabel_${question.id}`}
                      type="text"
                      value={question.minLabel || ''}
                      onChange={e => onUpdate({ minLabel: e.target.value })}
                      placeholder="e.g., Strongly Disagree"
                      className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`edit-scale-max-label-${question.id}`}
                      className="block text-xs text-gray-600 mb-1"
                    >
                      Max Label
                    </label>
                    <input
                      id={`edit-scale-max-label-${question.id}`}
                      name={`editScaleMaxLabel_${question.id}`}
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
