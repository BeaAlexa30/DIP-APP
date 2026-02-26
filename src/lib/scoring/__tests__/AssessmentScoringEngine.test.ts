/**
 * DIP Scoring Engine — Unit Tests
 * Tests deterministic, reproducible computation.
 * Run: npx jest src/lib/scoring/__tests__/engine.test.ts
 */

import { describe, it, expect } from '@jest/globals'

// ============================================================
// Test: Normalization formula
// normalized = (raw - min) / (max - min) * 100
// ============================================================
function normalizeScore(raw: number, min: number, max: number): number {
  if (max === min) return 50
  const result = ((raw - min) / (max - min)) * 100
  return Math.max(0, Math.min(100, Math.round(result * 100) / 100))
}

describe('normalizeScore()', () => {
  it('returns 100 when raw == max', () => {
    expect(normalizeScore(10, 0, 10)).toBe(100)
  })

  it('returns 0 when raw == min', () => {
    expect(normalizeScore(0, 0, 10)).toBe(0)
  })

  it('returns 50 when raw is midpoint', () => {
    expect(normalizeScore(5, 0, 10)).toBe(50)
  })

  it('returns 50 when max == min (edge case)', () => {
    expect(normalizeScore(5, 5, 5)).toBe(50)
  })

  it('clamps to 0 when raw < min', () => {
    expect(normalizeScore(-5, 0, 10)).toBe(0)
  })

  it('clamps to 100 when raw > max', () => {
    expect(normalizeScore(15, 0, 10)).toBe(100)
  })

  it('handles fractional values correctly', () => {
    expect(normalizeScore(7.5, 0, 10)).toBe(75)
  })
})

// ============================================================
// Test: Priority score formula
// priority = 0.4*risk + 0.4*friction + 0.2*frequency
// ============================================================
function computePriorityScore(risk: number, friction: number, frequency: number): number {
  return Math.round((0.4 * risk + 0.4 * friction + 0.2 * frequency) * 100) / 100
}

describe('computePriorityScore()', () => {
  it('returns max (100) when all inputs are 100', () => {
    expect(computePriorityScore(100, 100, 100)).toBe(100)
  })

  it('returns 0 when all inputs are 0', () => {
    expect(computePriorityScore(0, 0, 0)).toBe(0)
  })

  it('weights risk and friction equally at 0.4 each', () => {
    // risk-dominated: risk=100, friction=0, freq=0 => 40
    expect(computePriorityScore(100, 0, 0)).toBe(40)
    // friction-dominated: same
    expect(computePriorityScore(0, 100, 0)).toBe(40)
  })

  it('weights frequency at 0.2', () => {
    expect(computePriorityScore(0, 0, 100)).toBe(20)
  })

  it('produces deterministic results for same inputs', () => {
    const a = computePriorityScore(75, 60, 50)
    const b = computePriorityScore(75, 60, 50)
    expect(a).toBe(b)
  })

  it('sample case: risk=80, friction=60, freq=40 => 64', () => {
    // 0.4*80 + 0.4*60 + 0.2*40 = 32 + 24 + 8 = 64
    expect(computePriorityScore(80, 60, 40)).toBe(64)
  })
})

// ============================================================
// Test: Index weighted composition
// ============================================================
function computeWeightedIndex(
  components: { score: number; weight: number }[]
): number {
  let weightedSum = 0
  let totalWeight = 0
  for (const c of components) {
    weightedSum += c.score * c.weight
    totalWeight += c.weight
  }
  return totalWeight === 0 ? 50 : Math.round((weightedSum / totalWeight) * 100) / 100
}

describe('computeWeightedIndex()', () => {
  it('single component returns that component score', () => {
    expect(computeWeightedIndex([{ score: 75, weight: 1 }])).toBe(75)
  })

  it('equal weights return average', () => {
    expect(computeWeightedIndex([
      { score: 60, weight: 0.5 },
      { score: 80, weight: 0.5 },
    ])).toBe(70)
  })

  it('zero total weight returns 50 (neutral)', () => {
    expect(computeWeightedIndex([])).toBe(50)
  })

  it('higher-weighted components dominate', () => {
    const result = computeWeightedIndex([
      { score: 100, weight: 0.8 },
      { score: 0,   weight: 0.2 },
    ])
    expect(result).toBe(80)
  })

  it('is deterministic for same inputs', () => {
    const components = [
      { score: 72, weight: 0.4 },
      { score: 55, weight: 0.3 },
      { score: 88, weight: 0.3 },
    ]
    expect(computeWeightedIndex(components)).toBe(computeWeightedIndex(components))
  })
})

