'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/DatabaseClientManager'

type QuestionType =
  | 'short_text' | 'long_text' | 'multiple_choice' | 'checkboxes'
  | 'dropdown' | 'linear_scale' | 'yes_no' | 'email' | 'url'
  | 'date' | 'time' | 'number'

interface CustomQuestion {
  id: string
  type: QuestionType
  prompt: string
  required: boolean
  options?: string[]
  scaleMin?: number
  scaleMax?: number
  minLabel?: string
  maxLabel?: string
}

interface Props {
  surveyId: string
  snapshot: any
}

function parseQuestionsFromSnapshot(snapshot: any): CustomQuestion[] {
  const allCats: any[] = snapshot?.categories ?? []
  const raw: any[] = allCats.flatMap((c: any) => c.questions ?? [])
  return raw.map((q: any) => {
    // Normalise legacy AI types to editor types
    let type: QuestionType = q.type as QuestionType
    if ((type as string) === 'single_select') type = 'multiple_choice'
    if ((type as string) === 'scale')         type = 'linear_scale'

    const hasOptions = type === 'multiple_choice' || type === 'checkboxes' || type === 'dropdown'
    const isScale    = type === 'linear_scale'

    return {
      id: q.id ?? `q-${Math.random().toString(36).substr(2, 9)}`,
      type,
      prompt: q.prompt ?? '',
      required: q.required ?? false,
      ...(hasOptions ? {
        options: (q.options ?? []).map((o: any) =>
          typeof o === 'string' ? o : (o.label ?? '')
        ),
      } : {}),
      ...(isScale ? {
        scaleMin: q.scaleMin ?? 1,
        scaleMax: q.scaleMax ?? 5,
        minLabel: q.minLabel ?? 'Low',
        maxLabel: q.maxLabel ?? 'High',
      } : {}),
    }
  })
}

