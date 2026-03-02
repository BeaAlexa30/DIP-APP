'use client'

import { useState, useEffect, useCallback } from 'react'

interface ActivityLog {
  id: string
  user_id: string | null
  user_email: string
  user_name: string | null
  action: string
  details: Record<string, unknown>
  created_at: string
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: 'Login', color: 'bg-blue-100 text-blue-700' },
  generate_insights: { label: 'AI Insights', color: 'bg-purple-100 text-purple-700' },
  generate_ai_survey: { label: 'AI Survey', color: 'bg-indigo-100 text-indigo-700' },
  create_survey: { label: 'Survey Created', color: 'bg-cyan-100 text-cyan-700' },
  create_survey_token: { label: 'Survey Link', color: 'bg-cyan-100 text-cyan-700' },
  export_pdf: { label: 'PDF Export', color: 'bg-orange-100 text-orange-700' },
  share_report: { label: 'Share Report', color: 'bg-teal-100 text-teal-700' },
  deactivate_share: { label: 'Deactivate Share', color: 'bg-gray-100 text-gray-600' },
  create_account: { label: 'Account Created', color: 'bg-green-100 text-green-700' },
  edit_user: { label: 'Edit User', color: 'bg-blue-100 text-blue-700' },
  edit_project: { label: 'Edit Project', color: 'bg-blue-100 text-blue-700' },
  archive_project: { label: 'Archive Project', color: 'bg-amber-100 text-amber-700' },
  delete_project: { label: 'Delete Project', color: 'bg-red-100 text-red-700' },
  delete_user: { label: 'Delete User', color: 'bg-red-100 text-red-700' },
  delete_framework: { label: 'Delete Framework', color: 'bg-red-100 text-red-700' },
  toggle_framework: { label: 'Toggle Framework', color: 'bg-indigo-100 text-indigo-700' },
  run_scoring: { label: 'Run Scoring', color: 'bg-yellow-100 text-yellow-700' },
  approve_user: { label: 'Approve User', color: 'bg-green-100 text-green-700' },
  reject_user: { label: 'Reject User', color: 'bg-red-100 text-red-700' },
  set_active: { label: 'Set Active', color: 'bg-green-100 text-green-700' },
  set_inactive: { label: 'Set Inactive', color: 'bg-gray-100 text-gray-600' },
  survey_status_change: { label: 'Survey Status', color: 'bg-cyan-100 text-cyan-700' },
  update_branding: { label: 'Update Branding', color: 'bg-violet-100 text-violet-700' },
  change_password: { label: 'Change Password', color: 'bg-gray-100 text-gray-600' },
}

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_LABELS[action] ?? { label: action, color: 'bg-gray-100 text-gray-600' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
      {meta.label}
    </span>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDetails(action: string, details: Record<string, unknown>): string {
  const d = details ?? {}
  switch (action) {
    case 'create_survey_token':
      return 'Generated a shareable survey link'
    case 'edit_user':
      return d.newName ? `Updated user display name to "${d.newName}"` : 'Edited a user account'
    case 'edit_project':
      return d.clientName ? `Updated project details for "${d.clientName}"` : 'Edited a project'
    case 'archive_project':
      return d.clientName ? `Archived project "${d.clientName}"` : 'Archived a project'
    case 'login':
      return 'Signed in to the platform'
    case 'generate_insights':
      return 'Generated AI insights for a scoring run'
    case 'generate_ai_survey':
      return d.surveyTitle
        ? `Created AI survey "${d.surveyTitle}"${d.categoryCount ? ` · ${d.categoryCount} categories` : ''}`
        : 'Generated a new AI survey'
    case 'create_survey':
      return 'Created a new survey'
    case 'export_pdf':
      return d.projectName ? `Exported PDF report for "${d.projectName}"` : 'Exported a PDF report'
    case 'share_report':
      return d.projectId ? 'Generated a shareable report link' : 'Shared a report'
    case 'deactivate_share':
      return 'Deactivated a shared report link'
    case 'create_account': {
      const who = d.adminCreated ? 'Admin created' : 'Self-registered'
      return `${who} a ${d.role ?? 'user'} account`
    }
    case 'delete_project':
      return 'Permanently deleted a project and all its data'
    case 'delete_user':
      return d.deletedUserEmail ? `Deleted user account: ${d.deletedUserEmail}` : 'Deleted a user account'
    case 'delete_framework':
      return d.packName ? `Deleted framework pack "${d.packName}"` : 'Deleted a framework pack'
    case 'toggle_framework':
      return d.packName
        ? `${d.active ? 'Activated' : 'Deactivated'} framework pack "${d.packName}"`
        : `${d.active ? 'Activated' : 'Deactivated'} a framework pack`
    case 'run_scoring': {
      const score = d.healthScore != null ? ` · Health score: ${d.healthScore}` : ''
      return `Ran scoring engine${score}`
    }
    case 'approve_user':
      return 'Approved a user account'
    case 'reject_user':
      return 'Rejected a user account'
    case 'set_active':
      return 'Set a user account to active'
    case 'set_inactive':
      return 'Deactivated a user account'
    case 'survey_status_change': {
      const statusMap: Record<string, string> = { published: 'Reopened', closed: 'Closed', draft: 'Moved to draft' }
      return `${statusMap[String(d.status)] ?? 'Updated'} a survey`
    }
    case 'update_branding':
      return d.company_name ? `Updated branding settings for "${d.company_name}"` : 'Updated platform branding settings'
    case 'change_password':
      return 'Changed account password'
    default:
      return '—'
  }
}

const ALL_ACTIONS = Object.keys(ACTION_LABELS)

export default function ActivityLogPanel() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filterAction, setFilterAction] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [pendingUser, setPendingUser] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ ids: string[]; message: string } | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (filterAction) params.set('action', filterAction)
      if (filterUser) params.set('user', filterUser)
      const res = await fetch(`/api/admin/activity?${params}`)
      if (!res.ok) throw new Error('Failed to fetch logs')
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
      setSelected(new Set()) // clear selection on page/filter change
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [page, filterAction, filterUser])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.max(1, Math.ceil(total / 50))

  // ── Selection helpers ──
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === logs.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(logs.map(l => l.id)))
    }
  }

  // ── Delete handler ──
  const performDelete = async (ids: string[]) => {
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/activity', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (res.ok) {
        await fetchLogs()
      }
    } catch {
      // silent
    } finally {
      setDeleting(false)
      setConfirmModal(null)
    }
  }

  const confirmDeleteOne = (log: ActivityLog) => {
    const label = ACTION_LABELS[log.action]?.label ?? log.action
    setConfirmModal({
      ids: [log.id],
      message: `Are you sure you want to permanently delete this activity log?\n\n• ${label} by ${log.user_email}\n• ${formatTime(log.created_at)}\n\nThis action cannot be undone.`,
    })
  }

  const confirmDeleteSelected = () => {
    setConfirmModal({
      ids: Array.from(selected),
      message: `Are you sure you want to permanently delete ${selected.size} selected activity log${selected.size > 1 ? 's' : ''}?\n\nThis action cannot be undone.`,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Activity Log</h2>
        <p className="text-sm text-gray-500 mt-1">Track all user actions across the platform.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(1) }}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">All Actions</option>
          {ALL_ACTIONS.map(a => (
            <option key={a} value={a}>{ACTION_LABELS[a].label}</option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Filter by email…"
            value={pendingUser}
            onChange={e => setPendingUser(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setFilterUser(pendingUser); setPage(1) } }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 w-52"
          />
          <button
            onClick={() => { setFilterUser(pendingUser); setPage(1) }}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700 bg-white hover:bg-gray-50"
          >
            Search
          </button>
          {(filterAction || filterUser) && (
            <button
              onClick={() => { setFilterAction(''); setFilterUser(''); setPendingUser(''); setPage(1) }}
              className="text-sm text-gray-500 hover:text-gray-700 px-2"
            >
              Clear
            </button>
          )}
        </div>

        <span className="ml-auto text-xs text-gray-400 self-center">{total} record{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-red-800">
            {selected.size} selected
          </span>
          <button
            onClick={confirmDeleteSelected}
            disabled={deleting}
            className="ml-auto bg-red-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting…' : `Delete ${selected.size} Selected`}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={logs.length > 0 && selected.size === logs.length}
                  onChange={toggleAll}
                  className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Details</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">Loading…</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No activity recorded yet.</td>
              </tr>
            ) : logs.map(log => (
              <tr
                key={log.id}
                className={`transition-colors ${selected.has(log.id) ? 'bg-red-50/50' : 'hover:bg-gray-50'}`}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(log.id)}
                    onChange={() => toggleOne(log.id)}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{log.user_name ?? '—'}</div>
                  <div className="text-xs text-gray-400">{log.user_email}</div>
                </td>
                <td className="px-4 py-3">
                  <ActionBadge action={log.action} />
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell max-w-xs">
                  {formatDetails(log.action, log.details)}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatTime(log.created_at)}</td>
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => confirmDeleteOne(log)}
                    disabled={deleting}
                    className="px-2.5 py-1 text-xs font-medium text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 rounded-lg whitespace-nowrap disabled:opacity-40 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-40 hover:bg-gray-50"
          >
            ← Previous
          </button>
          <span className="text-gray-500">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 disabled:opacity-40 hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Confirm Permanent Deletion</h3>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                {confirmModal.message}
              </p>
            </div>
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setConfirmModal(null)}
                disabled={deleting}
                className="text-sm font-medium text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => performDelete(confirmModal.ids)}
                disabled={deleting}
                className="text-sm font-medium text-white bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
