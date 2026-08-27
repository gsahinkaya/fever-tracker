import type { LmsRow } from '@/data/whoGrowthStandards'

// Linear interpolation between the two whole-month WHO rows straddling the
// child's exact age (WHO only publishes one row per whole month).
function lmsForAgeMonths(table: LmsRow[], ageMonths: number): LmsRow {
  const clamped = Math.max(0, Math.min(table.length - 1, ageMonths))
  const lowIndex = Math.floor(clamped)
  const highIndex = Math.min(table.length - 1, Math.ceil(clamped))
  const low = table[lowIndex]!
  if (lowIndex === highIndex) return low
  const high = table[highIndex]!
  const frac = clamped - lowIndex
  return {
    L: low.L + (high.L - low.L) * frac,
    M: low.M + (high.M - low.M) * frac,
    S: low.S + (high.S - low.S) * frac,
  }
}

// WHO's LMS method: converts a raw measurement into a z-score relative to
// the reference population at that exact age.
function zScoreForValue(value: number, lms: LmsRow): number {
  const { L, M, S } = lms
  if (Math.abs(L) < 1e-9) return Math.log(value / M) / S
  return (Math.pow(value / M, L) - 1) / (L * S)
}

// Inverse of the above — the measurement value at a given z-score, used to
// draw the reference percentile curves themselves.
function valueForZScore(z: number, lms: LmsRow): number {
  const { L, M, S } = lms
  if (Math.abs(L) < 1e-9) return M * Math.exp(S * z)
  return M * Math.pow(1 + L * S * z, 1 / L)
}

// Zelen & Severo approximation of the standard normal CDF — accurate to
// ~7.5e-8, more than enough for a rounded "X. persentil" display.
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp((-z * z) / 2)
  let prob =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  if (z > 0) prob = 1 - prob
  return prob
}

export function percentileForMeasurement(
  table: LmsRow[],
  ageMonths: number,
  value: number,
): number {
  const lms = lmsForAgeMonths(table, ageMonths)
  const z = zScoreForValue(value, lms)
  return Math.round(normalCdf(z) * 1000) / 10
}

// Standard reference lines shown on the chart, labeled by their
// (approximate) percentile — e.g. -2 SD ≈ 3rd percentile.
export const REFERENCE_CURVES = [
  { z: 2, label: '97' },
  { z: 1, label: '85' },
  { z: 0, label: '50' },
  { z: -1, label: '15' },
  { z: -2, label: '3' },
] as const

export function referenceCurvePoints(
  table: LmsRow[],
  z: number,
  maxAgeMonths: number,
): { ageMonths: number; value: number }[] {
  const points: { ageMonths: number; value: number }[] = []
  for (let m = 0; m <= maxAgeMonths; m++) {
    points.push({ ageMonths: m, value: valueForZScore(z, table[m]!) })
  }
  return points
}
