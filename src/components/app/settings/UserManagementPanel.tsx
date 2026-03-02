'use client'

import { Button } from '@/components/ui/button'
import { useCallback, useEffect, useState } from 'react'

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  status: 'pending' | 'approved' | 'rejected'
  is_active: boolean
  created_at: string
}

// Derives a single display badge from status + is_active
function statusBadge(user: User) {
  if (user.status === 'pending') return { label: 'Pending', cls: 'bg-yellow-100 text-yellow-700 border border-yellow-200' }
  if (user.status === 'rejected') return { label: 'Rejected', cls: 'bg-red-100 text-red-600 border border-red-200' }
  if (!user.is_active) return { label: 'Inactive', cls: 'bg-gray-100 text-gray-500 border border-gray-200' }
  return { label: 'Active', cls: 'bg-green-100 text-green-700 border border-green-200' }
}

/* ─── Create Account Form ─── */
function CreateAccountForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'analyst', fullName, adminCreated: true }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMsg({ type: 'error', text: json.error ?? 'Failed to create account.' })
    } else {
      setMsg({ type: 'success', text: `Account created for ${email}.` })
      setFullName(''); setEmail(''); setPassword('')
      onCreated()
    }
    setSaving(false)
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="bg-violet-600 hover:bg-violet-500 rounded-lg"
      >
        + Create Analyst Account
      </Button>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Create Analyst Account</h3>
        <Button onClick={() => { setOpen(false); setMsg(null) }} variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600">&times;</Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Jane Doe" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="analyst@company.com" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Temporary Password</label>
          <input type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Min. 8 characters" />
        </div>
        {msg && (
          <div className={`text-xs px-3 py-2 rounded-lg border ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
            {msg.text}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={saving}
            className="bg-violet-600 hover:bg-violet-500 rounded-lg">
            {saving ? 'Creating…' : 'Create Account'}
          </Button>
          <Button type="button" onClick={() => { setOpen(false); setMsg(null) }}
            variant="ghost" className="text-gray-500 hover:text-gray-700">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

/* ─── Edit Name Form (inline) ─── */
function EditNameForm({ user, onDone }: { user: User; onDone: (updated?: string) => void }) {
  const [name, setName] = useState(user.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setErr('Name is required.'); return }
    setSaving(true)
    setErr(null)
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', fullName: name.trim() }),
    })
    const json = await res.json()
    if (!res.ok) { setErr(json.error ?? 'Failed to save.'); setSaving(false) }
    else onDone(name.trim())
  }

  return (
    <form onSubmit={handleSave} className="flex items-center gap-2 min-w-0">
      <input
        type="text" value={name} onChange={e => setName(e.target.value)} autoFocus
        className="w-36 px-2 py-1 border border-violet-300 rounded-md text-xs text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-violet-500"
      />
      <Button type="submit" disabled={saving}
        size="xs"
        className="bg-violet-600 hover:bg-violet-500 rounded-md whitespace-nowrap">
        {saving ? '…' : 'Save'}
      </Button>
      <Button type="button" onClick={() => onDone()}
        variant="ghost"
        size="xs"
        className="text-gray-400 hover:text-gray-600 rounded-md whitespace-nowrap">
        Cancel
      </Button>
      {err && <span className="text-xs text-red-500">{err}</span>}
    </form>
  )
}

/* ─── Delete Confirm ─── */
function DeleteConfirm({ user, onCancel, onDeleted }: { user: User; onCancel: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const doDelete = async () => {
    setLoading(true)
    setErr(null)
    const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' })
    const json = await res.json()
    if (!res.ok) { setErr(json.error ?? 'Delete failed.'); setLoading(false) }
    else onDeleted()
  }

  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-xs text-gray-500">Delete <strong>{user.full_name ?? user.email}</strong>?</span>
      <Button onClick={doDelete} disabled={loading}
        variant="destructive"
        size="xs"
        className="rounded-md">
        {loading ? '…' : 'Confirm'}
      </Button>
      <Button onClick={onCancel}
        variant="ghost"
        size="xs"
        className="text-gray-400 hover:text-gray-600 rounded-md">
        Cancel
      </Button>
      {err && <span className="text-xs text-red-500">{err}</span>}
    </div>
  )
}

/* ─── Main Panel ─── */
export default function UserManagementPanel() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.ok) { const data = await res.json(); setUsers(data.users ?? []) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const doAction = async (userId: string, action: string, extra: Record<string, unknown> = {}) => {
    setActionLoading(userId)
    setMessage(null)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMessage({ type: 'error', text: json.error ?? 'Action failed.' })
    } else {
      const labels: Record<string, string> = {
        approve: 'User approved.',
        reject: 'User rejected.',
        setActive: 'User set to Active — they can now log in.',
        setInactive: 'User set to Inactive — login blocked.',
      }
      setMessage({ type: 'success', text: labels[action] ?? 'Done.' })
      await fetchUsers()
    }
    setActionLoading(null)
  }

  return (
    <div className="space-y-5">
      <CreateAccountForm onCreated={fetchUsers} />

      {message && (
        <div className={`text-sm px-3 py-2 rounded-lg border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-sm text-gray-400 py-8">No users found.</td>
                </tr>
              ) : users.map(user => {
                const badge = statusBadge(user)
                const isAdmin = user.role === 'admin'
                const busy = actionLoading === user.id

                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    {/* Name / Email */}
                    <td className="px-4 py-3">
                      {editingId === user.id ? (
                        <EditNameForm
                          user={user}
                          onDone={(newName) => {
                            setEditingId(null)
                            if (newName) {
                              setUsers(prev => prev.map(u => u.id === user.id ? { ...u, full_name: newName } : u))
                              setMessage({ type: 'success', text: 'Name updated.' })
                            }
                          }}
                        />
                      ) : (
                        <>
                          <p className="font-medium text-gray-800">{user.full_name ?? '—'}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </>
                      )}
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {user.role}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {deletingId === user.id ? (
                        <DeleteConfirm
                          user={user}
                          onCancel={() => setDeletingId(null)}
                          onDeleted={() => { setDeletingId(null); fetchUsers(); setMessage({ type: 'success', text: 'User deleted.' }) }}
                        />
                      ) : (
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Active / Inactive toggle for approved analysts */}
                          {!isAdmin && user.status === 'approved' && (
                            user.is_active ? (
                              <Button onClick={() => doAction(user.id, 'setInactive')} disabled={busy}
                                size="xs"
                                className="bg-orange-500 hover:bg-orange-600 rounded-lg whitespace-nowrap">
                                Set Inactive
                              </Button>
                            ) : (
                              <Button onClick={() => doAction(user.id, 'setActive')} disabled={busy}
                                size="xs"
                                className="bg-green-600 hover:bg-green-700 rounded-lg whitespace-nowrap">
                                Set Active
                              </Button>
                            )
                          )}

                          {!isAdmin && editingId !== user.id && (
                            <Button onClick={() => { setEditingId(user.id); setDeletingId(null) }}
                              variant="outline"
                              size="xs"
                              className="text-gray-500 hover:text-violet-700 hover:border-violet-300 rounded-lg whitespace-nowrap">
                              Edit
                            </Button>
                          )}

                          {/* Delete (all non-admin users) */}
                          {!isAdmin && (
                            <Button onClick={() => { setDeletingId(user.id); setEditingId(null) }}
                              variant="outline"
                              size="xs"
                              className="text-red-400 hover:text-red-600 border-red-100 hover:border-red-300 rounded-lg whitespace-nowrap">
                              Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
