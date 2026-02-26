'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  projectId: string
  projectName: string
  currentStatus: 'draft' | 'active' | 'completed' | 'archived'
}

export default function DeleteProjectButton({ projectId, projectName, currentStatus }: Props) {
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
      <div className={isArchived ? 'bg-green-50 border border-green-200 rounded-lg p-4' : 'bg-red-50 border border-red-200 rounded-lg p-4'}>
        <p className="text-sm mb-3" style={{ color: isArchived ? '#166534' : '#991b1b' }}>
          <strong>{isArchived ? 'Reopen' : 'Archive'} "{projectName}"?</strong>
          <br />
          {isArchived 
            ? 'This will set the project status back to active.'
            : 'This will set the project status to archived. You can reopen it later.'}
        </p>
        {error && <p className="text-xs text-red-700 mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleStatusChange}
            disabled={loading}
            className={isArchived 
              ? 'px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors'
              : 'px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors'}
          >
            {loading ? `${isArchived ? 'Reopening' : 'Archiving'}...` : `Yes, ${isArchived ? 'Reopen' : 'Archive'}`}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={isArchived 
        ? 'px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors'
        : 'px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors'}
    >
      {isArchived ? '↻ Reopen Project' : 'Archive Project'}
    </button>
  )
}
