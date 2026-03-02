'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  projectId: string
  projectName: string
  currentStatus: 'draft' | 'active' | 'completed' | 'archived'
  surveyCount?: number
}

export default function ArchiveProjectButton({ projectId, projectName, currentStatus, surveyCount = 0 }: Props) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isArchived = currentStatus === 'archived'
  const action = isArchived ? 'reopen' : 'archive'
  const newStatus = isArchived ? 'active' : 'archived'

  async function handleStatusChange() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to ${action} project`)
      }

      router.refresh()
      setShowConfirm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  if (showConfirm) {
    return (
      <div className={`rounded-xl border p-4 ${isArchived ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <p className={`text-sm font-semibold mb-1 ${isArchived ? 'text-green-800' : 'text-amber-900'}`}>
          {isArchived ? `Reopen "${projectName}"?` : `Archive "${projectName}"?`}
        </p>

        {/* Survey impact notice */}
        <div className={`rounded-lg px-3 py-2 mb-3 text-xs ${isArchived ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
          {isArchived ? (
            <>
              <span className="font-medium">Surveys will be restored.</span>
              {' '}All surveys that were open before archiving will be re-opened and start accepting responses again.
            </>
          ) : (
            <>
              <span className="font-medium">
                {surveyCount > 0
                  ? `${surveyCount} survey${surveyCount !== 1 ? 's' : ''} will be closed.`
                  : 'All surveys will be closed.'}
              </span>
              {' '}Survey links stop accepting responses immediately. The project and all its data remain accessible to your team. You can reopen the project at any time.
            </>
          )}
        </div>

        {error && <p className="text-xs text-red-700 mb-3">{error}</p>}
        <div className="flex gap-2">
          <Button
            onClick={handleStatusChange}
            disabled={loading}
            className={`rounded-lg ${isArchived ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}
          >
            {loading
              ? (isArchived ? 'Reopening...' : 'Archiving...')
              : (isArchived ? 'Yes, Reopen Project' : 'Yes, Archive Project')}
          </Button>
          <Button
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            variant="outline"
            className="rounded-lg"
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button
      onClick={() => setShowConfirm(true)}
      className={`rounded-lg ${isArchived ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}`}
    >
      {isArchived ? '↻ Reopen Project' : '🗄 Archive Project'}
    </Button>
  )
}