export default function EditCustomSurveyDialog({ surveyId, snapshot }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<CustomQuestion[]>([])
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleOpen() {
    setTitle(snapshot?.packName ?? '')
    setQuestions(parseQuestionsFromSnapshot(snapshot))
    setEditingQuestionId(null)
    setSaving(false)
    setError(null)
    setSuccess(false)
    setIsOpen(true)
  }

  function handleClose() {
    setIsOpen(false)
  }

  function addQuestion(type: QuestionType) {
    const newQ: CustomQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      prompt: '',
      required: false,
      ...(type === 'multiple_choice' || type === 'checkboxes' || type === 'dropdown'
        ? { options: ['Option 1', 'Option 2'] }
        : {}),
      ...(type === 'linear_scale' ? { scaleMin: 1, scaleMax: 5, minLabel: 'Low', maxLabel: 'High' } : {}),
    }
    setQuestions(prev => [...prev, newQ])
    setEditingQuestionId(newQ.id)
  }

  function removeQuestion(id: string) {
    setQuestions(prev => prev.filter(q => q.id !== id))
    if (editingQuestionId === id) setEditingQuestionId(null)
  }

  function updateQuestion(id: string, updates: Partial<CustomQuestion>) {
    setQuestions(prev => prev.map(q => (q.id === id ? { ...q, ...updates } : q)))
  }

  function moveUp(index: number) {
    if (index === 0) return
    setQuestions(prev => {
      const arr = [...prev]
      ;[arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]
      return arr
    })
  }

  function moveDown(index: number) {
    if (index === questions.length - 1) return
    setQuestions(prev => {
      const arr = [...prev]
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      return arr
    })
  }

  async function handleSave() {
    if (!title.trim() || questions.length === 0) return
    const invalid = questions.filter(q => !q.prompt.trim())
    if (invalid.length > 0) {
      setError('All questions must have a prompt text.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const newSnapshot = {
        ...snapshot,
        packName: title,
        categories: [
          {
            id: 'custom-category',
            name: 'Survey Questions',
            order: 1,
            questions: questions.map((q, idx) => ({
              id: q.id,
              type: q.type,
              prompt: q.prompt,
              required: q.required,
              order: idx + 1,
              ...(q.options
                ? {
                    options: q.options.map((opt, optIdx) => ({
                      id: `${q.id}-opt-${optIdx}`,
                      label: opt,
                      value_key: opt.toLowerCase().replace(/\s+/g, '_'),
                      order: optIdx + 1,
                    })),
                  }
                : {}),
              ...(q.type === 'linear_scale'
                ? {
                    scaleMin: q.scaleMin ?? 1,
                    scaleMax: q.scaleMax ?? 5,
                    minLabel: q.minLabel,
                    maxLabel: q.maxLabel,
                  }
                : {}),
            })),
          },
        ],
      }

      const { error: updateErr } = await (supabase as any)
        .from('surveys')
        .update({ pack_version_snapshot: newSnapshot })
        .eq('id', surveyId)

      if (updateErr) throw new Error(updateErr.message)

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
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Edit Survey Questions</h2>
                <p className="text-xs text-gray-500 mt-0.5">Changes apply to new responses immediately</p>
              </div>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                ×
              </button>
            </div>

            <div className="px-6 py-6 space-y-5 flex-1">
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
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>

                  {/* Questions */}
                  {questions.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Questions ({questions.length})
                      </p>
                      {questions.map((q, i) => (
                        <QuestionEditor
                          key={q.id}
                          question={q}
                          index={i}
                          isEditing={editingQuestionId === q.id}
                          onEdit={() => setEditingQuestionId(q.id)}
                          onUpdate={updates => updateQuestion(q.id, updates)}
                          onRemove={() => removeQuestion(q.id)}
                          onMoveUp={() => moveUp(i)}
                          onMoveDown={() => moveDown(i)}
                          canMoveUp={i > 0}
                          canMoveDown={i < questions.length - 1}
                        />
                      ))}
                    </div>
                  )}

                  {/* Add Question */}
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-600 mb-3">Add Question Type:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          ['short_text', '📝 Short Text'],
                          ['long_text', '📄 Long Text'],
                          ['multiple_choice', '⭕ Multiple Choice'],
                          ['checkboxes', '☑️ Checkboxes'],
                          ['dropdown', '🔽 Dropdown'],
                          ['linear_scale', '📊 Linear Scale'],
                          ['yes_no', '✓✗ Yes/No'],
                          ['email', '✉️ Email'],
                          ['url', '🔗 URL'],
                          ['date', '📅 Date'],
                          ['time', '🕐 Time'],
                          ['number', '🔢 Number'],
                        ] as [QuestionType, string][]
                      ).map(([type, label]) => (
                        <button
                          key={type}
                          onClick={() => addQuestion(type)}
                          className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
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
                      disabled={!title.trim() || questions.length === 0 || saving}
                      className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                          Saving…
                        </>
                      ) : (
                        `💾 Save Changes (${questions.length} question${questions.length !== 1 ? 's' : ''})`
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

// ── Question Editor ────────────────────────────────────────────────────────────
interface QuestionEditorProps {
  question: CustomQuestion
  index: number
  isEditing: boolean
  onEdit: () => void
  onUpdate: (updates: Partial<CustomQuestion>) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}

function QuestionEditor({
  question,
  index,
  isEditing,
  onEdit,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: QuestionEditorProps) {
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

  const addOption = () => {
    const current = question.options ?? []
    onUpdate({ options: [...current, `Option ${current.length + 1}`] })
  }

  const updateOption = (i: number, value: string) => {
    const opts = [...(question.options ?? [])]
    opts[i] = value
    onUpdate({ options: opts })
  }

  const removeOption = (i: number) => {
    onUpdate({ options: (question.options ?? []).filter((_, idx) => idx !== i) })
  }

  return (
    <div
      className={`border rounded-xl p-4 ${
        isEditing ? 'border-violet-300 bg-violet-50/30' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Number */}
        <div className="shrink-0 w-8 h-8 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-sm font-semibold">
          {index + 1}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-3">
          <input
            id={`q-prompt-${question.id}`}
            name={`qPrompt_${question.id}`}
            type="text"
            value={question.prompt}
            onChange={e => onUpdate({ prompt: e.target.value })}
            onFocus={onEdit}
            placeholder="Enter your question here..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
          />

          <div className="flex items-center gap-2">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              {typeLabels[question.type]}
            </span>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input
                id={`q-required-${question.id}`}
                name={`qRequired_${question.id}`}
                type="checkbox"
                checked={question.required}
                onChange={e => onUpdate({ required: e.target.checked })}
                className="w-3.5 h-3.5 accent-violet-600"
              />
              Required
            </label>
          </div>

          {/* Options */}
          {(question.type === 'multiple_choice' ||
            question.type === 'checkboxes' ||
            question.type === 'dropdown') &&
            isEditing && (
              <div className="space-y-2 pl-2 border-l-2 border-violet-200">
                <p className="text-xs font-medium text-gray-600">Options:</p>
                {(question.options ?? []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{i + 1}.</span>
                    <input
                      id={`opt-${question.id}-${i}`}
                      name={`opt_${question.id}_${i}`}
                      type="text"
                      value={opt}
                      onChange={e => updateOption(i, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm"
                    />
                    {(question.options ?? []).length > 2 && (
                      <button
                        onClick={() => removeOption(i)}
                        className="text-red-500 hover:text-red-700 text-xs px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addOption}
                  className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                >
                  + Add Option
                </button>
              </div>
            )}

          {/* Scale */}
          {question.type === 'linear_scale' && isEditing && (
            <div className="space-y-2 pl-2 border-l-2 border-violet-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`scale-min-${question.id}`} className="text-xs text-gray-600">
                    Min Value
                  </label>
                  <input
                    id={`scale-min-${question.id}`}
                    name={`scaleMin_${question.id}`}
                    type="number"
                    value={question.scaleMin ?? 1}
                    onChange={e => onUpdate({ scaleMin: parseInt(e.target.value) || 1 })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div>
                  <label htmlFor={`scale-max-${question.id}`} className="text-xs text-gray-600">
                    Max Value
                  </label>
                  <input
                    id={`scale-max-${question.id}`}
                    name={`scaleMax_${question.id}`}
                    type="number"
                    value={question.scaleMax ?? 5}
                    onChange={e => onUpdate({ scaleMax: parseInt(e.target.value) || 5 })}
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`scale-min-label-${question.id}`} className="text-xs text-gray-600">
                    Min Label
                  </label>
                  <input
                    id={`scale-min-label-${question.id}`}
                    name={`scaleMinLabel_${question.id}`}
                    type="text"
                    value={question.minLabel ?? ''}
                    onChange={e => onUpdate({ minLabel: e.target.value })}
                    placeholder="e.g., Low"
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                </div>
                <div>
                  <label htmlFor={`scale-max-label-${question.id}`} className="text-xs text-gray-600">
                    Max Label
                  </label>
                  <input
                    id={`scale-max-label-${question.id}`}
                    name={`scaleMaxLabel_${question.id}`}
                    type="text"
                    value={question.maxLabel ?? ''}
                    onChange={e => onUpdate({ maxLabel: e.target.value })}
                    placeholder="e.g., High"
                    className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Move / Remove */}
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
            title="Move down"
          >
            ↓
          </button>
          <button onClick={onRemove} className="p-1 text-red-400 hover:text-red-600" title="Remove">
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}
