'use client'

import { useState } from 'react'

interface Props {
  projectId: string
  scoreRunId: string
}

interface ShareLink {
  id: string
  token: string
  url: string
  expiresAt: string | null
  createdAt: string
  viewCount: number
  isActive: boolean
}

export default function ShareReportButton({ projectId, scoreRunId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingShares, setLoadingShares] = useState(false)
  const [shares, setShares] = useState<ShareLink[]>([])
  const [expiryDays, setExpiryDays] = useState<number>(30)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadShares = async () => {
    setLoadingShares(true)
    try {
      const res = await fetch(`/api/reporting/manage-sharing?projectId=${projectId}&scoreRunId=${scoreRunId}`)
      console.log('Load shares response status:', res.status)
      
      if (res.ok) {
        const data = await res.json()
        setShares(data.shares ?? [])
      } else {
        const errorData = await res.json()
        setError(`Failed to load links: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Failed to load shares:', err)
      setError('Failed to load links. Check console for details.')
    } finally {
      setLoadingShares(false)
    }
  }

  const handleOpen = async () => {
    setIsOpen(true)
    setError(null)
    setSuccess(null)
    await loadShares()
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    
    const expiryValue = expiryDays || 0
    console.log('Generating link with expiry days:', expiryValue)
    
    try {
      const res = await fetch('/api/reporting/manage-sharing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          scoreRunId,
          expiresInDays: expiryValue > 0 ? expiryValue : null,
        }),
      })

      console.log('Generate link response status:', res.status)
      
      if (res.ok) {
        const data = await res.json()
        console.log('Generated link data:', data)
        await loadShares()
        handleCopy(data.share.url)
        setSuccess(`Link generated and copied! Expires: ${expiryValue > 0 ? expiryValue + ' days' : 'Never'}`)
        setTimeout(() => setSuccess(null), 5000)
      } else {
        const errorData = await res.json()
        console.error('Failed to generate link:', errorData)
        setError(`Failed: ${errorData.error || 'Unknown error'}. Check console for details.`)
      }
    } catch (err) {
      console.error('Failed to generate share link:', err)
      setError('An error occurred. Check browser console for details.')
    } finally {
      setLoading(false)
    }
  }


  const handleDeactivate = async (id: string) => {
    if (!confirm('Deactivate this shareable link?')) return

    try {
      const res = await fetch(`/api/reporting/manage-sharing?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        await loadShares()
      }
    } catch (err) {
      console.error('Failed to deactivate link:', err)
    }
  }

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
      >
        🔗 Share Report
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Share Report</h2>
                <p className="text-xs text-gray-500 mt-1">Generate read-only shareable links</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Error/Success Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                  ✓ {success}
                </div>
              )}

              {/* Generate New Link */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-3">Generate New Link</h3>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-blue-700 font-medium block mb-1">
                      Expires in (days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(parseInt(e.target.value) || 0)}
                      placeholder="30"
                      className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-blue-600 mt-1">Enter 0 for never expires, or number of days (e.g. 30, 60, 90)</p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {loading ? 'Generating...' : 'Generate Link'}
                  </button>
                </div>
              </div>

              {/* Existing Links */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Active Links 
                  {loadingShares && <span className="text-xs text-gray-400 font-normal ml-2">(Loading...)</span>}
                  {!loadingShares && shares.length > 0 && (
                    <span className="text-xs text-gray-500 font-normal ml-2">
                      ({shares.filter(s => s.isActive).length} active)
                    </span>
                  )}
                </h3>
                {loadingShares ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    Loading links...
                  </p>
                ) : shares.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No shareable links yet. Generate one above.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {shares
                      .filter(s => s.isActive === true)
                      .map(share => (
                        <div key={share.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-500 mb-1">
                                Created {new Date(share.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                                {share.expiresAt && ` · Expires ${new Date(share.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}`}
                              </p>
                              <div className="flex items-center gap-2">
                                <code className="text-xs text-blue-600 bg-white border border-gray-300 px-2 py-1 rounded flex-1 truncate">
                                  {share.url}
                                </code>
                                <button
                                  onClick={() => handleCopy(share.url)}
                                  className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors whitespace-nowrap"
                                >
                                  {copied === share.url ? '✓ Copied' : 'Copy'}
                                </button>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeactivate(share.id)}
                              className="text-xs text-red-600 hover:text-red-800 font-medium whitespace-nowrap"
                            >
                              Deactivate
                            </button>
                          </div>
                          <p className="text-xs text-gray-400">
                            {share.viewCount ?? 0} view{(share.viewCount ?? 0) === 1 ? '' : 's'}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
