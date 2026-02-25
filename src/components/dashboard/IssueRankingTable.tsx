interface Issue {
  id: string
  driver_tag: string
  risk: number
  friction: number
  frequency: number
  priority_score: number
  description: string | null
}

function PriorityBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-red-100 text-red-700' :
    score >= 40 ? 'bg-yellow-100 text-yellow-700' :
    'bg-gray-100 text-gray-500'
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {score.toFixed(1)}
    </span>
  )
}

export default function IssueRankingTable({ issues }: { issues: Issue[] }) {
  if (!issues.length) {
    return (
      <div className="px-6 py-10 text-center text-gray-400 text-sm">
        No issues ranked yet.
      </div>
    )
  }

  return (
    <div className="overflow-auto max-h-96">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold text-gray-500">#</th>
            <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Driver</th>
            <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Risk</th>
            <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Friction</th>
            <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Priority</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {issues.map((issue, i) => (
            <tr key={issue.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-400">{i + 1}</td>
              <td className="px-4 py-3 font-medium text-gray-700 capitalize">
                {issue.driver_tag.replace(/_/g, ' ')}
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`font-medium ${issue.risk >= 50 ? 'text-red-600' : 'text-gray-500'}`}>
                  {issue.risk.toFixed(1)}%
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`font-medium ${issue.friction >= 50 ? 'text-orange-500' : 'text-gray-500'}`}>
                  {issue.friction.toFixed(1)}%
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <PriorityBadge score={issue.priority_score} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
