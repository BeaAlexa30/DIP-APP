'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCan } from './UserProfileProvider'

interface Props {
  surveyId: string
  currentStatus: 'draft' | 'published' | 'closed'
  projectArchived?: boolean
}

export default function SurveyStatusControl({ surveyId, currentStatus, projectArchived = false }: Props) {
  const router = useRouter()
  const canManage = useCan('manageSurvey')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!canManage) return null

  const isClosed = currentStatus === 'closed'
  const newStatus = isClosed ? 'published' : 'closed'
  const buttonText = isClosed ? 'Reopen Survey' : 'Close Survey'
  const actionText = isClosed ? 'reopen' : 'close'

  async function handleToggle() {
    if (!confirm(`Are you sure you want to ${actionText} this survey?`)) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/assessments/${surveyId}/state-management`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update survey status')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleToggle}
        disabled={loading || (isClosed && projectArchived)}
        title={isClosed && projectArchived ? 'Reopen the project first to re-open this survey' : undefined}
        className={`w-full text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50 ${
          isClosed && projectArchived
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isClosed
            ? 'bg-green-100 text-green-700 hover:bg-green-200'
            : 'bg-red-100 text-red-700 hover:bg-red-200'
        }`}
      >
        {loading ? (isClosed ? 'Reopening...' : 'Closing...') : buttonText}
      </button>

      {isClosed && projectArchived && (
        <p className="text-xs text-gray-400 text-center">
          🔒 Project is archived — reopen the project to re-enable surveys
        </p>
      )}

      {isClosed && !projectArchived && (
        <span className="text-xs text-gray-500">Survey is closed</span>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
