'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/DatabaseClientManager'
import SurveyStatusControl from './SurveyStateManager'
import ScoreRunTrigger from './ScoringEngineController'
import EditCustomSurveyDialog from './EditCustomSurveyDialog'

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
  pack_id: string | null
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
  projectArchived: boolean
  selected?: boolean
  onToggleSelect?: () => void
}

export default function SurveyCard({ 
  survey, 
  projectId, 
  responseCount, 
  latestScoreRun, 
  projectArchived, 
  selected, 
  onToggleSelect 
}: SurveyCardProps) {
  const router = useRouter()
  const [tokenCopied, setTokenCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const surveyToken = survey.survey_tokens?.[0]
  const surveyUrl = surveyToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/survey/${surveyToken.token}`
    : null

  const frameworkName = survey.pack_version_snapshot?.packName ?? 'Unknown Framework'
  const frameworkVersion = survey.pack_version_snapshot?.version ?? '1.0'
  const responseUrl: string | null = survey.pack_version_snapshot?.response_url ?? null

  const [responseLinkCopied, setResponseLinkCopied] = useState(false)

  const copyResponseLink = () => {
    if (responseUrl) {
      navigator.clipboard.writeText(responseUrl)
      setResponseLinkCopied(true)
      setTimeout(() => setResponseLinkCopied(false), 2000)
    }
  }

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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-start justify-between w-full">
          <div className=' w-9/12'>
            <h3 className="text-sm font-semibold text-gray-900 break-words w-full">{frameworkName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Version {frameworkVersion}
            </p>
          </div>
          <span className={`text-xs font-medium px-3 py-1.5 rounded-full  ${
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

        {/* Response / Results link (imported surveys only) */}
        {responseUrl && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Response / Results Link</label>
            <div className="flex gap-2">
              <a
                href={responseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-blue-600 font-mono hover:underline truncate"
              >
                {responseUrl}
              </a>
              <button
                onClick={copyResponseLink}
                className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                  responseLinkCopied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {responseLinkCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}

        {/* Latest Score Run */}
        {latestScoreRun && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-blue-900 mb-2">Latest Score Run</h4>
            <div className="text-xs space-y-1 text-blue-700">
              <p>Responses: <span className="font-medium">{latestScoreRun.response_count}</span></p>
              <p>Run: <span className="font-medium">{new Date(latestScoreRun.executed_at).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</span></p>
            </div>
          </div>
        )}

        {/* View Responses - Available when responses exist */}
        {responseCount > 0 && (
          <div className="mt-3">
            <Link
              href={`/app/projects/${projectId}/responses?surveyId=${survey.id}`}
              className="block text-center bg-[#00B3B0] text-white text-sm font-medium py-2.5 rounded-lg hover:bg-[#009E9B] transition-colors"
            >
              View Responses ({responseCount})
            </Link>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 space-y-2">
          {/* Edit Questions — custom & AI-generated surveys (not imported external links) */}
          {(survey.pack_version_snapshot?.custom_survey === true || survey.pack_version_snapshot?.ai_generated === true) && survey.pack_version_snapshot?.imported_survey !== true && !projectArchived && (
            <EditCustomSurveyDialog
              surveyId={survey.id}
              snapshot={survey.pack_version_snapshot}
            />
          )}

          {/* Scoring Engine Trigger */}
          {responseCount > 0 && (
            <ScoreRunTrigger
              surveyId={survey.id}
              projectId={projectId}
              frameworkVersion={survey.pack_version_snapshot?.version || 'v1.0'}
              lastRunAt={latestScoreRun?.executed_at || null}
            />
          )}

          <SurveyStatusControl 
            surveyId={survey.id}
            currentStatus={survey.status as 'draft' | 'published' | 'closed'}
          />
        </div>
      </div>
    </div>
  )
}
