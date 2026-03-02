'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis,
} from 'recharts';

interface Props {
  projectsByStatus: { name: string; value: number; color: string }[]
  surveysByStatus: { name: string; value: number; color: string }[]
  projectTrend: { month: string; projects: number }[]
  frameworkCount: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
        {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color ?? entry.fill }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, name }: any) => {
  if (value === 0) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {value}
    </text>
  )
}

export default function DashboardCharts({ projectsByStatus, surveysByStatus, projectTrend, frameworkCount }: Props) {
  const totalProjects = projectsByStatus.reduce((s, d) => s + d.value, 0)
  const totalSurveys = surveysByStatus.reduce((s, d) => s + d.value, 0)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
      {/* ── Chart 1: Projects by Status (Donut) ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Total Projects</h3>
            <p className="text-xs text-gray-400 mt-0.5">Distribution by status</p>
          </div>
          <span className="text-2xl font-bold text-[#00B3B0]">{totalProjects}</span>
        </div>
        {totalProjects > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={projectsByStatus.filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {projectsByStatus.filter(d => d.value > 0).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">No data yet</div>
        )}
      </div>

      {/* ── Chart 2: Surveys by Status (Bar) ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Active Surveys</h3>
            <p className="text-xs text-gray-400 mt-0.5">Breakdown by survey status</p>
          </div>
          <span className="text-2xl font-bold text-[#007775]">
            {surveysByStatus.find(s => s.name === 'Published')?.value ?? 0}
          </span>
        </div>
        {totalSurveys > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={surveysByStatus} margin={{ top: 10, right: 8, left: -20, bottom: 0 }} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="value" name="Surveys" radius={[4, 4, 0, 0]}>
                {surveysByStatus.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">No surveys yet</div>
        )}
      </div>

      {/* ── Chart 3: Project Trend + Framework Packs ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Framework Packs</h3>
            <p className="text-xs text-gray-400 mt-0.5">Active packs &amp; project trend</p>
          </div>
          <span className="text-2xl font-bold text-[#005f5e]">{frameworkCount}</span>
        </div>

        {/* Mini framework stat */}
        <div className="flex items-center gap-2 mb-3 mt-1">
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${Math.min(frameworkCount * 10, 100)}%`, backgroundColor: '#00B3B0' }}
            />
          </div>
          <span className="text-xs text-gray-400">{frameworkCount} active</span>
        </div>

        {/* Project trend area chart */}
        <p className="text-xs text-gray-400 mb-2">Projects created (last 6 months)</p>
        {projectTrend.some(d => d.projects > 0) ? (
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={projectTrend} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00B3B0" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00B3B0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="projects"
                name="Projects"
                stroke="#00B3B0"
                strokeWidth={2}
                fill="url(#trendGrad)"
                dot={{ r: 3, fill: '#00B3B0', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[130px] flex items-center justify-center text-gray-300 text-sm">No trend data</div>
        )}
      </div>
    </div>
  )
}
