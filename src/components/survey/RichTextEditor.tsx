'use client'

/**
 * RichTextEditor.tsx
 * ═════════════════════════════════════════════════════════════
 * A simple rich text editor inspired by Google Forms
 * Supports: bold, italic, underline, links
 */

import { useState, useRef, useEffect } from 'react'
import { RichTextContent, TextMark } from '@/types/SurveyBuilder'

// Inject placeholder style once
if (typeof document !== 'undefined') {
  const styleId = 'rte-placeholder-style'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `[contenteditable][data-placeholder]:empty::before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; }`
    document.head.appendChild(style)
  }
}

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
  const savedSelection = useRef<Range | null>(null)
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

  const [, forceUpdate] = useState(0)
  const [activeMarks, setActiveMarks] = useState<Set<string>>(new Set())

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

  function handleTextChange(newHtml: string) {
    setText(newHtml)
    onChange({ text: newHtml, marks: [] })
  }

  function applyMark(type: Exclude<TextMark['type'], 'link'>) {
    const command = type === 'bold' ? 'bold' : type === 'italic' ? 'italic' : 'underline'
    if (savedSelection.current) {
      const sel = window.getSelection()
      if (sel) {
        sel.removeAllRanges()
        sel.addRange(savedSelection.current)
      }
    }
    document.execCommand(command, false)
    // Re-save selection after execCommand so it stays highlighted
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0).cloneRange()
    }
    updateActiveMarks()
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

  function updateActiveMarks() {
    const newActive = new Set<string>()
    if (document.queryCommandState('bold')) newActive.add('bold')
    if (document.queryCommandState('italic')) newActive.add('italic')
    if (document.queryCommandState('underline')) newActive.add('underline')
    setActiveMarks(newActive)
  }

  function isMarkActive(type: TextMark['type']): boolean {
    return activeMarks.has(type)
  }

<<<<<<< HEAD
    const [isFocused, setIsFocused] = useState(false)

   return (
=======
  // Helper: render text with formatting applied for preview
  function renderPreview(): React.ReactNode {
    if (!text) return <em className="text-gray-400">(empty)</em>
    
    // Sort marks by start position
    const sortedMarks = [...marks].sort((a, b) => a.start - b.start)
    const segments: Array<{ text: string; marks: TextMark[] }> = []
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

  return (
>>>>>>> e05c6d9f7e1230c700f65601ed1a7e12beb6f486
    <div className="space-y-2">
      {/* Textarea */}
      <div className="relative">
        <div
          className={`w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 min-h-[${rows * 2}rem] bg-white ${className}`}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onInput={e => {
            const el = e.currentTarget
            handleTextChange(el.innerHTML)
          }}
          onSelect={() => {
            const sel = window.getSelection()
            if (sel && sel.rangeCount > 0) savedSelection.current = sel.getRangeAt(0).cloneRange()
            updateActiveMarks()
          }}
          onKeyUp={() => {
            const sel = window.getSelection()
            if (sel && sel.rangeCount > 0) savedSelection.current = sel.getRangeAt(0).cloneRange()
            updateActiveMarks()
          }}
          onMouseUp={() => {
            const sel = window.getSelection()
            if (sel && sel.rangeCount > 0) savedSelection.current = sel.getRangeAt(0).cloneRange()
            updateActiveMarks()
          }}
          style={{
            minHeight: `${rows * 1.8}rem`,
          }}
          ref={el => {
            if (el && el.innerHTML !== text && document.activeElement !== el) {
              el.innerHTML = text
            }
          }}
          onKeyDown={e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); applyMark('bold') }
            if ((e.ctrlKey || e.metaKey) && e.key === 'i') { e.preventDefault(); applyMark('italic') }
            if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); applyMark('underline') }
          }}
        />
      </div>

<<<<<<< HEAD
      {/* Toolbar - shown below input only when focused */}
      {isFocused && (
        <div className="flex flex-wrap gap-1 pl-2">
          <button
            onMouseDown={e => { e.preventDefault(); applyMark('bold') }}
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
            onMouseDown={e => { e.preventDefault(); applyMark('italic') }}
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
            onMouseDown={e => { e.preventDefault(); applyMark('underline') }}
            className={`px-3 py-1.5 text-sm underline rounded transition-colors ${
              isMarkActive('underline')
                ? 'bg-violet-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
            title="Underline (Ctrl+U)"
          >
            U
          </button>
=======
      {/* Formatting Preview */}
      {marks.length > 0 && (
        <div className="space-y-3">
          {/* Visual Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-900 mb-2">Preview:</p>
            <div className="text-sm text-gray-700 leading-relaxed">
              {renderPreview()}
            </div>
          </div>

          {/* Formatting Details */}
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
>>>>>>> e05c6d9f7e1230c700f65601ed1a7e12beb6f486
        </div>
      )}
    </div>
  )
}
