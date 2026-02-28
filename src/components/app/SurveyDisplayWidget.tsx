'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/DatabaseClientManager'
import SurveyStatusControl from './SurveyStateManager'
import ScoreRunTrigger from './ScoringEngineController'

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

interface SurveyCardProps {
  survey: Survey
  projectId: string
  responseCount: number
  latestScoreRun: ScoreRun | null
  projectArchived?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}

export default function SurveyCard({ survey, projectId, responseCount, latestScoreRun, projectArchived = false, selected, onToggleSelect }: SurveyCardProps) {
  const router = useRouter()
  const [tokenCopied, setTokenCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const surveyToken = survey.survey_tokens?.[0]
  const surveyUrl = surveyToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/survey/${surveyToken.token}`
    : null

  const frameworkName = survey.pack_version_snapshot?.packName ?? 'Unknown Framework'
  const frameworkVersion = survey.pack_version_snapshot?.version ?? '1.0'

  const copyLink = () => {
    if (surveyUrl) {
      navigator.clipboard.writeText(surveyUrl)
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    }
  }

  const handleGenerateLink = async () => {
    setLoading(true)
    const res = await fetch('/api/assessments/create-access-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surveyId: survey.id }),
    })
    if (res.ok) {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-shadow ${
      selected ? 'border-blue-400 shadow-md shadow-blue-100' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="relative px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
        {/* Selection Checkbox */}
        {onToggleSelect !== undefined && (
          <input
            type="checkbox"
            checked={selected ?? false}
            onChange={onToggleSelect}
            onClick={e => e.stopPropagation()}
            className="absolute top-4 left-3 w-4 h-4 accent-blue-600 cursor-pointer"
          />
        )}
        <div className={`flex items-start justify-between ${onToggleSelect !== undefined ? 'pl-5' : ''}`}>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{frameworkName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Version {frameworkVersion}
            </p>
          </div>
          <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${
            survey.status === 'published' ? 'bg-green-100 text-green-700' : 
            survey.status === 'closed' ? 'bg-gray-100 text-gray-500' : 
            'bg-yellow-100 text-yellow-700'
          }`}>
            {survey.status}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Response count */}
        <div className="bg-gray-50 rounded-lg px-5 py-4">
          <p className="text-3xl font-bold text-gray-900">{responseCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Responses submitted</p>
          {responseCount === 0 && survey.status === 'published' && (
            <p className="text-xs text-amber-600 mt-2 leading-relaxed">
              No responses yet. Copy the survey link below to start collecting responses.
            </p>
          )}
        </div>

        {/* Survey link */}
        {surveyUrl && survey.status === 'published' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Survey Link</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={surveyUrl}
                className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600 font-mono"
              />
              <button
                onClick={copyLink}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  tokenCopied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tokenCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* No token yet */}
        {!surveyUrl && survey.status === 'published' && (
          <button
            onClick={handleGenerateLink}
            disabled={loading}
            className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Generating…' : 'Generate Survey Link'}
          </button>
        )}

        {/* Latest Score Run */}
        {latestScoreRun && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-blue-900 mb-2">Latest Score Run</h4>
            <div className="text-xs space-y-1 text-blue-700">
              <p>Responses: <span className="font-medium">{latestScoreRun.response_count}</span></p>
              <p>Run: <span className="font-medium">{new Date(latestScoreRun.executed_at).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</span></p>
            </div>
            <div className="mt-3">
              <Link
                href={`/app/projects/${projectId}/responses?surveyId=${survey.id}`}
                className="block text-center border border-blue-300 bg-white text-blue-700 text-xs font-medium py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Responses ({responseCount})
              </Link>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 space-y-2">
          {/* Scoring Engine Trigger */}
          {responseCount > 0 && (
            <ScoreRunTrigger
              surveyId={survey.id}
              frameworkVersion={survey.pack_version_snapshot?.version || 'v1.0'}
              lastRunAt={latestScoreRun?.executed_at || null}
              responseCount={responseCount}
              previousResponseCount={latestScoreRun?.response_count ?? undefined}
            />
          )}

          {responseCount > 0 && !latestScoreRun && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
              ⚠️ Responses collected but no scoring run yet. Run the scoring engine to generate insights.
            </div>
          )}

          <SurveyStatusControl 
            surveyId={survey.id}
            currentStatus={survey.status as 'draft' | 'published' | 'closed'}
            projectArchived={projectArchived}
          />
        </div>
      </div>
    </div>
  )
}
