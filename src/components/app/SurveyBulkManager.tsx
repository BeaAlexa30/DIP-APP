'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SurveyCard from './SurveyDisplayWidget'
import { useCan } from './UserProfileProvider'

interface SurveyToken {
  id: string
  token: string
  expires_at: string | null
  max_responses: number | null
  response_count: number
}

interface Survey {
  id: string
  status: string
  pack_id: string
  pack_version_snapshot: any
  survey_tokens: SurveyToken[]
}

interface ScoreRun {
  id: string
  executed_at: string
  checksum: string
  response_count: number
}

interface SurveyItem {
  survey: Survey
  responseCount: number
  latestScoreRun: ScoreRun | null
}

interface BulkProgress {
  action: string
  done: number
  total: number
}

interface Props {
  surveysWithData: SurveyItem[]
  projectId: string
  projectArchived: boolean
}

export default function SurveyBulkManager({ surveysWithData, projectId, projectArchived }: Props) {
  const router = useRouter()
  const canManage = useCan('manageSurvey')
  const canRunScoring = useCan('runScoring')
  const isAdmin = canManage || canRunScoring

  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<BulkProgress | null>(null)

  const selectedCount = selectedIds.size
  const allSelected = surveysWithData.length > 0 && selectedIds.size === surveysWithData.length

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(surveysWithData.map(s => s.survey.id)))
    }
  }

  function exitSelectionMode() {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }

  async function bulkClose() {
    const ids = Array.from(selectedIds)
    setProgress({ action: 'Closing', done: 0, total: ids.length })
    let done = 0
    for (const id of ids) {
      await fetch(`/api/assessments/${id}/state-management`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      done++
      setProgress({ action: 'Closing', done, total: ids.length })
    }
    setProgress(null)
    setSelectedIds(new Set())
    router.refresh()
  }

  async function bulkReopen() {
    const ids = Array.from(selectedIds)
    setProgress({ action: 'Re-opening', done: 0, total: ids.length })
    let done = 0
    for (const id of ids) {
      await fetch(`/api/assessments/${id}/state-management`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })
      done++
      setProgress({ action: 'Re-opening', done, total: ids.length })
    }
    setProgress(null)
    setSelectedIds(new Set())
    router.refresh()
  }

  async function bulkRecompute() {
    const items = surveysWithData.filter(s => selectedIds.has(s.survey.id))
    setProgress({ action: 'Scoring', done: 0, total: items.length })
    let done = 0
    for (const { survey } of items) {
      const frameworkVersion = survey.pack_version_snapshot?.version || 'v1.0'
      await fetch('/api/analytics/execute-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId: survey.id, frameworkVersion }),
      })
      done++
      setProgress({ action: 'Scoring', done, total: items.length })
    }
    setProgress(null)
    setSelectedIds(new Set())
    router.refresh()
  }

  const isBusy = progress !== null

  return (
    <div className="relative">
      {/* Selection Toolbar Header */}
      {isAdmin && (
        <div className="flex items-center justify-between mb-3">
          {!selectionMode ? (
            <button
              onClick={() => setSelectionMode(true)}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 bg-white px-3 py-1.5 rounded-lg transition-colors"
            >
              ☑ Select Surveys
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                disabled={isBusy}
                className="text-xs font-medium text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-400 bg-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {allSelected ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-xs text-gray-500">
                {selectedCount} selected
              </span>
              <button
                onClick={exitSelectionMode}
                disabled={isBusy}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕ Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Survey Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {surveysWithData.map(({ survey, responseCount, latestScoreRun }) => (
          <SurveyCard
            key={survey.id}
            survey={survey as any}
            projectId={projectId}
            responseCount={responseCount}
            latestScoreRun={latestScoreRun}
            projectArchived={projectArchived}
            selected={selectionMode ? selectedIds.has(survey.id) : undefined}
            onToggleSelect={selectionMode ? () => toggleSelect(survey.id) : undefined}
          />
        ))}
      </div>

      {/* Sticky Bulk Action Bar — appears when ≥1 selected */}
      {selectionMode && selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-white border border-gray-200 shadow-xl rounded-2xl px-5 py-3 backdrop-blur-sm">
          {isBusy ? (
            <span className="text-sm text-gray-700 font-medium">
              {progress!.action} {progress!.done}/{progress!.total}…
            </span>
          ) : (
            <>
              <span className="text-xs text-gray-500 font-medium">{selectedCount} selected</span>

              {canManage && (
                <>
                  <button
                    onClick={bulkClose}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gray-700 hover:bg-gray-900 px-4 py-2 rounded-lg transition-colors"
                  >
                    🔒 Close ({selectedCount})
                  </button>
                  <button
                    onClick={bulkReopen}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-800 px-4 py-2 rounded-lg transition-colors"
                  >
                    🔓 Re-open ({selectedCount})
                  </button>
                </>
              )}

              {canRunScoring && (
                <button
                  onClick={bulkRecompute}
                  className="flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-800 px-4 py-2 rounded-lg transition-colors"
                >
                  ⚡ Recompute Scoring ({selectedCount})
                </button>
              )}

              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-1"
              >
                ✕
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
