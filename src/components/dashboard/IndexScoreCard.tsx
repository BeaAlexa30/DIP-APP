const INDEX_LABELS: Record<string, string> = {
  trust: 'Trust',
  usability: 'Usability',
  conversion_risk: 'Conv. Risk',
  experience: 'Experience',
  loyalty: 'Loyalty',
}

export default function IndexScoreCard({
  indexKey,
  score,
  higherIsBetter,
}: {
  indexKey: string
  score: number
  higherIsBetter: boolean
}) {
  const label = INDEX_LABELS[indexKey] ?? indexKey

  // Derive color: for higherIsBetter, high score is good; for risk, high score is bad
  const isGood = higherIsBetter ? score >= 65 : score < 45
  const isMid = higherIsBetter ? (score >= 45 && score < 65) : (score >= 45 && score < 65)

  const colorClass = isGood
    ? 'text-green-600 bg-green-50 border-green-200'
    : isMid
    ? 'text-yellow-600 bg-yellow-50 border-yellow-200'
    : 'text-red-600 bg-red-50 border-red-200'

  const barColor = isGood ? 'bg-green-500' : isMid ? 'bg-yellow-400' : 'bg-red-500'
  const displayScore = higherIsBetter ? score : 100 - score  // visual bar shows "health" direction

  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      {!higherIsBetter && (
        <p className="text-xs opacity-50 mt-0.5">higher = more risk</p>
      )}
      <p className="text-2xl font-bold mt-1">{score.toFixed(1)}</p>
      {!higherIsBetter && (
        <p className="text-xs opacity-60 mt-0.5">
          Health contribution: {(100 - score).toFixed(1)}
        </p>
      )}
      <div className="mt-2 bg-white/60 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${displayScore}%` }}
        />
      </div>
    </div>
  )
}
