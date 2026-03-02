'use client'

import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface Props {
  projectId: string
}

export default function DateRangeFilter({ projectId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '')
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '')
  const [isExpanded, setIsExpanded] = useState(false)

  function handleApply() {
    const params = new URLSearchParams(searchParams.toString())

    if (startDate) {
      params.set('startDate', startDate)
    } else {
      params.delete('startDate')
    }

    if (endDate) {
      params.set('endDate', endDate)
    } else {
      params.delete('endDate')
    }

    router.push(`/app/projects/${projectId}/dashboard?${params.toString()}`)
  }

  function handleClear() {
    setStartDate('')
    setEndDate('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('startDate')
    params.delete('endDate')
    router.push(`/app/projects/${projectId}/dashboard?${params.toString()}`)
  }

  const hasFilter = startDate || endDate

  return (
    <div className="relative">
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        variant={hasFilter ? 'default' : 'outline'}
        size="sm"
        className={`rounded-lg ${hasFilter ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
      >
        📅 {hasFilter ? 'Filtered' : 'Filter Dates'}
      </Button>

      {isExpanded && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsExpanded(false)}
          />
          <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-20 w-80">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Filter by Date Range</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleClear}
                variant="outline"
                size="sm"
                className="flex-1 rounded-lg"
              >
                Clear
              </Button>
              <Button
                onClick={handleApply}
                size="sm"
                className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700"
              >
                Apply
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
