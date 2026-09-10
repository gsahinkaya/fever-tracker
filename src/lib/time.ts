import { todayDateString } from './dateFormat'

// The add-dialogs default their time field to this and their date field to
// todayDateString() — used to detect the common "log it now" case (fields
// left untouched) in resolveTakenAtOn, as opposed to a deliberate backdate.
export function currentTimeString(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

// For the common "log it now" case (date/time fields left at their defaults)
// this returns a precise `new Date()` instead of resolving through the
// fields, which only carry minute precision. That precision matters: two
// truncated same-minute entries from different devices can otherwise invert
// ordering against another device's precise last-seen watermark, silently
// swallowing a cross-parent notification, or collapse onto one timestamp.
// Only once the user actually edits a field away from "now" do we resolve
// the picked date+time exactly (backdating an entry, e.g. "this dose was
// actually given yesterday evening").
export function resolveTakenAtOn(dateString: string, timeString: string): Date {
  if (dateString === todayDateString() && timeString === currentTimeString()) return new Date()
  const [year, month, day] = dateString.split('-').map(Number)
  const [hours, minutes] = timeString.split(':').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0, 0)
}
