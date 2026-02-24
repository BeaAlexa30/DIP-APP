// @ts-nocheck
'use client'

import LoadingScreen from '@/components/app/LoadingScreen'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
}) {
  const supabase = createClient()
  const router = useRouter()
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
    const res = await fetch('/api/survey/generate-token', {
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
    if (!user) { setError('Not authenticated.'); setLoading(false); return }

    // Build pack snapshot from API
    const snapRes = await fetch('/api/framework/snapshot', {
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

  const handleCloseSurvey = async () => {
    if (!activeSurvey) return
    setLoading(true)
    await supabase.from('surveys').update({ status: 'closed' }).eq('id', activeSurvey.id)
    router.refresh()
    setLoading(false)
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

              <button
                onClick={handleCreateSurvey}
                disabled={loading || !selectedPackId}
                className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Generating Survey…' : 'Generate & Publish Survey'}
              </button>
            </div>
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
                    <button
                      onClick={copyLink}
                      className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${tokenCopied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      {tokenCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* No token yet — recovery button */}
              {!surveyUrl && activeSurvey.status === 'published' && (
                <div>
                  <button
                    onClick={handleGenerateLink}
                    disabled={loading}
                    className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Generating…' : 'Generate Survey Link'}
                  </button>
                </div>
              )}

              {/* Close survey */}
              {activeSurvey.status === 'published' && (
                <button
                  onClick={handleCloseSurvey}
                  disabled={loading}
                  className="w-full border border-gray-300 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Closing…' : 'Close Survey'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
