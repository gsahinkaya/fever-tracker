import { i18n } from '@/i18n'

// Every date/time formatting call in the app should go through this
// instead of hardcoding 'tr-TR', so switching the app language (see
// stores/locale.ts) also switches month names, weekday names, etc. — not
// just the UI copy read through t().
export function localeTag(): string {
  return i18n.global.locale.value === 'en' ? 'en-US' : 'tr-TR'
}

// The "when did this happen" label used across every log-style list
// (symptoms, sleep, diaper, feeding, growth, the combined timeline, the
// doctor report) — day/month as digits plus a 24h/12h time per locale.
export function shortDateTime(ts: number): string {
  return new Date(ts).toLocaleString(localeTag(), {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Same as shortDateTime but with a spelled-out month (e.g. "28 Ağu 14:30")
// — used where the date needs to read more like a sentence than a table
// column (medication course status, the add-dose course-mismatch warning).
export function mediumDateTime(ts: number): string {
  return new Date(ts).toLocaleString(localeTag(), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Date-only, locale default format — used for a plain "this box expires
// on" style date with no time component.
export function plainDate(ts: number | string): string {
  return new Date(ts).toLocaleDateString(localeTag())
}

// Formats a timestamp or Date into a local YYYY-MM-DD string for <input type="date">,
// computed from local date parts (not toISOString, which is UTC and can shift
// the day depending on the viewer's timezone).
export function toDateInputString(dateOrTs: number | Date): string {
  const d = typeof dateOrTs === 'number' ? new Date(dateOrTs) : dateOrTs
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Formats a timestamp or Date into a local YYYY-MM-DDTHH:mm string for
// <input type="datetime-local">, preserving the viewer's local time.
export function toDatetimeLocalString(dateOrTs: number | Date): string {
  const d = typeof dateOrTs === 'number' ? new Date(dateOrTs) : dateOrTs
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${toDateInputString(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Today as a YYYY-MM-DD string, computed from local date parts (matches the value
// a native <input type="date"> produces).
export function todayDateString(): string {
  return toDateInputString(new Date())
}
