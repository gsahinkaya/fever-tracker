// For backdating an entry (e.g. "this dose was actually given an hour ago").
// A plain HH:mm time field is enough for the common case — correcting
// something from earlier today — without the extra complexity of a full
// date+time picker for the rare cross-midnight case.
export function currentTimeString(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function todayAt(timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number)
  const date = new Date()
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0)
  return date
}
