'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export default function ChangePasswordModal({ required }: { required: boolean }) {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const validation = useMemo(() => ({
    length:    newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number:    /[0-9]/.test(newPassword),
    special:   /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  }), [newPassword])

  const isValid = Object.values(validation).every(Boolean)
  const passwordsMatch = newPassword === confirm && confirm.length > 0

  if (!required) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) { setError('Password must meet all requirements.'); return }
    if (!passwordsMatch) { setError('Passwords do not match.'); return }

    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword }),
    })
    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Failed to update password.')
      setLoading(false)
    } else {
      // Refresh server data — modal will unmount once layout re-reads password_change_required=false
      router.refresh()
    }
  }

  const Checkbox = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
      <span className={`w-3 h-3 rounded-full text-center leading-3 text-[10px] ${ok ? 'bg-green-100' : 'bg-gray-100'}`}>
        {ok ? '✓' : '○'}
      </span>
      {label}
    </div>
  )

  return (
    /* Full-screen blocking overlay — cannot be dismissed */
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="mb-6 text-center">
          <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🔑</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Set Your Password</h2>
          <p className="text-sm text-gray-500 mt-1">
            Your account was created with a temporary password.<br />
            Please set a new password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {newPassword && (
              <div className="mt-2 space-y-0.5">
                <Checkbox ok={validation.length}    label="At least 8 characters" />
                <Checkbox ok={validation.uppercase} label="One uppercase letter" />
                <Checkbox ok={validation.lowercase} label="One lowercase letter" />
                <Checkbox ok={validation.number}    label="One number" />
                <Checkbox ok={validation.special}   label="One special character (!@#$%^&*)" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className={`w-full px-3 py-2.5 border rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                confirm && !passwordsMatch ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="••••••••"
            />
            {confirm && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
            )}
          </div>

          {error && (
            <div className="text-xs px-3 py-2 rounded-lg border bg-red-50 text-red-600 border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isValid || !passwordsMatch}
            className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving…' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
