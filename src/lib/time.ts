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

// The add-dialogs default their time field to currentTimeString() and only
// resolve through todayAt(), which truncates to the minute — fine for a
// deliberate backdate, but for the common "log it now" case (field left
// untouched) it throws away seconds/ms. That's enough to invert ordering
// against another device's precise last-seen watermark when two people act
// within the same clock-minute, silently swallowing a cross-parent
// notification, and can also collapse same-minute entries onto one
// timestamp. Only truncate when the user actually edited the field away
// from "now"; otherwise use a precise timestamp.
export function resolveTakenAt(timeString: string): Date {
  return timeString === currentTimeString() ? new Date() : todayAt(timeString)
}
