'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCan } from '@/components/app/UserProfileProvider'

export default function GenerateInsightsButton({ scoreRunId }: { scoreRunId: string }) {
  const router = useRouter()
  const canGenerate = useCan('generateInsights')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    console.log('[Insights] scoreRunId:', scoreRunId)

    try {
      const res = await fetch('/api/intelligence/create-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreRunId }),
      })

      const text = await res.text()
      console.log('[Insights] status:', res.status, 'body:', text)

      let json: any = {}
      try { json = JSON.parse(text) } catch { /* non-json */ }

      if (!res.ok) {
        setError(`Error ${res.status}: ${json.error ?? text}`)
        setLoading(false)
        return
      }

      setSuccess(true)
      setLoading(false)
      router.refresh()
    } catch (e: any) {
      console.error('[Insights] fetch error:', e)
      setError(`Request failed: ${e.message}`)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-w-xs">
          {error}
        </div>
      )}
      {success && (
        <p className="text-xs text-green-600">✓ Generated! Refreshing…</p>
      )}
      <button
        onClick={handleGenerate}
        disabled={loading || !canGenerate}
        title={!canGenerate ? 'Only Admins can generate insights' : undefined}
        className="text-sm bg-purple-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {!canGenerate ? '🔒 Insights (Admin only)' : loading ? 'Generating…' : '✦ Generate AI Insights'}
      </button>
      {scoreRunId && (
        <p className="text-xs text-purple-300 font-mono">run: {scoreRunId.slice(0, 8)}…</p>
      )}
    </div>
  )
}
