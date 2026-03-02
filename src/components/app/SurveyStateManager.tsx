'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
      <Button
        onClick={handleToggle}
        disabled={loading || (isClosed && projectArchived)}
        title={isClosed && projectArchived ? 'Reopen the project first to re-open this survey' : undefined}
        className={`w-full rounded-lg ${isClosed && projectArchived
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100'
            : isClosed
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-red-500 hover:bg-red-600'
          }`}
      >
        {loading ? (isClosed ? 'Reopening...' : 'Closing...') : buttonText}
      </Button>

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
