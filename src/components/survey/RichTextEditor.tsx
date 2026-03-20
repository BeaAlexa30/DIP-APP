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

    const [isFocused, setIsFocused] = useState(false)

   return (
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
        </div>
      )}
    </div>
  )
}
