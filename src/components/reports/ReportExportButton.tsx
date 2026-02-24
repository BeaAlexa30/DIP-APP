'use client'

import { useState } from 'react'
import { generatePDFReport } from '@/lib/reports/pdf'
import type { ScoringResult } from '@/lib/scoring/engine'

interface Props {
  projectName: string
  industry: string | null
  goal: string | null
  frameworkVersion: string
  scoring: ScoringResult
  aiInsightSummary?: string
  aiThemes?: string[]
}

export default function ReportExportButton({
  projectName,
  industry,
  goal,
  frameworkVersion,
  scoring,
  aiInsightSummary,
  aiThemes,
}: Props) {
  const [loading, setLoading] = useState(false)

  const handleExport = () => {
    setLoading(true)
    try {
      const blob = generatePDFReport({
        projectName,
        industry,
        goal,
        reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        frameworkVersion,
        responseCount: scoring.responseCount,
        scoring,
        aiInsightSummary,
        aiThemes,
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DIP-Report-${projectName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="bg-gray-900 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
    >
      {loading ? 'Generating PDF…' : '↓ Export PDF Report'}
    </button>
  )
}
