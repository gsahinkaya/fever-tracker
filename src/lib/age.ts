import { t } from '@/i18n'

// Average days per month (365.2425/12) — used wherever an age needs to be a
// continuous number (WHO percentile lookups, fever triage thresholds, an
// entry's age-at-the-time for a growth chart's x-axis) rather than the
// whole-calendar-months ageLabel below produces for display text.
const MS_PER_MONTH = 30.436875 * 86_400_000

export function ageInMonths(birthDate: string, atMillis: number = Date.now()): number {
  return (atMillis - new Date(birthDate).getTime()) / MS_PER_MONTH
}

export function ageLabel(birthDate?: string): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const now = new Date()
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months--
  if (months < 24) return t('age.monthsOld', { n: Math.max(months, 0) })
  return t('age.yearsOld', { n: Math.floor(months / 12) })
}
