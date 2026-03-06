'use client'

import { useState } from 'react'

interface Answer {
  id: string
  question_id: string
  option_value_key: string | null
  free_text: string | null
  framework_questions: {
    prompt: string
    category_id: string
    framework_categories: { name: string } | null
  } | null
}

interface ResponseRow {
  id: string
  submitted_at: string
  respondent_meta: any
  response_answers: Answer[]
}

interface Props {
  responses: ResponseRow[]
  optionsMap: Record<string, string>
  surveyName: string
  projectName: string
}

function formatValueKey(valueKey: string): string {
  if (!isNaN(Number(valueKey))) return valueKey
  return valueKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function getAnswerText(answer: Answer, optionsMap: Record<string, string>): string {
  const valueKey = answer.option_value_key
  const freeText = answer.free_text

  if (freeText) return freeText

  if (valueKey) {
    const lookupKey = `${answer.question_id}:${valueKey}`
    if (optionsMap[lookupKey]) return optionsMap[lookupKey]
    return formatValueKey(valueKey)
  }

  return ''
}

function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export default function ExportResponsesButton({ responses, optionsMap, surveyName, projectName }: Props) {
  const [exporting, setExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  function buildRows() {
    // Collect all unique questions across all responses
    const questionMap = new Map<string, string>() // questionId -> prompt
    for (const resp of responses) {
      for (const ans of resp.response_answers) {
        if (ans.question_id && ans.framework_questions?.prompt) {
          questionMap.set(ans.question_id, ans.framework_questions.prompt)
        }
      }
    }
    const questionIds = Array.from(questionMap.keys())
    const questionPrompts = Array.from(questionMap.values())

    // Build rows
    const rows = responses.map((resp, idx) => {
      const meta = resp.respondent_meta as any ?? {}
      const answersByQuestionId: Record<string, string> = {}
      for (const ans of resp.response_answers) {
        if (ans.question_id) {
          answersByQuestionId[ans.question_id] = getAnswerText(ans, optionsMap)
        }
      }

      return {
        'Response #': responses.length - idx,
        ...Object.fromEntries(questionIds.map((qId, i) => [questionPrompts[i], answersByQuestionId[qId] ?? '']))
      }
    })

    return rows
  }

  function exportCsv() {
    setExporting(true)
    setShowMenu(false)
    try {
      const rows = buildRows()
      if (rows.length === 0) return

      const headers = Object.keys(rows[0])
      const csvLines = [
        headers.map(escapeCsvCell).join(','),
        ...rows.map(row => Object.values(row).map(v => escapeCsvCell(String(v ?? ''))).join(','))
      ]

      const csvContent = csvLines.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName} - ${surveyName} Responses.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  function exportExcel() {
    setExporting(true)
    setShowMenu(false)
    try {
      const rows = buildRows()
      if (rows.length === 0) return

      const headers = Object.keys(rows[0])

      // Build XLSX-compatible XML (SpreadsheetML)
      const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n<Worksheet ss:Name="Responses"><Table>`

      const xmlRows = [
        // Header row
        `<Row>${headers.map(h => `<Cell><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join('')}</Row>`,
        // Data rows
        ...rows.map(row =>
          `<Row>${Object.values(row).map(v => `<Cell><Data ss:Type="String">${escapeXml(String(v ?? ''))}</Data></Cell>`).join('')}</Row>`
        )
      ]

      const xmlFooter = `</Table></Worksheet></Workbook>`
      const xmlContent = xmlHeader + xmlRows.join('') + xmlFooter

      const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName} - ${surveyName} Responses.xls`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  function escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  if (responses.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(prev => !prev)}
        disabled={exporting}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
      >
        {exporting ? (
          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
        ) : (
          <span>⬇</span>
        )}
        Export Responses
        <span className="text-green-200">▾</span>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden min-w-[180px]">
            <button
              onClick={exportCsv}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
            >
              <span className="text-lg">📄</span>
              <div>
                <p className="font-medium">Export as CSV</p>
                <p className="text-xs text-gray-400">Compatible with all apps</p>
              </div>
            </button>
            <button
              onClick={exportExcel}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left border-t border-gray-100 transition-colors"
            >
              <span className="text-lg">📊</span>
              <div>
                <p className="font-medium">Export as Excel</p>
                <p className="text-xs text-gray-400">Opens in Microsoft Excel</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
