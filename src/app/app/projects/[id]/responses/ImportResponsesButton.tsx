'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

interface Props {
  surveyId: string
}

// ── CSV parser (RFC 4180 compliant) ─────────────────────────────────────────
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuote = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuote) {
      if (ch === '"' && next === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuote = false
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuote = true
      } else if (ch === ',') {
        row.push(field)
        field = ''
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++ // skip \n of \r\n
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else if (ch === '\r') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else {
        field += ch
      }
    }
  }

  // Last field / row
  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function csvToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return []
  const headers = rows[0].map(h => h.trim())
  return rows.slice(1)
    .filter(row => row.some(cell => cell.trim() !== ''))
    .map(row => {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => {
        if (h) obj[h] = row[i]?.trim() ?? ''
      })
      return obj
    })
}

// ── SpreadsheetML XML parser (our exported .xls format) ─────────────────────
function parseSpreadsheetML(xmlText: string): Record<string, string>[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')
  const tableRows = Array.from(doc.querySelectorAll('Row'))
  if (tableRows.length < 2) return []

  const getCells = (row: Element) =>
    Array.from(row.querySelectorAll('Cell')).map(c => c.querySelector('Data')?.textContent ?? '')

  const headers = getCells(tableRows[0]).map(h => h.trim())
  return tableRows.slice(1)
    .map(row => getCells(row))
    .filter(cells => cells.some(c => c.trim() !== ''))
    .map(cells => {
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { if (h) obj[h] = cells[i]?.trim() ?? '' })
      return obj
    })
}

export default function ImportResponsesButton({ surveyId }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<'idle' | 'preview' | 'importing' | 'done' | 'error'>('idle')
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])
  const [headers, setHeaders]= useState<string[]>([])
  const [importCount, setImportCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  function reset() {
    setStage('idle')
    setParsedRows([])
    setHeaders([])
    setImportCount(0)
    setErrorMsg(null)
    setShowModal(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const name = file.name.toLowerCase()

    let rows: Record<string, string>[] = []

    if (name.endsWith('.csv')) {
      const text = await file.text()
      const parsed = parseCsv(text)
      rows = csvToObjects(parsed)
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      // Use SheetJS to parse Excel files
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })
      rows = jsonRows.map(row => {
        const cleaned: Record<string, string> = {}
        for (const [k, v] of Object.entries(row)) {
          cleaned[String(k).trim()] = String(v ?? '').trim()
        }
        return cleaned
      })
    } else if (name.endsWith('.xml')) {
      const text = await file.text()
      if (text.includes('<Workbook') || text.includes('<Table>')) {
        rows = parseSpreadsheetML(text)
      } else {
        setErrorMsg('Unsupported XML format.')
        setStage('error')
        setShowModal(true)
        return
      }
    } else {
      setErrorMsg('Unsupported file type. Please upload a .csv or .xlsx file.')
      setStage('error')
      setShowModal(true)
      return
    }

    if (rows.length === 0) {
      setErrorMsg('No valid rows found in the file. Make sure the file has a header row and at least one data row.')
      setStage('error')
      setShowModal(true)
      return
    }

    setParsedRows(rows)
    setHeaders(Object.keys(rows[0]))
    setStage('preview')
    setShowModal(true)
  }

  async function handleImport() {
    setStage('importing')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/assessments/import-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId, rows: parsedRows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setImportCount(data.count)
      setStage('done')
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err.message)
      setStage('error')
    }
  }

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xls,.xlsx,.xml"
        className="hidden"
        onChange={handleFile}
      />

      {/* Trigger button */}
      <button
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        Import Responses
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={reset} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl z-10 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Import Responses</h2>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Error state */}
              {stage === 'error' && (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                    {errorMsg}
                  </div>
                  <button
                    onClick={reset}
                    className="w-full border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </>
              )}

              {/* Preview state */}
              {stage === 'preview' && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <p className="text-sm font-semibold text-green-800">File parsed successfully</p>
                    <p className="text-sm text-green-700 mt-0.5">
                      <span className="font-medium">{parsedRows.length}</span> row{parsedRows.length !== 1 ? 's' : ''} detected ·{' '}
                      <span className="font-medium">{headers.length}</span> column{headers.length !== 1 ? 's' : ''} found
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2">Columns detected:</p>
                    <div className="bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                      {headers.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          {h}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 leading-relaxed">
                    <p className="font-semibold mb-1">Note on column matching</p>
                    <p>Each column header is stored as a question label. For best results, use a file exported from this platform — the column headers will match exactly. Files from Google Forms or other platforms will also work; any column header becomes a question in the response view.</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={reset}
                      className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImport}
                      className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      Import {parsedRows.length} Response{parsedRows.length !== 1 ? 's' : ''}
                    </button>
                  </div>
                </>
              )}

              {/* Importing state */}
              {stage === 'importing' && (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mb-3" />
                  <p className="text-sm font-medium text-gray-700">Importing responses…</p>
                  <p className="text-xs text-gray-400 mt-1">Please wait</p>
                </div>
              )}

              {/* Done state */}
              {stage === 'done' && (
                <>
                  <div className="text-center py-6">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-lg font-bold text-gray-900">Import Complete</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {importCount} response{importCount !== 1 ? 's' : ''} imported successfully
                    </p>
                  </div>
                  <button
                    onClick={reset}
                    className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
