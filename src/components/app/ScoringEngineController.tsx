'use client'

import { useCan } from '@/components/app/UserProfileProvider'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Props {
  surveyId: string
  frameworkVersion: string
  lastRunAt: string | null
  responseCount?: number
  previousResponseCount?: number
}

export default function ScoreRunTrigger({ surveyId, frameworkVersion, lastRunAt, responseCount, previousResponseCount }: Props) {
  const router = useRouter()
  const canRunScoring = useCan('runScoring')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formattedDate, setFormattedDate] = useState<string | null>(null)

  useEffect(() => {
    if (lastRunAt) {
      setFormattedDate(new Date(lastRunAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }))
    }
  }, [lastRunAt])

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)

    const res = await fetch('/api/analytics/execute-assessment', {
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

  // Disable recompute if no new responses since the last run
  const hasNoNewResponses =
    lastRunAt !== null &&
    responseCount !== undefined &&
    previousResponseCount !== undefined &&
    responseCount === previousResponseCount

  const isDisabled = loading || hasNoNewResponses

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

      {hasNoNewResponses && (
        <div className="mb-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
          No new responses since the last score run. Recompute is disabled until new responses are submitted.
        </div>
      )}

      <div className="text-xs text-gray-500 mb-4 space-y-1">
        <p>• Framework v{frameworkVersion}</p>
        <p>• Category scores normalized 0–100</p>
        <p>• Indexes: Trust, Usability, Conversion Risk, Experience, Loyalty</p>
        <p>• Executive Health Score computed with risk penalties</p>
        <p>• All runs checksummed for audit trail</p>
      </div>

      <Button
        onClick={handleRun}
        disabled={isDisabled}
        title={hasNoNewResponses ? 'No new responses since last run' : undefined}
        variant="secondary"
        className="w-full bg-gray-900 text-white hover:bg-gray-700 rounded-lg"
      >
        {hasNoNewResponses ? 'No new responses — up to date'
          : loading ? 'Running Scoring Engine…'
            : lastRunAt ? 'Recompute Scores'
              : 'Run Scoring Engine'
        }
      </Button>
    </div>
  )
}
