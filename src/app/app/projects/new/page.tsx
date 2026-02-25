// @ts-nocheck
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STAGE_OPTIONS = ['Discovery', 'Growth', 'Optimization', 'Retention', 'Turnaround']
const CHANNEL_OPTIONS = ['Web', 'Mobile App', 'In-store', 'Phone/Call Center', 'Email', 'Social Media', 'Marketplace']

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    client_name: '',
    industry: '',
    goal: '',
    stage: '',
    channels: [] as string[],
    target_audience: '',
  })

  const toggleChannel = (ch: string) =>
    setForm(f => ({
      ...f,
      channels: f.channels.includes(ch)
        ? f.channels.filter(c => c !== ch)
        : [...f.channels, ch],
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated.'); setLoading(false); return }

    const { data, error: err } = await supabase
      .from('projects')
      .insert({
        ...form,
        created_by: user.id,
        status: 'draft',
      })
      .select()
      .single()

    if (err) { setError(err.message); setLoading(false); return }

    router.push(`/app/projects/${data.id}`)
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Project</h1>
        <p className="text-gray-500 text-sm mt-1">Create a client intake project to begin the DIP workflow</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-xl border border-gray-200 p-6">
        {/* Client Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Client Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.client_name}
            onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Acme Corp"
          />
        </div>

        {/* Industry */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Industry</label>
          <input
            type="text"
            value={form.industry}
            onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="E-commerce, SaaS, Healthcare…"
          />
        </div>

        {/* Goal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Goal</label>
          <textarea
            rows={3}
            value={form.goal}
            onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="What decision does this project need to support?"
          />
        </div>

        {/* Stage */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Stage</label>
          <select
            value={form.stage}
            onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select stage…</option>
            {STAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Channels */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
          <div className="flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map(ch => (
              <button
                key={ch}
                type="button"
                onClick={() => toggleChannel(ch)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  form.channels.includes(ch)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Target Audience</label>
          <input
            type="text"
            value={form.target_audience}
            onChange={e => setForm(f => ({ ...f, target_audience: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="B2C consumers, enterprise buyers, SMB owners…"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  )
}
