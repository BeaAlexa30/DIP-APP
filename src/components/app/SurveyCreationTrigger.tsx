'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/DatabaseClientManager'
import LoadingScreen from './ApplicationLoadingIndicator'

interface Pack {
  id: string
  name: string
  version: string
  description: string | null
}

interface AddSurveyButtonProps {
  projectId: string
  packs: Pack[]
  existingPackIds: string[]
}

export default function AddSurveyButton({ projectId, packs, existingPackIds }: AddSurveyButtonProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPackId, setSelectedPackId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter out already used frameworks
  const availablePacks = packs.filter(pack => !existingPackIds.includes(pack.id))

  const handleCreateSurvey = async () => {
    if (!selectedPackId) {
      setError('Please select a framework pack.')
      return
    }

    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not authenticated.')
      setLoading(false)
      return
    }

    // Build pack snapshot from API
    const snapRes = await fetch('/api/assessment-frameworks/capture-version', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packId: selectedPackId }),
    })

    if (!snapRes.ok) {
      setError('Failed to create framework snapshot.')
      setLoading(false)
      return
    }

    const snapshot = await snapRes.json()

    // Create survey
    const { data: survey, error: surveyErr } = await (supabase as any)
      .from('surveys')
      .insert({
        project_id: projectId,
        pack_id: selectedPackId,
        pack_version_snapshot: snapshot,
        status: 'published',
      })
      .select()
      .single()

    if (surveyErr || !survey) {
      setError(surveyErr?.message ?? 'Failed to create survey.')
      setLoading(false)
      return
    }

    // Generate token
    const token = generateToken()
    const { error: tokenErr } = await (supabase as any).from('survey_tokens').insert({
      survey_id: survey.id,
      token,
      max_responses: null,
      expires_at: null,
    })

    if (tokenErr) {
      console.error('Token creation error:', tokenErr)
    }

    router.refresh()
    setLoading(false)
    setIsOpen(false)
    setSelectedPackId('')
  }

  const generateToken = () =>
    Array.from(globalThis.crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

  if (availablePacks.length === 0) {
    return null // All frameworks already used
  }

  return (
    <>
      <LoadingScreen open={loading} />
      
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-blue-600 text-white text-sm font-medium px-5 py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-lg">+</span>
        Add Another Framework Survey
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Add Framework Survey</h2>
                <p className="text-xs text-gray-500 mt-1">Select a framework to create a new survey</p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false)
                  setError(null)
                  setSelectedPackId('')
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Framework Pack
                </label>
                <div className="space-y-2">
                  {availablePacks.map(pack => (
                    <label
                      key={pack.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedPackId === pack.id
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
                      <div className="flex-1">
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

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsOpen(false)
                    setError(null)
                    setSelectedPackId('')
                  }}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSurvey}
                  disabled={loading || !selectedPackId}
                  className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Creating Survey…' : 'Create & Publish Survey'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
