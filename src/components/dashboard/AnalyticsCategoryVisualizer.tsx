'use client'

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface CategoryData {
  name: string
  score: number
}

export default function CategoryChart({ categories }: { categories: CategoryData[] }) {
  if (!categories.length) {
    return <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
  }

  const data = categories.map(c => ({
    subject: c.name.split(' ').slice(0, 2).join(' '), // shorten for radar
    score: Number(c.score.toFixed(1)),
    fullMark: 100,
  }))

  return (
  <div className="space-y-6">
    {/* Radar chart: Hidden on extra small screens, shown from 'sm' up */}
    <div className="h-64 sm:h-72 hidden sm:block">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6b7280' }} />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>

    {/* Bar breakdown: Always visible, but more compact on mobile */}
    <div className="grid grid-cols-1 gap-3">
      {categories.map(cat => (
        <div key={cat.name} className="bg-gray-50 p-2 rounded-lg border border-gray-100 sm:bg-transparent sm:p-0 sm:border-0">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 font-medium truncate pr-4">{cat.name}</span>
            <span className="text-gray-900 font-bold">{Number(cat.score).toFixed(1)}</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${cat.score}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
)
}
