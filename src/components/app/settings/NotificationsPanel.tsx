'use client'

import { useState, useEffect, useCallback } from 'react'

interface PendingUser {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
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

export default function NotificationsPanel() {
  const [pending, setPending] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<Record<string, boolean>>({})

  const fetchPending = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/notifications')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPending(data.pending ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPending() }, [fetchPending])

  const handleAction = async (userId: string, action: 'approve' | 'reject') => {
    setProcessing(p => ({ ...p, [userId]: true }))
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        setPending(prev => prev.filter(u => u.id !== userId))
      }
    } catch {
      // silent
    } finally {
      setProcessing(p => ({ ...p, [userId]: false }))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
        <p className="text-sm text-gray-500 mt-1">
          Review and approve analyst accounts that have self-registered.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 py-6 text-center">Loading…</div>
      ) : pending.length === 0 ? (
        <div className="border border-gray-200 rounded-xl px-6 py-10 text-center">
          <div className="text-3xl mb-3">✓</div>
          <p className="text-gray-500 text-sm font-medium">No pending approvals</p>
          <p className="text-gray-400 text-xs mt-1">All accounts have been reviewed.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-medium text-amber-800">
              {pending.length} account{pending.length !== 1 ? 's' : ''} awaiting approval
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Registered</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pending.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{user.full_name || '—'}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">
                    {formatTime(user.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        disabled={processing[user.id]}
                        onClick={() => handleAction(user.id, 'approve')}
                        className="px-2.5 py-1 text-xs font-medium bg-green-100 hover:bg-green-200 text-green-700 border border-green-200 rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        Approve
                      </button>
                      <button
                        disabled={processing[user.id]}
                        onClick={() => handleAction(user.id, 'reject')}
                        className="px-2.5 py-1 text-xs font-medium text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
