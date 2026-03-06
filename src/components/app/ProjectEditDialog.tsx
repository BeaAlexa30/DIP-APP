'use client'

import { Button } from '@/components/ui/button'
import type { Database } from '@/types/DatabaseSchemaDefinitions'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

type Project = Database['public']['Tables']['projects']['Row']

interface Props {
  project: Project
  isOpen: boolean
  onClose: () => void
}

export default function EditProjectModal({ project, isOpen, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const PRESET_CHANNELS = ['Web', 'Mobile', 'Email', 'Social Media', 'In-App', 'SMS']
  const PRESET_STAGES = ['Awareness', 'Consideration', 'Purchase', 'Retention', 'Advocacy']
  const savedOtherChannels = (project.channels || []).filter(c => !PRESET_CHANNELS.includes(c) && c !== 'Other')
  const savedStageIsOther = !!project.stage && !PRESET_STAGES.includes(project.stage)
  const [formData, setFormData] = useState({
    client_name: project.client_name,
    industry: project.industry || '',
    goal: project.goal || '',
    stage: savedStageIsOther ? 'Other' : (project.stage || ''),
    channels: savedOtherChannels.length > 0
      ? [...(project.channels || []).filter(c => PRESET_CHANNELS.includes(c)), 'Other']
      : (project.channels || []),
    target_audience: project.target_audience || '',
    status: project.status,
  })
  const [otherStageText, setOtherStageText] = useState(savedStageIsOther ? (project.stage || '') : '')
  const [otherChannels, setOtherChannels] = useState<string[]>(savedOtherChannels.length > 0 ? savedOtherChannels : [''])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const finalStage = formData.stage === 'Other' ? (otherStageText.trim() || 'Other') : formData.stage
      const finalChannels = formData.channels.includes('Other')
        ? [...formData.channels.filter(c => c !== 'Other'), ...otherChannels.filter(c => c.trim())]
        : formData.channels
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, stage: finalStage, channels: finalChannels }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update project')
      }

      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const channelOptions = ['Web', 'Mobile', 'Email', 'Social Media', 'In-App', 'SMS', 'Other']

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Edit Project</h2>
                <p className="text-sm text-gray-500 mt-1">Update project details</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                {/* Client Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Industry */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Healthcare, Finance, E-commerce"
                  />
                </div>

                {/* Goal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Goal</label>
                  <textarea
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="What is the strategic goal for this project?"
                  />
                </div>

                {/* Stage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select stage...</option>
                    <option value="Awareness">Awareness</option>
                    <option value="Consideration">Consideration</option>
                    <option value="Purchase">Purchase</option>
                    <option value="Retention">Retention</option>
                    <option value="Advocacy">Advocacy</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.stage === 'Other' && (
                    <input
                      type="text"
                      value={otherStageText}
                      onChange={e => setOtherStageText(e.target.value)}
                      placeholder="Specify business stage…"
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  )}
                </div>

                {/* Channels */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
                  <div className="flex flex-wrap gap-2">
                    {channelOptions.map((channel) => (
                      <label key={channel} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.channels.includes(channel)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                channels: [...formData.channels, channel],
                              })
                            } else {
                              setFormData({
                                ...formData,
                                channels: formData.channels.filter((c) => c !== channel),
                              })
                            }
                          }}
                          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{channel}</span>
                      </label>
                    ))}
                  </div>
                  {formData.channels.includes('Other') && (
                    <div className="mt-2 space-y-2">
                      {otherChannels.map((ch, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            value={ch}
                            onChange={e => {
                              const updated = [...otherChannels]
                              updated[i] = e.target.value
                              setOtherChannels(updated)
                            }}
                            placeholder="Specify other channel…"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          {otherChannels.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setOtherChannels(otherChannels.filter((_, idx) => idx !== i))}
                              className="px-2 py-1 text-gray-400 hover:text-red-500 transition-colors text-sm"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setOtherChannels([...otherChannels, ''])}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        + Add another
                      </button>
                    </div>
                  )}
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                  <input
                    type="text"
                    value={formData.target_audience}
                    onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Millennials, B2B decision makers"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    variant="outline"
                    className="flex-1 rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-lg"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