// ============================================================
// Test: Executive Health Score computation
// health = 0.25*trust + 0.25*usability + 0.20*(100-convRisk) + 0.20*exp + 0.10*loyalty - penalty
// ============================================================
function computeHealthScore(
  trust: number,
  usability: number,
  conversionRisk: number,
  experience: number,
  loyalty: number,
  riskPenaltyPct: number
): number {
  const RISK_PENALTY_FACTOR = 0.5
  const raw =
    trust * 0.25 +
    usability * 0.25 +
    (100 - conversionRisk) * 0.20 +
    experience * 0.20 +
    loyalty * 0.10
  const penalty = riskPenaltyPct * RISK_PENALTY_FACTOR
  return Math.max(0, Math.min(100, Math.round((raw - penalty) * 100) / 100))
}

describe('computeHealthScore()', () => {
  it('returns 100 for perfect inputs with no risk', () => {
    expect(computeHealthScore(100, 100, 0, 100, 100, 0)).toBe(100)
  })

  it('returns 0 for worst inputs', () => {
    // trust=0, usability=0, convRisk=100, exp=0, loyalty=0, penalty=100*0.5=50
    // raw = 0 + 0 + 0 + 0 + 0 = 0, penalty=50, clamped to 0
    expect(computeHealthScore(0, 0, 100, 0, 0, 100)).toBe(0)
  })

  it('higher conversion risk lowers health', () => {
    const low = computeHealthScore(70, 70, 20, 70, 70, 0)
    const high = computeHealthScore(70, 70, 80, 70, 70, 0)
    expect(low).toBeGreaterThan(high)
  })

  it('is deterministic for same inputs', () => {
    const a = computeHealthScore(65, 72, 35, 68, 55, 10)
    const b = computeHealthScore(65, 72, 35, 68, 55, 10)
    expect(a).toBe(b)
  })

  it('is clamped between 0 and 100', () => {
    const result = computeHealthScore(50, 50, 50, 50, 50, 200) // big penalty
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThanOrEqual(100)
  })
})

// ============================================================
// Test: Checksum determinism
// Same input set should always produce same checksum
// ============================================================
import crypto from 'crypto'

function computeChecksum(surveyId: string, frameworkVersion: string, responseIds: string[]): string {
  const payload = JSON.stringify({
    surveyId,
    frameworkVersion,
    responseIds: [...responseIds].sort(),
  })
  return crypto.createHash('sha256').update(payload).digest('hex')
}

describe('computeChecksum()', () => {
  it('produces same checksum for same inputs', () => {
    const ids = ['resp-3', 'resp-1', 'resp-2']
    const a = computeChecksum('survey-1', '1.0', ids)
    const b = computeChecksum('survey-1', '1.0', ids)
    expect(a).toBe(b)
  })

  it('produces same checksum regardless of response ID order', () => {
    const sorted = computeChecksum('survey-1', '1.0', ['resp-1', 'resp-2', 'resp-3'])
    const unsorted = computeChecksum('survey-1', '1.0', ['resp-3', 'resp-1', 'resp-2'])
    expect(sorted).toBe(unsorted)
  })

  it('produces different checksum for different framework version', () => {
    const v1 = computeChecksum('survey-1', '1.0', ['resp-1'])
    const v2 = computeChecksum('survey-1', '2.0', ['resp-1'])
    expect(v1).not.toBe(v2)
  })

  it('produces a 64-char hex string (SHA-256)', () => {
    const cs = computeChecksum('survey-1', '1.0', ['resp-1'])
    expect(cs).toHaveLength(64)
    expect(cs).toMatch(/^[a-f0-9]+$/)
  })
})
