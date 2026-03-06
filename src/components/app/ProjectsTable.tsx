'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
}

const surveyStatusColors: Record<string, string> = {
  draft: 'bg-yellow-50 text-yellow-600',
  published: 'bg-green-50 text-green-600',
  closed: 'bg-gray-50 text-gray-600',
}

type SortKey = 'client_name' | 'industry' | 'status' | 'survey_status' | 'survey_count' | 'created_at'
type SortDir = 'asc' | 'desc'

interface Project {
  id: string
  client_name: string
  industry: string | null
  goal: string | null
  status: string
  created_at: string
  survey_status: string | null
  survey_count: number
}

interface Column {
  key: string
  label: string
}

const ALL_COLUMNS: Column[] = [
  { key: 'client_name', label: 'Client' },
  { key: 'industry', label: 'Industry' },
  { key: 'goal', label: 'Goal' },
  { key: 'status', label: 'Status' },
  { key: 'survey_status', label: 'Survey' },
  { key: 'survey_count', label: 'Framework Survey' },
  { key: 'created_at', label: 'Created' },
]

interface Props {
  projects: Project[]
  isAdmin?: boolean
}

export default function ProjectsTable({ projects, isAdmin }: Props) {
  const router = useRouter()

  // Local rows state so we can remove deleted projects without a full page refresh
  const [rows, setRows] = useState<Project[]>(projects)
  useEffect(() => { setRows(projects) }, [projects])

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError(null)
    const res = await fetch(`/api/projects/${deleteTarget.id}`, { method: 'DELETE' })
    if (res.ok) {
      setRows(prev => prev.filter(p => p.id !== deleteTarget.id))
      setDeleteTarget(null)
      setDeleteConfirmInput('')
    } else {
      const json = await res.json()
      setDeleteError(json.error ?? 'Failed to delete project.')
    }
    setDeleteLoading(false)
  }

  // Search
  const [search, setSearch] = useState('')

  // Filters
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSurveyStatus, setFilterSurveyStatus] = useState('')
  const [filterIndustry, setFilterIndustry] = useState('')

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Column visibility (for print)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.map((c) => c.key))
  )
  const [showColumnPicker, setShowColumnPicker] = useState(false)

  const printRef = useRef<HTMLDivElement>(null)

  // Unique filter options
  const uniqueStatuses = useMemo(() => Array.from(new Set(projects.map((p) => p.status))).sort(), [projects])
  const uniqueSurveyStatuses = useMemo(
    () => Array.from(new Set(projects.map((p) => p.survey_status).filter(Boolean) as string[])).sort(),
    [projects]
  )
  const uniqueIndustries = useMemo(
    () => Array.from(new Set(projects.map((p) => p.industry).filter(Boolean) as string[])).sort(),
    [projects]
  )

  // Filter + search + sort
  const processed = useMemo(() => {
    let result = [...rows]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.client_name.toLowerCase().includes(q) ||
          (p.industry ?? '').toLowerCase().includes(q) ||
          (p.goal ?? '').toLowerCase().includes(q)
      )
    }

    // Filters
    if (filterStatus) result = result.filter((p) => p.status === filterStatus)
    if (filterSurveyStatus) result = result.filter((p) => p.survey_status === filterSurveyStatus)
    if (filterIndustry) result = result.filter((p) => p.industry === filterIndustry)

    // Sort
    result.sort((a, b) => {
      let av: string | number = a[sortKey] ?? ''
      let bv: string | number = b[sortKey] ?? ''
      if (sortKey === 'survey_count') {
        av = a.survey_count
        bv = b.survey_count
      } else if (sortKey === 'created_at') {
        av = new Date(a.created_at).getTime()
        bv = new Date(b.created_at).getTime()
      } else {
        av = String(av).toLowerCase()
        bv = String(bv).toLowerCase()
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [rows, search, filterStatus, filterSurveyStatus, filterIndustry, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function toggleColumn(key: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key) // keep at least one
      } else {
        next.add(key)
      }
      return next
    })
  }

  function handlePrint() {
    window.print()
  }

  function SortIcon({ colKey }: { colKey: SortKey }) {
    if (sortKey !== colKey)
      return <span className="ml-1 text-gray-300 select-none">↕</span>
    return (
      <span className="ml-1 text-blue-500 select-none">
        {sortDir === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  const shownColumns = ALL_COLUMNS.filter((c) => visibleColumns.has(c.key))

  const hasActiveFilters = search || filterStatus || filterSurveyStatus || filterIndustry

  return (
    <>
      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-start gap-3">
              <span className="text-2xl mt-0.5">⚠️</span>
              <div>
                <h2 className="text-base font-bold text-red-700">Delete Project</h2>
                <p className="text-xs text-red-500 mt-0.5">This action is permanent and cannot be undone.</p>
              </div>
            </div>
            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-700">
                You are about to permanently delete{' '}
                <span className="font-semibold text-gray-900">{deleteTarget.client_name}</span>.
                All surveys, responses, and score runs for this project will be deleted.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Type the project name{' '}
                  <span className="font-semibold text-gray-900">{deleteTarget.client_name}</span>{' '}to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={e => setDeleteConfirmInput(e.target.value)}
                  placeholder={deleteTarget.client_name}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
                  autoFocus
                />
              </div>
              {deleteError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {deleteError}
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button
                onClick={() => { setDeleteTarget(null); setDeleteConfirmInput(''); setDeleteError(null) }}
                disabled={deleteLoading}
                variant="outline"
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleteLoading || deleteConfirmInput !== deleteTarget.client_name}
                variant="destructive"
                className="rounded-lg"
              >
                {deleteLoading ? 'Deleting…' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 18mm 16mm 20mm 16mm;
          }
          body * { visibility: hidden !important; }
          #projects-print-area, #projects-print-area * { visibility: visible !important; }
          #projects-print-area {
            position: absolute;
            top: 0; left: 0;
            width: 100%;
            font-family: 'Segoe UI', Arial, sans-serif;
          }
          .no-print { display: none !important; }

          /* Header */
          .print-header {
            display: flex !important;
            align-items: flex-start;
            justify-content: space-between;
            padding: 0 0 14px 0;
            border-bottom: 3px solid #2563eb;
            margin-bottom: 18px;
          }
          .print-header-left h1 {
            font-size: 22px;
            font-weight: 700;
            color: #111827;
            margin: 0 0 4px 0;
            letter-spacing: -0.3px;
          }
          .print-header-left p {
            font-size: 12px;
            color: #6b7280;
            margin: 0;
          }
          .print-header-right {
            text-align: right;
            font-size: 11px;
            color: #6b7280;
            line-height: 1.6;
          }
          .print-header-right strong {
            display: block;
            font-size: 12px;
            color: #374151;
            font-weight: 600;
          }

          /* Table */
          table {
            border-collapse: collapse;
            width: 100%;
            page-break-inside: auto;
          }
          thead { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          thead tr {
            background-color: #1e40af !important;
          }
          thead th {
            background-color: #1e40af !important;
            color: #ffffff !important;
            font-size: 10.5px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 10px 14px;
            border: none;
            text-align: left;
          }
          tbody tr { page-break-inside: avoid; }
          tbody tr:nth-child(even) {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          tbody td {
            font-size: 11.5px;
            color: #374151;
            padding: 9px 14px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: middle;
          }
          tbody tr:last-child td { border-bottom: none; }

          /* Footer */
          .print-footer {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            margin-top: 18px;
            padding-top: 10px;
            border-top: 1px solid #d1d5db;
            font-size: 10px;
            color: #9ca3af;
          }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print flex flex-col gap-3 mb-4">
        {/* Row 1: search + action buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, industry, goal…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {search && (
              <Button
                onClick={() => setSearch('')}
                variant="ghost"
                size="icon-sm"
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                ✕
              </Button>
            )}
          </div>

          {/* Column picker trigger */}
          <div className="relative">
            <Button
              onClick={() => setShowColumnPicker((v) => !v)}
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Columns
            </Button>
            {showColumnPicker && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-48">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Visible Columns</p>
                {ALL_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Print Report */}
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-lg"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </Button>
        </div>

        {/* Row 2: filter dropdowns */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          <select
            value={filterSurveyStatus}
            onChange={(e) => setFilterSurveyStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Survey Statuses</option>
            {uniqueSurveyStatuses.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          <select
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Industries</option>
            {uniqueIndustries.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <Button
              onClick={() => {
                setSearch('')
                setFilterStatus('')
                setFilterSurveyStatus('')
                setFilterIndustry('')
              }}
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
            >
              Clear filters
            </Button>
          )}

          <span className="ml-auto text-xs text-gray-400">
            {processed.length} of {rows.length} project{rows.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div id="projects-print-area" ref={printRef} className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        {/* Print header */}
        <div className="print-header" style={{ display: 'none' }}>
          <div className="print-header-left">
            <h1>Projects Report</h1>
            <p>Client intake project listing — all active records</p>
          </div>
          <div className="print-header-right">
            <strong>Date Generated</strong>
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            <br />
            <strong style={{ marginTop: '4px' }}>Total Projects</strong>
            {processed.length} shown{processed.length !== projects.length ? ` of ${projects.length}` : ''}
          </div>
        </div>

        {processed.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {shownColumns.map((col) => {
                  const sortable = ['client_name', 'industry', 'status', 'survey_status', 'survey_count', 'created_at'].includes(col.key)
                  return (
                    <th
                      key={col.key}
                      onClick={sortable ? () => handleSort(col.key as SortKey) : undefined}
                      className={`text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none ${sortable ? 'cursor-pointer hover:text-gray-700' : ''} ${col.key === 'survey_count' ? 'text-center' : ''}`}
                    >
                      {col.label}
                      {sortable && <SortIcon colKey={col.key as SortKey} />}
                    </th>
                  )
                })}
                {isAdmin && (
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider no-print" />
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processed.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/app/projects/${p.id}`)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer no-print-pointer"
                >
                  {visibleColumns.has('client_name') && (
                    <td className="px-6 py-4 font-medium text-gray-900">{p.client_name}</td>
                  )}
                  {visibleColumns.has('industry') && (
                    <td className="px-6 py-4 text-gray-500">{p.industry ?? '—'}</td>
                  )}
                  {visibleColumns.has('goal') && (
                    <td className="px-6 py-4 text-gray-500 max-w-xs whitespace-pre-wrap break-words">{p.goal ?? '—'}</td>
                  )}
                  {visibleColumns.has('status') && (
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[p.status] ?? ''}`}>
                        {p.status}
                      </span>
                    </td>
                  )}
                  {visibleColumns.has('survey_status') && (
                    <td className="px-6 py-4">
                      {p.survey_status ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${surveyStatusColors[p.survey_status] ?? ''}`}>
                          {p.survey_status}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  )}
                  {visibleColumns.has('survey_count') && (
                    <td className="px-6 py-4 text-center text-gray-700 font-medium">
                      {p.survey_count > 0 ? p.survey_count : '—'}
                    </td>
                  )}
                  {visibleColumns.has('created_at') && (
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(p.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </td>
                  )}
                  {isAdmin && (
                    <td className="px-6 py-4 no-print" onClick={e => e.stopPropagation()}>
                      <Button
                        onClick={() => { setDeleteTarget(p); setDeleteConfirmInput(''); setDeleteError(null) }}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-800 border-red-200 hover:border-red-400 hover:bg-red-50 rounded-lg"
                      >
                        Delete
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center text-gray-400">
            <p className="text-base mb-2">No projects match your filters</p>
            <Button
              onClick={() => {
                setSearch('')
                setFilterStatus('')
                setFilterSurveyStatus('')
                setFilterIndustry('')
              }}
              variant="link"
              className="text-blue-600"
            >
              Clear all filters
            </Button>
          </div>
        )}

        {/* Print footer */}
        <div className="print-footer" style={{ display: 'none' }}>
          <span>DIP Application &mdash; Projects Report</span>
          <span>Printed on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>Confidential</span>
        </div>
      </div>
    </>
  )
}
