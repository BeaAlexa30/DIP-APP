'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/DatabaseClientManager'
import type { AppSettings } from '@/lib/settings/AppSettingsLoader'

interface Props {
  initialSettings: AppSettings
}

export default function BrandingSettingsForm({ initialSettings }: Props) {
  const supabase = createClient()
  const [companyName, setCompanyName] = useState(initialSettings.company_name)
  const [primaryColor, setPrimaryColor] = useState(initialSettings.primary_color)
  const [footerTagline, setFooterTagline] = useState(initialSettings.footer_tagline ?? '')
  const [logoUrl, setLogoUrl] = useState(initialSettings.logo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage(null)
    const ext = file.name.split('.').pop()
    const path = `logos/company-logo-${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('app-assets')
      .upload(path, file, { upsert: true })
    if (error) {
      setMessage({ type: 'error', text: `Upload failed: ${error.message}` })
    } else {
      const { data } = supabase.storage.from('app-assets').getPublicUrl(path)
      setLogoUrl(data.publicUrl)
      setMessage({ type: 'success', text: 'Logo uploaded. Save to apply.' })
    }
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    const res = await fetch('/api/settings/branding', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_name: companyName,
        logo_url: logoUrl || null,
        primary_color: primaryColor,
        footer_tagline: footerTagline || null,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setMessage({ type: 'error', text: json.error ?? 'Failed to save settings.' })
    } else {
      setMessage({ type: 'success', text: 'Branding saved! Reload the page to see changes.' })
    }
    setSaving(false)
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Company Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Company / App Name</label>
        <input
          type="text"
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Decision Intelligence"
        />
        <p className="text-xs text-gray-400 mt-1">Displayed in the sidebar and page header.</p>
      </div>

      {/* Logo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo</label>
        {logoUrl && (
          <div className="mb-3 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Current logo" className="w-12 h-12 object-contain border rounded-lg p-1 bg-gray-50" />
            <span className="text-xs text-gray-400">Current logo</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 disabled:opacity-50"
        />
        {uploading && <p className="text-xs text-violet-500 mt-1">Uploading…</p>}
        <p className="text-xs text-gray-400 mt-1">PNG or SVG recommended. Shown at 40&times;40 px in the sidebar.</p>
      </div>

      {/* Primary Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Theme Color</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primaryColor}
            onChange={e => setPrimaryColor(e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
          />
          <input
            type="text"
            value={primaryColor}
            onChange={e => setPrimaryColor(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="#6d28d9"
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">Used for active navigation items and accent colors.</p>
      </div>

      {/* Footer Tagline */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Footer Tagline</label>
        <input
          type="text"
          value={footerTagline}
          onChange={e => setFooterTagline(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          placeholder="Internal Decision Intelligence Platform"
        />
        <p className="text-xs text-gray-400 mt-1">Short tagline shown under the platform name in the sidebar.</p>
      </div>

      {/* Status message */}
      {message && (
        <div className={`text-sm px-3 py-2 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-red-50 text-red-600 border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || uploading}
        className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save Branding'}
      </button>
    </div>
  )
}
