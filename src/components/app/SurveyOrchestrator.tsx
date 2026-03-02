'use client'

import LoadingScreen from '@/components/app/ApplicationLoadingIndicator'
import { useCan } from '@/components/app/UserProfileProvider'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/DatabaseClientManager'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import SurveyStatusControl from './SurveyStateManager'

interface Pack {
  id: string
  name: string
  version: string
  description: string | null
}

interface Survey {
  id: string
  status: string
  pack_id: string
  survey_tokens: Array<{ id: string; token: string; expires_at: string | null; max_responses: number | null; response_count: number }>
}

interface Project {
  id: string
  client_name: string
  status: string
}

export default function SurveyManager({
  project,
  packs,
  activeSurvey,
  responseCount,
  isLoading = false,
}: {
  project: Project
  packs: Pack[]
  activeSurvey: Survey | null
  responseCount: number
  isLoading?: boolean
}) {
  const supabase = createClient()
  const router = useRouter()
  const canAssign = useCan('assignFramework')
  const [selectedPackId, setSelectedPackId] = useState(activeSurvey?.pack_id ?? '')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)

  const surveyToken = activeSurvey?.survey_tokens?.[0]
  const surveyUrl = surveyToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/survey/${surveyToken.token}`
    : null

  const handleGenerateLink = async () => {
    if (!activeSurvey) return
    setLoading(true)
    setError(null)
    const res = await fetch('/api/assessments/create-access-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ surveyId: activeSurvey.id }),
    })
    if (!res.ok) {
      const { error } = await res.json()
      setError('Failed to create survey link: ' + error)
      setLoading(false)
      return
    }
    router.refresh()
    setLoading(false)
  }

  const handleCreateSurvey = async () => {
    if (!selectedPackId) { setError('Please select a framework pack.'); return }
    setLoading(true)
    setGenerating(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated.'); setLoading(false); setGenerating(false); return }

    // Build pack snapshot from API
    const snapRes = await fetch('/api/assessment-frameworks/capture-version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId: selectedPackId }),
    })

    if (!snapRes.ok) {
      setError('Failed to create framework snapshot.')
      setLoading(false)
      setGenerating(false)
      return
    }

    const snapshot = await snapRes.json()

    // Create survey
    const { data: survey, error: surveyErr } = await supabase
      .from('surveys')
      .insert({
        project_id: project.id,
        pack_id: selectedPackId,
        pack_version_snapshot: snapshot,
        status: 'published',
      })
      .select()
      .single()

    if (surveyErr || !survey) {
      setError(surveyErr?.message ?? 'Failed to create survey.')
      setLoading(false)
      setGenerating(false)
      return
    }

    // Generate token
    const token = generateToken()
    await supabase.from('survey_tokens').insert({
      survey_id: survey.id,
      token,
      max_responses: null,
      expires_at: null,
    })

    // Update project status
    await supabase.from('projects').update({ status: 'active' }).eq('id', project.id)

    router.refresh()
    setLoading(false)
    setGenerating(false)
  }

  const copyLink = () => {
    if (surveyUrl) {
      navigator.clipboard.writeText(surveyUrl)
      setTokenCopied(true)
      setTimeout(() => setTokenCopied(false), 2000)
    }
  }

  const generateToken = () =>
    Array.from(globalThis.crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

  return (
    <>
      <LoadingScreen open={generating} />
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Survey</h2>
          <p className="text-xs text-gray-400 mt-0.5">Framework-driven survey generation</p>
        </div>

        <div className="p-6">
          {!activeSurvey ? (
            canAssign ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Framework Pack
                  </label>
                  <div className="space-y-2">
                    {packs.map(pack => (
                      <label
                        key={pack.id}
                        className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${selectedPackId === pack.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <input
                          type="radio"
                          name="pack"
                          value={pack.id}
                          checked={selectedPackId === pack.id}
                          onChange={() => setSelectedPackId(pack.id)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {pack.name}
                            <span className="ml-2 text-xs text-gray-400">v{pack.version}</span>
                          </p>
                          {pack.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{pack.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">{error}</p>
                )}

                <Button
                  onClick={handleCreateSurvey}
                  disabled={loading || !selectedPackId}
                  className="w-full rounded-lg"
                >
                  {loading ? 'Generating Survey…' : 'Generate & Publish Survey'}
                </Button>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm font-medium text-gray-700">No survey created yet</p>
                <p className="text-xs text-gray-400 mt-1">An Admin must create and assign a framework first.</p>
              </div>
            )
          ) : (
            <div className="space-y-5">
              {/* Status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Survey Status</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {activeSurvey.status === 'published' ? 'Accepting responses' : 'Closed'}
                  </p>
                </div>
                <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${activeSurvey.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                  {activeSurvey.status}
                </span>
              </div>

              {/* Response count */}
              <div className="bg-gray-50 rounded-lg px-5 py-4">
                <p className="text-3xl font-bold text-gray-900">{responseCount}</p>
                <p className="text-xs text-gray-500 mt-0.5">Responses submitted</p>
                {responseCount === 0 && activeSurvey.status === 'published' && (
                  <p className="text-xs text-amber-600 mt-2 leading-relaxed">
                    No responses yet. Copy the survey link below and open it in a browser (or incognito tab) to submit a response.
                  </p>
                )}
              </div>

              {/* Survey link */}
              {surveyUrl && activeSurvey.status === 'published' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Survey Link</label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={surveyUrl}
                      className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600 font-mono"
                    />
                    <Button
                      onClick={copyLink}
                      size="sm"
                      className={`rounded-lg ${tokenCopied
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-700 hover:bg-gray-900'
                        }`}
                    >
                      {tokenCopied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                </div>
              )}

              {/* No token yet — recovery button (admin only) */}
              {!surveyUrl && activeSurvey.status === 'published' && canAssign && (
                <div>
                  <Button
                    onClick={handleGenerateLink}
                    disabled={loading}
                    className="w-full rounded-lg"
                  >
                    {loading ? 'Generating…' : 'Generate Survey Link'}
                  </Button>
                </div>
              )}

              {/* Survey lifecycle control */}
              <SurveyStatusControl
                surveyId={activeSurvey.id}
                currentStatus={activeSurvey.status as 'draft' | 'published' | 'closed'}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
