'use client'

import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface Option { id: string; label: string; value_key: string; order: number }
interface Question {
  id: string; type: string; prompt: string; required: boolean; order: number; options: Option[]
  scaleMin?: number; scaleMax?: number; minLabel?: string; maxLabel?: string
}
interface RichTextContent { text: string; marks?: any[] }
interface Category { id: string; name: string; order: number; questions: Question[]; description?: string | RichTextContent }
interface Snapshot { packName: string; version: string; categories: Category[]; ai_generated?: boolean; description?: string | null }

export default function SurveyFlow({
  surveyId,
  tokenId,
  snapshot,
  isAiSurvey,
}: {
  surveyId: string
  tokenId: string
  snapshot: Snapshot
  isAiSurvey?: boolean
}) {
  // Flatten all questions in order
  const allQuestions: (Question & { categoryName: string })[] = snapshot.categories
    .sort((a, b) => a.order - b.order)
    .flatMap(cat =>
      cat.questions.sort((a, b) => a.order - b.order).map(q => ({ ...q, categoryName: cat.name }))
    )

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [startTime] = useState(Date.now())

  // Validation function for checking if a question is answered
  const isAnswered = (q: Question) => {
    if (!q.required) return true
    const answer = answers[q.id]
    if (!answer || answer.trim() === '') return false
    
    // Enforce selection limits for checkboxes
    if (q.type === 'checkbox' || q.type === 'checkboxes') {
      const limit = (q as any).selectionLimit?.type
      const count = (q as any).selectionLimit?.count
      const selected = answer?.split(',').filter(Boolean).length ?? 0
      if (limit === 'min' && count && selected < count) return false
      if (limit === 'exact' && count && selected !== count) return false
    }
    return true
  }

  // Get current section and all its questions
  const sortedCategories = snapshot.categories.sort((a, b) => a.order - b.order)
  const currentSection = sortedCategories[currentSectionIndex]
  const currentSectionQuestions = currentSection?.questions.sort((a, b) => a.order - b.order) || []
  const totalQuestions = allQuestions.length
  const questionsInCurrentSection = currentSectionQuestions.length
  const answeredInSection = currentSectionQuestions.filter(q => isAnswered(q)).length
  const progress = ((currentSectionIndex) / sortedCategories.length) * 100

  // Render rich text content with formatting
  const renderRichText = (content: string | RichTextContent | undefined | null) => {
    if (!content) return null
    
    const text = typeof content === 'string' ? content : content?.text
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
              element = <a key={`${idx}-link`} href={mark.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-700">{element}</a>
            }
          })
          
          return <span key={idx}>{element}</span>
        })}
      </span>
    )
  }

  // Get text from description (handles RichTextContent)
  const getDescriptionText = (desc?: string | RichTextContent | null) => {
    if (!desc) return ''
    if (typeof desc === 'string') return desc
    if (desc && typeof desc === 'object' && 'text' in desc) return desc.text
    return ''
  }

  // Neutral section colors that cycle through - more visible shades
  const sectionColors = [
    'bg-slate-100',   // Slate gray
    'bg-amber-100',   // Warm sand
    'bg-stone-100',   // Taupe/stone
    'bg-cyan-100',    // Cool blue-gray
  ]
  const currentSectionColor = sectionColors[currentSectionIndex % sectionColors.length]

  // Check if all required questions in current section are answered
  const canAdvanceSection = currentSectionQuestions.every(q => isAnswered(q))

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleNext = () => {
    if (currentSectionIndex < sortedCategories.length - 1) {
      setCurrentSectionIndex(i => i + 1)
      window.scrollTo(0, 0)
    }
  }

  const handleBack = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(i => i - 1)
      window.scrollTo(0, 0)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    const completionTime = Math.round((Date.now() - startTime) / 1000)
    const aiSurvey = isAiSurvey || snapshot.ai_generated || (snapshot as any).custom_survey

    const endpoint = aiSurvey
      ? '/api/assessments/submit-ai-response'
      : '/api/assessments/submit-response'

    // For AI/custom surveys include prompt text + free_text support; for standard use valueKey only
    const textTypes = ['text', 'textarea', 'long_text', 'short_text', 'email', 'url', 'number']
    const answerRows = allQuestions
      .filter(q => answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id].trim() !== '')
      .map(q => {
        if (aiSurvey) {
          const isTextType = textTypes.includes(q.type)
          return {
            questionId: q.id,
            questionPrompt: q.prompt,
            valueKey: !isTextType ? answers[q.id] : undefined,
            freeText: isTextType ? answers[q.id] : undefined,
          }
        }
        return { questionId: q.id, valueKey: answers[q.id] }
      })

    const res = await fetch(endpoint, {
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
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">{snapshot.packName}</p>
              <p className="text-xs text-gray-400">Section {currentSectionIndex + 1} of {sortedCategories.length}</p>
            </div>
            <p className="text-xs text-gray-400 whitespace-nowrap">{Math.round(progress)}% complete</p>
          </div>
          
          {/* Form description - shown on first section */}
          {currentSectionIndex === 0 && snapshot.description && (
            <div className="mb-3 p-2 sm:p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
              {renderRichText(snapshot.description)}
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="max-w-3xl mx-auto mt-3">
          <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Questions Section */}
      <div className="flex-1 flex items-start justify-center px-3 sm:px-6 py-6 sm:py-10 w-full overflow-x-hidden">
        <div className="w-full max-w-3xl">
          {currentSection && (
            <div className="space-y-4 sm:space-y-6">
              {/* Section Header */}
              <div className={`${sectionColors[currentSectionIndex % sectionColors.length]} rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 md:p-8`}>
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 bg-gray-200 px-2 py-1 rounded inline-block w-fit">
                  {currentSection.name}
                </p>
                
                {/* Section description */}
                {currentSection.description && (
                  <div className="mb-4 p-3 sm:p-4 bg-gray-100 border border-gray-300 rounded-lg text-xs sm:text-sm text-gray-800 whitespace-pre-wrap font-medium overflow-x-auto">
                    {renderRichText(currentSection.description)}
                  </div>
                )}
                
                <p className="text-xs text-gray-500">
                  {questionsInCurrentSection} question{questionsInCurrentSection !== 1 ? 's' : ''}
                </p>
              </div>

              {/* All questions in section */}
              {currentSectionQuestions.map((question, qIndex) => (
                <div key={question.id} className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 md:p-8">
                  {/* Question number and prompt */}
                  <div className="flex gap-3 sm:gap-4">
                    <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold">
                      {qIndex + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug mb-4 sm:mb-5 break-words">
                        {question.prompt}
                        {question.required && <span className="text-red-400 ml-1">*</span>}
                      </h3>

                      {/* Render question type */}
                      {(question.type === 'single_select' || question.type === 'radio' || question.type === 'multiple_choice') && (
                        <div className="space-y-3">
                          {question.options.sort((a, b) => a.order - b.order).map(opt => {
                            const isOther = opt.value_key === '__other__'
                            const isSelected = isOther
                              ? answers[question.id]?.startsWith('__other__:')
                              : answers[question.id] === opt.value_key

                            return (
                              <div key={opt.value_key} style={{ padding: 'max(8px, 2vw) 0' }}>
                                {isOther ? (
                                  <Button
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="w-full flex flex-wrap items-center gap-1 px-3 py-2 rounded-lg h-auto text-xs border text-left"
                                    style={{ minHeight: '2.5rem' }}
                                    onClick={() => {
                                      if (!isSelected) handleAnswer(question.id, '__other__:')
                                    }}
                                  >
                                    <span className="font-medium whitespace-nowrap">Other:</span>
                                    <input
                                      type="text"
                                      value={answers[question.id]?.startsWith('__other__:') ? answers[question.id].replace('__other__:', '') : ''}
                                      onFocus={() => {
                                        if (!isSelected) handleAnswer(question.id, '__other__:')
                                      }}
                                      onChange={e => {
                                        e.stopPropagation()
                                        handleAnswer(question.id, `__other__:${e.target.value}`)
                                      }}
                                      onClick={e => e.stopPropagation()}
                                      placeholder="Please specify..."
                                      className={`flex-1 min-w-[80px] text-xs focus:outline-none bg-transparent ${isSelected ? 'text-white placeholder:text-white/60' : 'text-gray-700 placeholder:text-gray-400'}`}
                                    />
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => handleAnswer(question.id, opt.value_key)}
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="w-full justify-start px-3 py-2 rounded-lg text-xs transition-all border h-auto whitespace-normal text-left"
                                    style={{ minHeight: '2.5rem' }}
                                  >
                                    {opt.label}
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Checkboxes */}
                      {(question.type === 'checkbox' || question.type === 'checkboxes') && (
                        <div className="space-y-3">
                          {question.options.sort((a, b) => a.order - b.order).map(opt => {
                            const currentAnswers = answers[question.id]?.split(',').filter(Boolean) || []
                            const isOther = opt.value_key === '__other__'
                            const isSelected = isOther
                              ? currentAnswers.some(a => a.startsWith('__other__:'))
                              : currentAnswers.includes(opt.value_key)
                            const limit = (question as any).selectionLimit?.type
                            const count = (question as any).selectionLimit?.count
                            const maxReached = (limit === 'max' || limit === 'exact') && count && currentAnswers.length >= count

                            return (
                              <div key={opt.value_key} style={{ padding: 'max(8px, 2vw) 0' }}>
                                {isOther ? (
                                  <Button
                                    variant={isSelected ? 'default' : 'outline'}
                                    disabled={!isSelected && !!maxReached}
                                    className="w-full flex flex-wrap items-center gap-1 px-3 py-2 rounded-lg h-auto text-xs border text-left"
                                    style={{ minHeight: '2.5rem' }}
                                    onClick={() => {
                                      if (!isSelected && maxReached) return
                                      if (!isSelected) {
                                        const without = currentAnswers.filter(a => !a.startsWith('__other__:'))
                                        handleAnswer(question.id, [...without, '__other__:'].join(','))
                                      } else if (isSelected) {
                                        const without = currentAnswers.filter(a => !a.startsWith('__other__:'))
                                        handleAnswer(question.id, without.join(','))
                                      }
                                    }}
                                  >
                                    <span className="font-medium whitespace-nowrap">Other:</span>
                                    <input
                                      type="text"
                                      value={currentAnswers.find(a => a.startsWith('__other__:'))?.replace('__other__:', '') ?? ''}
                                      onFocus={() => {
                                        if (!isSelected && maxReached) return
                                        if (!isSelected) {
                                          const without = currentAnswers.filter(a => !a.startsWith('__other__:'))
                                          handleAnswer(question.id, [...without, '__other__:'].join(','))
                                        }
                                      }}
                                      onChange={e => {
                                        e.stopPropagation()
                                        const without = currentAnswers.filter(a => !a.startsWith('__other__:'))
                                        handleAnswer(question.id, [...without, `__other__:${e.target.value}`].join(','))
                                      }}
                                      onClick={e => e.stopPropagation()}
                                      placeholder="Please specify..."
                                      className={`flex-1 min-w-[80px] text-xs focus:outline-none bg-transparent ${isSelected ? 'text-white placeholder:text-white/60' : 'text-gray-700 placeholder:text-gray-400'}`}
                                    />
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => {
                                      if (!isSelected && maxReached) return
                                      const newAnswers = isSelected
                                        ? currentAnswers.filter(a => a !== opt.value_key)
                                        : [...currentAnswers, opt.value_key]
                                      handleAnswer(question.id, newAnswers.join(','))
                                    }}
                                    disabled={!isSelected && !!maxReached}
                                    variant={isSelected ? 'default' : 'outline'}
                                    className="w-full justify-start px-3 py-2 rounded-lg text-xs transition-all border h-auto whitespace-normal text-left"
                                    style={{ minHeight: '2.5rem' }}
                                  >
                                    {opt.label}
                                  </Button>
                                )}
                              </div>
                            )
                          })}
                          {(() => {
                            const limit = (question as any).selectionLimit?.type
                            const count = (question as any).selectionLimit?.count
                            if (!limit || limit === 'unlimited' || !count) return null
                            const currentAnswers = answers[question.id]?.split(',').filter(Boolean) || []
                            const messages = {
                              max: `Select up to ${count} option(s)`,
                              min: `Select at least ${count} option(s) — ${currentAnswers.length} selected`,
                              exact: `Select exactly ${count} option(s) — ${currentAnswers.length} selected`,
                            }
                            return <p className="text-xs text-gray-400 mt-1">{messages[limit as 'max'|'min'|'exact']}</p>
                          })()}
                        </div>
                      )}

                      {/* Dropdown */}
                      {question.type === 'dropdown' && (
                        <select
                          value={answers[question.id] ?? ''}
                          onChange={e => handleAnswer(question.id, e.target.value)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Select an option...</option>
                          {question.options.sort((a, b) => a.order - b.order).map(opt => (
                            <option key={opt.value_key} value={opt.value_key}>{opt.label}</option>
                          ))}
                        </select>
                      )}

                      {/* Linear Scale */}
                      {(question.type === 'scale' || question.type === 'linear_scale') && (() => {
                        let min = 1, max = 5, leftLabel = 'Low', rightLabel = 'High', isPercentage = false
                        if (question.scaleMin !== undefined) { min = question.scaleMin; max = question.scaleMax || 5; leftLabel = question.minLabel || 'Low'; rightLabel = question.maxLabel || 'High' }
                        const scaleValues = Array.from({ length: max - min + 1 }, (_, i) => min + i)
                        let gridClass = scaleValues.length <= 5 ? 'grid-cols-5' : 'grid-cols-6 sm:grid-cols-11'
                        return (
                          <div>
                            <div className={`grid ${gridClass} gap-1 sm:gap-2`}>
                              {scaleValues.map(num => (
                                <Button
                                  key={num}
                                  onClick={() => handleAnswer(question.id, num.toString())}
                                  variant={answers[question.id] === num.toString() ? 'default' : 'outline'}
                                  className="aspect-square flex items-center justify-center rounded-lg text-xs sm:text-sm font-semibold p-1 sm:p-2"
                                >
                                  {num}
                                </Button>
                              ))}
                            </div>
                            <div className="flex justify-between mt-2 px-1">
                              <span className="text-xs text-gray-500">{leftLabel}</span>
                              <span className="text-xs text-gray-500">{rightLabel}</span>
                            </div>
                          </div>
                        )
                      })()}

                      {/* Text inputs */}
                      {(question.type === 'text' || question.type === 'textarea' || question.type === 'long_text') && (
                        <textarea rows={4} value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)} placeholder="Type your answer…" className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                      )}
                      {question.type === 'short_text' && (
                        <input type="text" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)} placeholder="Type your answer…" className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'email' && (
                        <input type="email" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)} placeholder="email@example.com" className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'url' && (
                        <input type="url" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)} placeholder="https://example.com" className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'date' && (
                        <input type="date" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)} className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'time' && (
                        <input type="time" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)} className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'number' && (
                        <input type="number" value={answers[question.id] ?? ''} onChange={e => handleAnswer(question.id, e.target.value)} placeholder="Enter a number…" className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      )}
                      {question.type === 'yes_no' && (
                        <div className="space-y-3">
                          {['Yes', 'No'].map(opt => (
                            <div key={opt.toLowerCase()} style={{ padding: 'max(8px, 2vw) 0' }}>
                              <Button onClick={() => handleAnswer(question.id, opt.toLowerCase())} variant={answers[question.id] === opt.toLowerCase() ? 'default' : 'outline'} className="w-full justify-start px-3 py-2 rounded-lg text-xs border h-auto text-left" style={{ minHeight: '2.5rem' }}>
                                {opt}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl ">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="bg-white border-t border-gray-200 px-3 sm:px-6 py-4 mt-6 rounded-2xl sm:rounded-3xl shadow-md">
            <div className="max-w-3xl mx-auto flex gap-2 sm:gap-3">
              {currentSectionIndex > 0 && (
                <Button variant={'outline'} onClick={handleBack} className="text-xs sm:text-sm">
                  ← Back
                </Button>
              )}
              {currentSectionIndex < sortedCategories.length - 1 ? (
                <Button onClick={handleNext} disabled={!canAdvanceSection} className="flex-1 text-xs sm:text-sm">
                  Next Section →
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting || !canAdvanceSection} className="flex-1 text-xs sm:text-sm">
                  {submitting ? 'Submitting…' : 'Submit Response'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}
