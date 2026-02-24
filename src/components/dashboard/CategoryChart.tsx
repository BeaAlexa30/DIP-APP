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
    <div className="space-y-4">
      {/* Radar chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#2563eb"
              fill="#2563eb"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Tooltip
              formatter={(value: number | undefined) => [`${value ?? 0}/100`, 'Score']}
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Bar breakdown */}
      <div className="space-y-2">
        {categories.map(cat => (
          <div key={cat.name}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-600 truncate max-w-[200px]">{cat.name}</span>
              <span className="text-gray-700 font-medium">{Number(cat.score).toFixed(1)}</span>
            </div>
            <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${cat.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
