import { t } from '@/i18n'

export type CalendarRepeat = 'weekly' | 'monthly'

function toDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// The event's stored `date` is the first/anchor occurrence, never advanced
// or rewritten once it passes — this computes the next occurrence on/after
// `from` (a YYYY-MM-DD string, normally today) purely for display and for
// the upcoming/past split, the same "compute on read" approach already used
// for vaccination due dates and the medication next-dose check rather than
// mutating stored data. A non-recurring event just returns its own date.
export function nextOccurrence(
  anchorDate: string,
  repeat: CalendarRepeat | undefined,
  from: string,
): string {
  if (!repeat || anchorDate >= from) return anchorDate

  const anchor = new Date(`${anchorDate}T00:00:00`)
  const target = new Date(`${from}T00:00:00`)

  if (repeat === 'weekly') {
    const diffDays = Math.round((target.getTime() - anchor.getTime()) / 86_400_000)
    const daysToAdd = (7 - (diffDays % 7)) % 7
    return toDateString(new Date(target.getTime() + daysToAdd * 86_400_000))
  }

  // Monthly: same day-of-month as the anchor, rolled forward to the first
  // month on/after `from` that actually has that day (a Jan 31 anchor just
  // skips February rather than sliding to March 3rd).
  const day = anchor.getDate()
  let year = target.getFullYear()
  let month = target.getMonth()
  for (let i = 0; i < 24; i++) {
    const candidate = new Date(year, month, day)
    const candidateStr = toDateString(candidate)
    if (candidate.getMonth() === month && candidateStr >= from) return candidateStr
    month++
    if (month > 11) {
      month = 0
      year++
    }
  }
  return anchorDate
}

export function repeatLabel(repeat: CalendarRepeat | undefined): string | null {
  if (!repeat) return null
  return t(`calendar.repeat.${repeat}Chip`)
}
