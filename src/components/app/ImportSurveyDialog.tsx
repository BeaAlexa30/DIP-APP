'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/DatabaseClientManager'

interface Props {
  projectId: string
}

const SUPPORTED_PLATFORMS = [
  { name: 'Google Forms', icon: '📋', pattern: /forms\.gle|docs\.google\.com\/forms/i },
  { name: 'Microsoft Forms', icon: '📝', pattern: /forms\.office\.com|forms\.microsoft\.com/i },
  { name: 'Typeform', icon: '✍️', pattern: /typeform\.com/i },
  { name: 'SurveyMonkey', icon: '🐵', pattern: /surveymonkey\.com/i },
  { name: 'Jotform', icon: '📊', pattern: /jotform\.com/i },
  { name: 'Tally', icon: '📈', pattern: /tally\.so/i },
  { name: 'Other Survey Link', icon: '🔗', pattern: /https?:\/\/.+/i },
]

function detectPlatform(url: string) {
  for (const p of SUPPORTED_PLATFORMS) {
    if (p.pattern.test(url)) return p
  }
  return null
}

export default function ImportSurveyDialog({ projectId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [isOpen, setIsOpen] = useState(false)
  const [surveyTitle, setSurveyTitle] = useState('')
  const [surveyUrl, setSurveyUrl] = useState('')
  const [responseUrl, setResponseUrl] = useState('')
  const [embedDescription, setEmbedDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const detectedPlatform = surveyUrl.trim() ? detectPlatform(surveyUrl.trim()) : null

  const isValidUrl = (url: string) => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  const canSubmit =
    surveyTitle.trim().length > 0 &&
    surveyUrl.trim().length > 0 &&
    isValidUrl(surveyUrl.trim())

  function handleClose() {
    setIsOpen(false)
    setSurveyTitle('')
    setSurveyUrl('')
    setResponseUrl('')
    setEmbedDescription('')
    setError(null)
    setSuccess(false)
  }

  async function handleImport() {
    if (!canSubmit) return
    setSaving(true)
    setError(null)

    try {
      const trimmedUrl = surveyUrl.trim()
      const platform = detectPlatform(trimmedUrl)

      // Build snapshot for the imported survey
      const snapshot = {
        packName: surveyTitle.trim(),
        version: `imported-${Date.now()}`,
        ai_generated: false,
        custom_survey: true,
        imported_survey: true,
        import_source: platform?.name ?? 'External Survey',
        import_url: trimmedUrl,
        response_url: responseUrl.trim() || null,
        description: embedDescription.trim() || null,
        categories: [{
          id: 'imported-category',
          name: 'Imported Survey',
          order: 1,
          questions: [{
            id: 'imported-link',
            type: 'embedded_link',
            prompt: surveyTitle.trim(),
            required: false,
            order: 1,
            embed_url: trimmedUrl,
          }]
        }]
      }

      const { data: survey, error: surveyErr } = await (supabase as any)
        .from('surveys')
        .insert({
          project_id: projectId,
          pack_id: null,
          pack_version_snapshot: snapshot,
          status: 'published',
        })
        .select()
        .single()

      if (surveyErr) throw new Error(surveyErr?.message ?? 'Failed to import survey.')

      // Create access token
      const token = Array.from(globalThis.crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      await (supabase as any).from('survey_tokens').insert({
        survey_id: survey.id,
        token,
        max_responses: null,
        expires_at: null,
      })

      setSuccess(true)
      router.refresh()
      setTimeout(() => handleClose(), 1500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-5 py-3 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
      >
        <span className="text-base">🔗</span>
        Import External Survey Link
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Import External Survey</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Embed a Google Form, Microsoft Form, or any survey link into this project</p>
                </div>
                <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              {!success ? (
                <>
                  {/* Supported Platforms */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Supported Platforms:</p>
                    <div className="flex flex-wrap gap-2">
                      {SUPPORTED_PLATFORMS.slice(0, -1).map(p => (
                        <span key={p.name} className="text-xs bg-white border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
                          {p.icon} {p.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Survey Title */}
                  <div>
                    <label htmlFor="import-survey-title" className="block text-sm font-semibold text-gray-800 mb-2">
                      Survey Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="import-survey-title"
                      name="importSurveyTitle"
                      type="text"
                      value={surveyTitle}
                      onChange={e => setSurveyTitle(e.target.value)}
                      placeholder="e.g., Customer Satisfaction Form"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>

                  {/* Survey URL */}
                  <div>
                    <label htmlFor="import-survey-url" className="block text-sm font-semibold text-gray-800 mb-2">
                      Survey Link / URL <span className="text-red-400">*</span>
                    </label>
                    <input
                      id="import-survey-url"
                      name="importSurveyUrl"
                      type="url"
                      value={surveyUrl}
                      onChange={e => { setSurveyUrl(e.target.value); setError(null) }}
                      placeholder="https://forms.gle/... or https://forms.office.com/..."
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        surveyUrl && !isValidUrl(surveyUrl) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {surveyUrl && !isValidUrl(surveyUrl) && (
                      <p className="text-xs text-red-500 mt-1">Please enter a valid URL (starting with https://)</p>
                    )}
                    {/* Platform detected badge */}
                    {detectedPlatform && isValidUrl(surveyUrl) && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                        <span>{detectedPlatform.icon}</span>
                        <span>{detectedPlatform.name} detected ✓</span>
                      </div>
                    )}
                  </div>

                  {/* Response URL (optional) */}
                  <div>
                    <label htmlFor="import-response-url" className="block text-sm font-semibold text-gray-800 mb-2">
                      Response / Results Link <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      id="import-response-url"
                      name="importResponseUrl"
                      type="url"
                      value={responseUrl}
                      onChange={e => setResponseUrl(e.target.value)}
                      placeholder="e.g., https://docs.google.com/forms/.../responses"
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                        responseUrl.trim() && !isValidUrl(responseUrl.trim()) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                      }`}
                    />
                    {responseUrl.trim() && !isValidUrl(responseUrl.trim()) && (
                      <p className="text-xs text-red-500 mt-1">Please enter a valid URL (starting with https://)</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Link to where you can view the collected responses (e.g., Google Forms responses tab).</p>
                  </div>

                  {/* Description (optional) */}
                  <div>
                    <label htmlFor="import-description" className="block text-sm font-semibold text-gray-800 mb-2">
                      Description <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      id="import-description"
                      name="importDescription"
                      rows={3}
                      value={embedDescription}
                      onChange={e => setEmbedDescription(e.target.value)}
                      placeholder="Brief description of what this survey measures..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                  </div>

                  {/* Info Note */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700 leading-relaxed">
                    <p className="font-semibold mb-1">ℹ️ How it works</p>
                    <p>The survey link will be embedded inside your project as a framework survey. Respondents will be redirected to the external survey to fill it out. The link will appear alongside other surveys in this project.</p>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleClose}
                      className="flex-1 border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={!canSubmit || saving}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                          Importing…
                        </>
                      ) : (
                        <><span>🔗</span> Import Survey</>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">✓</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Survey Imported!</h3>
                  <p className="text-sm text-gray-500">The external survey has been added to this project.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
