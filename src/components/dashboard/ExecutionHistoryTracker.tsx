'use client'

import { Button } from '@/components/ui/button'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

interface ScoreRun {
  id: string
  executed_at: string
  response_count: number
  checksum: string
  health_score: number
}

interface Props {
  scoreRuns: ScoreRun[]
  currentRunId: string
  projectId: string
  surveyId?: string
}

export default function ScoreRunHistory({ scoreRuns, currentRunId, projectId, surveyId }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState(currentRunId)

  if (scoreRuns.length <= 1) return null

  const chartData = scoreRuns.slice().reverse().map((run, idx) => ({
    name: `Run ${idx + 1}`,
    date: new Date(run.executed_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    healthScore: run.health_score,
    responses: run.response_count,
  }))

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="link"
        className="text-blue-600 hover:text-blue-800 p-0 h-auto text-sm"
      >
        📊 View History ({scoreRuns.length} runs)
      </Button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Score Run History</h2>
                      <p className="text-sm text-gray-500 mt-1">{scoreRuns.length} score runs over time</p>
                    </div>
                    <Button
                      onClick={() => setIsOpen(false)}
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </Button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Trend Chart */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Health Score Trend</h3>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="healthScore"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            name="Health Score"
                            dot={{ r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="responses"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Response Count"
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Score Run List */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">All Score Runs</h3>
                    <div className="space-y-2">
                      {scoreRuns.map((run, idx) => {
                        const isCurrent = run.id === currentRunId
                        const isSelected = run.id === selectedRunId

                        return (
                          <div
                            key={run.id}
                            className={`border rounded-lg p-4 transition-all ${isCurrent
                                ? 'border-blue-300 bg-blue-50'
                                : isSelected
                                  ? 'border-blue-200 bg-blue-25'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-gray-900">
                                    Run #{scoreRuns.length - idx}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(run.executed_at).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900">
                                  {run.health_score.toFixed(1)}
                                </div>
                                <p className="text-xs text-gray-500">{run.response_count} responses</p>
                              </div>
                            </div>

                            {run.id !== currentRunId && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <a
                                  href={`/app/projects/${projectId}/dashboard?runId=${run.id}${surveyId ? `&surveyId=${surveyId}` : ''}`}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Load this run →
                                </a>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="secondary"
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                  >
                    Close
                  </Button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
