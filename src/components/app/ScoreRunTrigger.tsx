'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  surveyId: string
  frameworkVersion: string
  lastRunAt: string | null
}

export default function ScoreRunTrigger({ surveyId, frameworkVersion, lastRunAt }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formattedDate, setFormattedDate] = useState<string | null>(null)

  useEffect(() => {
    if (lastRunAt) {
      setFormattedDate(new Date(lastRunAt).toLocaleString())
    }
  }, [lastRunAt])

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await fetch('/api/scoring/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surveyId, frameworkVersion }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Scoring failed.')
      setLoading(false)
      return
    }

    setSuccess(`Score run complete. Health Score: ${json.healthScore?.toFixed(1)}/100`)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Scoring Engine</h2>
          <p className="text-xs text-gray-400 mt-0.5">Deterministic, versioned, auditable</p>
        </div>
        {formattedDate && (
          <p className="text-xs text-gray-400">
            Last run: {formattedDate}
          </p>
        )}
      </div>

      {success && (
        <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-3 rounded-lg">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500 mb-4 space-y-1">
        <p>• Framework v{frameworkVersion}</p>
        <p>• Category scores normalized 0–100</p>
        <p>• Indexes: Trust, Usability, Conversion Risk, Experience, Loyalty</p>
        <p>• Executive Health Score computed with risk penalties</p>
        <p>• All runs checksummed for audit trail</p>
      </div>

      <button
        onClick={handleRun}
        disabled={loading}
        className="w-full bg-gray-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Running Scoring Engine…' : lastRunAt ? 'Recompute Scores' : 'Run Scoring Engine'}
      </button>
    </div>
  )
}
