import type { CalendarEvent } from '@/types/health'

// Builds a minimal single-event .ics file and hands it to the browser as a
// download — the only web-compatible way to get an event into the phone's
// own calendar app, since there's no browser API to write to it directly.
// iOS Safari opens a downloaded .ics straight into the "Add Event" sheet;
// Android routes it through whichever app is registered for the mime type
// (almost always Google Calendar).

function toIcsDate(dateStr: string): string {
  return dateStr.replace(/-/g, '')
}

// DTEND for an all-day VEVENT is exclusive, so it must be the day *after*
// the event for a correctly one-day-long block — computed via local
// midnight (not the UTC-shifting `new Date(dateStr)`) so this stays correct
// regardless of the viewer's timezone.
function dayAfter(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(y!, m! - 1, d! + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${next.getFullYear()}${pad(next.getMonth() + 1)}${pad(next.getDate())}`
}

// A floating (no trailing "Z", no TZID) local date-time — every consuming
// calendar app interprets it in whatever timezone the device is already
// in, which for the person opening a file they just downloaded onto their
// own phone is exactly the timezone the date/time was picked in.
function toIcsDateTime(dateStr: string, timeStr: string): string {
  return `${dateStr.replace(/-/g, '')}T${timeStr.replace(':', '')}00`
}

// One hour after the given date+time — a plausible default duration for an
// appointment when the event has no explicit end time of its own.
function oneHourLater(dateStr: string, timeStr: string): { date: string; time: string } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, min] = timeStr.split(':').map(Number)
  const end = new Date(y!, m! - 1, d!, h! + 1, min)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
    time: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
  }
}

function escapeIcsText(text: string): string {
  return text.replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n')
}

function nowStamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

export function downloadCalendarEventIcs(event: CalendarEvent) {
  const timedLines = event.time
    ? (() => {
        const end = oneHourLater(event.date, event.time!)
        return [
          `DTSTART:${toIcsDateTime(event.date, event.time!)}`,
          `DTEND:${toIcsDateTime(end.date, end.time)}`,
        ]
      })()
    : [
        `DTSTART;VALUE=DATE:${toIcsDate(event.date)}`,
        `DTEND;VALUE=DATE:${dayAfter(event.date)}`,
      ]

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Alfred//Calendar//TR',
    'BEGIN:VEVENT',
    `UID:${event.id}@alfred-app`,
    `DTSTAMP:${nowStamp()}`,
    ...timedLines,
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(event.note ? [`DESCRIPTION:${escapeIcsText(event.note)}`] : []),
    ...(event.repeat ? [`RRULE:FREQ=${event.repeat === 'weekly' ? 'WEEKLY' : 'MONTHLY'}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const safeTitle = event.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim()
  anchor.download = `${safeTitle || 'etkinlik'}.ics`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
