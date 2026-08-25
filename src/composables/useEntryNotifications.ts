import { watch } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import type { LogEntry } from '@/types/health'

function describeEntry(entry: LogEntry): string {
  const who = entry.createdByEmail?.split('@')[0] ?? 'Diğer ebeveyn'
  const what =
    entry.type === 'reading'
      ? `${entry.temperature}° ölçüm ekledi`
      : `${entry.medicationName} verdi`
  return `${who} ${what}`
}

// Android Chrome throws on `new Notification()` and requires going through a
// service worker; desktop browsers support both. Prefer the SW registration
// when one exists (always true in the installed PWA) and fall back otherwise
// so this still works in plain browser tabs and in dev (no SW registered).
async function showSystemNotification(entry: LogEntry) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const title = 'Ateş Ölçer'
  const options: NotificationOptions = {
    body: describeEntry(entry),
    icon: '/icon-192.png',
    tag: `entry-${entry.id}`,
  }

  const registration =
    'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  if (registration) {
    await registration.showNotification(title, options)
  } else {
    new Notification(title, options)
  }
}

// Watches for entries the other parent adds (new fever readings or doses)
// and raises a system notification for each one. Foreground/background-tab
// only — the app must be running (open or installed PWA in the background).
export function useEntryNotifications() {
  const store = useFeverLogStore()

  watch(
    () => store.lastRemoteEntry,
    (entry) => {
      if (entry) void showSystemNotification(entry)
    },
  )
}
