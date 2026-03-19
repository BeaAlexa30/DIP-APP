'use client'

/**
 * RichTextEditor.tsx
 * ═════════════════════════════════════════════════════════════
 * A simple rich text editor inspired by Google Forms
 * Supports: bold, italic, underline, links
 */

import { useState, useRef, useEffect } from 'react'
import { RichTextContent, TextMark } from '@/types/SurveyBuilder'

interface RichTextEditorProps {
  value: string | RichTextContent | undefined
  onChange: (value: RichTextContent) => void
  placeholder?: string
  className?: string
  rows?: number
  id?: string
  name?: string
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter text...',
  className = '',
  rows = 3,
  id,
  name,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState(
    !value
      ? ''
      : typeof value === 'string'
        ? value
        : value.text
  )
  const [marks, setMarks] = useState<TextMark[]>(
    !value || typeof value === 'string' ? [] : value.marks || []
  )

  // Sync internal state when value prop changes (e.g., when dialog opens)
  useEffect(() => {
    if (value) {
      if (typeof value === 'string') {
        setText(value)
        setMarks([])
      } else if (value.text) {
        setText(value.text)
        setMarks(value.marks || [])
      }
    } else {
      setText('')
      setMarks([])
    }
  }, [value])

  function handleTextChange(newText: string) {
    setText(newText)
    onChange({ text: newText, marks })
  }

  function applyMark(type: Exclude<TextMark['type'], 'link'>) {
    const textarea = textareaRef.current
    if (!textarea) return

    const { selectionStart, selectionEnd } = textarea
    if (selectionStart === selectionEnd) {
      return
    }

    // Remove overlapping marks of same type
    const newMarks = marks.filter(
      m => !(m.type === type && m.start < selectionEnd && m.end > selectionStart)
    )

    newMarks.push({
      type,
      start: selectionStart,
      end: selectionEnd,
    })

    setMarks(newMarks)
    onChange({ text, marks: newMarks })
  }

  function clearFormatting() {
    setMarks([])
    onChange({ text, marks: [] })
  }

  function removeMarkAtRange(type: TextMark['type'], start: number, end: number) {
    const newMarks = marks.filter(
      m => !(m.type === type && m.start === start && m.end === end)
    )
    setMarks(newMarks)
    onChange({ text, marks: newMarks })
  }

  // Helper: check if mark type is applied to selection
  function isMarkActive(type: TextMark['type']): boolean {
    const textarea = textareaRef.current
    if (!textarea) return false
    const { selectionStart, selectionEnd } = textarea
    return marks.some(
      m =>
        m.type === type &&
        m.start <= selectionStart &&
        m.end >= selectionEnd &&
        selectionStart !== selectionEnd
    )
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 rounded-lg border border-gray-200">
        <button
          onClick={() => applyMark('bold')}
          className={`px-3 py-1.5 text-sm font-bold rounded transition-colors ${
            isMarkActive('bold')
              ? 'bg-violet-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
          }`}
          title="Bold (Ctrl+B)"
        >
          B
        </button>

        <button
          onClick={() => applyMark('italic')}
          className={`px-3 py-1.5 text-sm italic rounded transition-colors ${
            isMarkActive('italic')
              ? 'bg-violet-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
          }`}
          title="Italic (Ctrl+I)"
        >
          I
        </button>

        <button
          onClick={() => applyMark('underline')}
          className={`px-3 py-1.5 text-sm underline rounded transition-colors ${
            isMarkActive('underline')
              ? 'bg-violet-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
          }`}
          title="Underline (Ctrl+U)"
        >
          U
        </button>

        <div className="border-l border-gray-300" />

        <button
          onClick={clearFormatting}
          className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 border border-gray-300 rounded transition-colors"
          title="Clear all formatting"
        >
          ✕ Clear
        </button>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          id={id}
          name={name}
          ref={textareaRef}
          value={text}
          onChange={e => handleTextChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`w-full px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none font-mono ${className}`}
        />
      </div>

      {/* Formatting Preview */}
      {marks.length > 0 && (
        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-semibold">Applied formatting:</p>
          {marks.map((mark, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-200"
            >
              <span>
                <strong className="text-gray-700">
                  {mark.type === 'link' ? '🔗' : mark.type === 'bold' ? 'B' : mark.type === 'italic' ? 'I' : 'U'}
                </strong>
                {': '}
                {text.substring(mark.start, Math.min(mark.end, mark.start + 30))}
                {mark.end - mark.start > 30 ? '...' : ''}
                {mark.type === 'link' && ` → ${mark.url}`}
              </span>
              <button
                onClick={() => removeMarkAtRange(mark.type, mark.start, mark.end)}
                className="text-red-600 hover:text-red-700 text-xs font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
