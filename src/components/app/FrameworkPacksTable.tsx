'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

type SortKey = 'name' | 'version' | 'status' | 'created_at'
type SortDir = 'asc' | 'desc'

interface Pack {
  id: string
  name: string
  version: string
  description: string | null
  active: boolean
  created_at: string
  isCustomSurvey?: boolean
}

interface Column {
  key: string
  label: string
}

const ALL_COLUMNS: Column[] = [
  { key: 'name',        label: 'Name' },
  { key: 'version',     label: 'Version' },
  { key: 'description', label: 'Description' },
  { key: 'status',      label: 'Status' },
  { key: 'created_at',  label: 'Created' },
]

interface Props {
  packs: Pack[]
  canManage?: boolean
}

function ExpandableDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const LIMIT = 80
  const isLong = text.length > LIMIT

  if (!isLong) return <span>{text}</span>

  return (
    <span>
      {expanded ? text : text.slice(0, LIMIT) + '…'}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }}
        className="ml-1 text-purple-500 hover:text-purple-700 text-xs underline whitespace-nowrap no-print"
      >
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </span>
  )
}

export default function FrameworkPacksTable({ packs, canManage = false }: Props) {
  const router = useRouter()
  // Optimistic active state so toggle feels instant
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(packs.map((p) => [p.id, p.active]))
  )
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [toggleError, setToggleError] = useState<string | null>(null)

  // Delete state
  const [rows, setRows] = useState<Pack[]>(packs)
  const [deleteTarget, setDeleteTarget] = useState<Pack | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/survey/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to delete')
      }
      setRows(prev => prev.filter(p => p.id !== deleteTarget.id))
      setDeleteTarget(null)
      setDeleteConfirmInput('')
    } catch (e: any) {
      setDeleteError(e.message)
    } finally {
      setDeleteLoading(false)
    }
  }
  const [search, setSearch]               = useState('')
  const [filterStatus, setFilterStatus]   = useState('')
  const [sortKey, setSortKey]             = useState<SortKey>('created_at')
  const [sortDir, setSortDir]             = useState<SortDir>('desc')
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.map((c) => c.key))
  )
  const [showColumnPicker, setShowColumnPicker] = useState(false)

  async function handleToggle(id: string) {
    const newActive = !activeMap[id]
    setActiveMap((prev) => ({ ...prev, [id]: newActive }))
    setToggling((prev) => ({ ...prev, [id]: true }))
    setToggleError(null)
    try {
      const res = await fetch(`/api/framework/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: newActive }),
      })
      const json = await res.json()
      if (!res.ok) {
        // Revert on failure
        setActiveMap((prev) => ({ ...prev, [id]: !newActive }))
        setToggleError(json.error ?? 'Failed to update status')
      } else {
        router.refresh()
      }
    } catch (e: any) {
      setActiveMap((prev) => ({ ...prev, [id]: !newActive }))
      setToggleError(e.message)
    } finally {
      setToggling((prev) => ({ ...prev, [id]: false }))
    }
  }

  // Use local rows so deletions reflect immediately
  const processed = useMemo(() => {
    let result = [...rows]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.version.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q)
      )
    }

    if (filterStatus === 'active')   result = result.filter((p) => activeMap[p.id] ?? p.active)
    if (filterStatus === 'inactive') result = result.filter((p) => !(activeMap[p.id] ?? p.active))

    result.sort((a, b) => {
      let av: string | number
      let bv: string | number
      if (sortKey === 'created_at') {
        av = new Date(a.created_at).getTime()
        bv = new Date(b.created_at).getTime()
      } else if (sortKey === 'status') {
        av = (activeMap[a.id] ?? a.active) ? 'active' : 'inactive'
        bv = (activeMap[b.id] ?? b.active) ? 'active' : 'inactive'
      } else {
        av = String(a[sortKey] ?? '').toLowerCase()
        bv = String(b[sortKey] ?? '').toLowerCase()
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [rows, search, filterStatus, sortKey, sortDir, activeMap])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function toggleColumn(key: string) {
    setVisibleColumns((prev) => {
      const next = new Set(prev)
      if (next.has(key)) { if (next.size > 1) next.delete(key) }
      else next.add(key)
      return next
    })
  }

  function SortIcon({ colKey }: { colKey: SortKey }) {
    if (sortKey !== colKey) return <span className="ml-1 text-gray-300 select-none">↕</span>
    return <span className="ml-1 text-blue-500 select-none">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const shownColumns = ALL_COLUMNS.filter((c) => visibleColumns.has(c.key))
  const hasFilters   = search || filterStatus

  return (
    <>
      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-start gap-3">
              <span className="text-2xl mt-0.5">⚠️</span>
              <div>
                <h2 className="text-base font-bold text-red-700">Delete Custom Survey</h2>
                <p className="text-xs text-red-500 mt-0.5">This action is permanent and cannot be undone.</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-700">
                You are about to permanently delete{' '}
                <span className="font-semibold text-gray-900">{deleteTarget.name}</span>.
                All responses collected for this survey will also be deleted.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Type the survey name{' '}
                  <span className="font-semibold text-gray-900">{deleteTarget.name}</span>{' '}to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmInput}
                  onChange={e => setDeleteConfirmInput(e.target.value)}
                  placeholder={deleteTarget.name}
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
                disabled={deleteLoading || deleteConfirmInput !== deleteTarget.name}
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
          #fw-print-area, #fw-print-area * { visibility: visible !important; }
          #fw-print-area {
            position: absolute;
            top: 0; left: 0;
            width: 100%;
            font-family: 'Segoe UI', Arial, sans-serif;
          }
          .no-print { display: none !important; }

          .print-header {
            display: flex !important;
            align-items: flex-start;
            justify-content: space-between;
            padding: 0 0 14px 0;
            border-bottom: 3px solid #7c3aed;
            margin-bottom: 18px;
          }
          .print-header-left h1 {
            font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 4px 0;
          }
          .print-header-left p { font-size: 12px; color: #6b7280; margin: 0; }
          .print-header-right {
            text-align: right; font-size: 11px; color: #6b7280; line-height: 1.6;
          }
          .print-header-right strong { display: block; font-size: 12px; color: #374151; font-weight: 600; }

          table { border-collapse: collapse; width: 100%; page-break-inside: auto; }
          thead { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          thead tr { background-color: #6d28d9 !important; }
          thead th {
            background-color: #6d28d9 !important; color: #ffffff !important;
            font-size: 10.5px; font-weight: 600; text-transform: uppercase;
            letter-spacing: 0.05em; padding: 10px 14px; border: none; text-align: left;
          }
          tbody tr { page-break-inside: avoid; }
          tbody tr:nth-child(even) {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          tbody td {
            font-size: 11.5px; color: #374151;
            padding: 9px 14px; border-bottom: 1px solid #e5e7eb; vertical-align: middle;
          }
          tbody tr:last-child td { border-bottom: none; }

          .print-footer {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            margin-top: 18px; padding-top: 10px;
            border-top: 1px solid #d1d5db;
            font-size: 10px; color: #9ca3af;
          }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print flex flex-col gap-3 mb-4">
        {/* Row 1: search + buttons */}
        <div className="flex items-center gap-3 flex-wrap">
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
              placeholder="Search name, version, description…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600">✕</button>
            )}
          </div>

          {/* Column picker */}
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Columns
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-3 w-44">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Visible Columns</p>
                {ALL_COLUMNS.map((col) => (
                  <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col.key)}
                      onChange={() => toggleColumn(col.key)}
                      className="rounded border-gray-300 text-purple-600"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Print */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
        </div>

        {/* Row 2: filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setFilterStatus('') }}
              className="text-sm text-red-500 hover:text-red-700 px-2 py-1 rounded transition-colors"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-gray-400">
            {processed.length} of {rows.length} pack{rows.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Toggle error banner */}
      {toggleError && (
        <div className="no-print flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          <span>⚠</span><span>{toggleError}</span>
          <button onClick={() => setToggleError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* Table */}
      <div id="fw-print-area" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Print header */}
        <div className="print-header" style={{ display: 'none' }}>
          <div className="print-header-left">
            <h1>Framework Packs Report</h1>
            <p>Versioned survey framework listing</p>
          </div>
          <div className="print-header-right">
            <strong>Date Generated</strong>
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            <br />
            <strong style={{ marginTop: '4px' }}>Total Packs</strong>
            {processed.length} shown{processed.length !== packs.length ? ` of ${packs.length}` : ''}
          </div>
        </div>

        {processed.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {shownColumns.map((col) => {
                  const sortable = ['name', 'version', 'status', 'created_at'].includes(col.key)
                  return (
                    <th
                      key={col.key}
                      onClick={sortable ? () => handleSort(col.key as SortKey) : undefined}
                      className={`text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider select-none ${sortable ? 'cursor-pointer hover:text-gray-700' : ''}`}
                    >
                      {col.label}
                      {sortable && <SortIcon colKey={col.key as SortKey} />}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processed.map((pack) => (
                <tr key={pack.id} className="hover:bg-gray-50 transition-colors">
                  {visibleColumns.has('name') && (
                    <td className="px-6 py-4 font-medium text-gray-900">{pack.name}</td>
                  )}
                  {visibleColumns.has('version') && (
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">v{pack.version}</span>
                    </td>
                  )}
                  {visibleColumns.has('description') && (
                    <td className="px-6 py-4 text-gray-500 max-w-sm">
                      {pack.description ? (
                        <ExpandableDescription text={pack.description} />
                      ) : '—'}
                    </td>
                  )}
                  {visibleColumns.has('status') && (
                    <td className="px-6 py-4">
                      {canManage ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggle(pack.id) }}
                          disabled={toggling[pack.id]}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none no-print ${
                            (activeMap[pack.id] ?? pack.active) ? 'bg-green-500' : 'bg-gray-300'
                          } disabled:opacity-50 cursor-pointer`}
                          title={(activeMap[pack.id] ?? pack.active) ? 'Click to deactivate' : 'Click to activate'}
                        >
                          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            (activeMap[pack.id] ?? pack.active) ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      ) : (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          (activeMap[pack.id] ?? pack.active) ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {(activeMap[pack.id] ?? pack.active) ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                  )}
                  {visibleColumns.has('created_at') && (
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(pack.created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </td>
                  )}
                  {canManage && pack.isCustomSurvey && (
                    <td className="px-6 py-4 no-print" onClick={e => e.stopPropagation()}>
                      <Button
                        onClick={() => { setDeleteTarget(pack); setDeleteConfirmInput(''); setDeleteError(null) }}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-800 border-red-200 hover:border-red-400 hover:bg-red-50 rounded-lg"
                      >
                        Delete
                      </Button>
                    </td>
                  )}
                  {canManage && !pack.isCustomSurvey && (
                    <td className="px-6 py-4 no-print" />
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center text-gray-400">
            <p className="text-base mb-2">No framework packs match your filters</p>
            <button
              onClick={() => { setSearch(''); setFilterStatus('') }}
              className="text-sm text-purple-600 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Print footer */}
        <div className="print-footer" style={{ display: 'none' }}>
          <span>DIP Application — Framework Packs Report</span>
          <span>Printed on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span>Confidential</span>
        </div>
      </div>
    </>
  )
}
