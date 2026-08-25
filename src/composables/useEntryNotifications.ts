import { watch } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import type { LogEntry, Medication } from '@/types/health'

function describeEntry(entry: LogEntry): string {
  const who = entry.createdByEmail?.split('@')[0] ?? 'Diğer ebeveyn'
  const what = entry.type === 'reading' ? `${entry.temperature}° ölçüm ekledi` : `${entry.medicationName} verdi`
  return `${who} ${what}`
}

function describeMedication(medication: Medication): string {
  const who = medication.createdByEmail?.split('@')[0] ?? 'Diğer ebeveyn'
  return `${who} ${medication.name} ilacını ekledi`
}

// Android Chrome throws on `new Notification()` and requires going through a
// service worker; desktop browsers support both. Prefer the SW registration
// when one exists (always true in the installed PWA) and fall back otherwise
// so this still works in plain browser tabs and in dev (no SW registered).
async function showSystemNotification(title: string, body: string, tag: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const options: NotificationOptions = { body, icon: '/icon-192.png', tag }

  const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
  if (registration) {
    await registration.showNotification(title, options)
  } else {
    new Notification(title, options)
  }
}

// Watches for activity the other parent adds — new fever readings, doses
// given, or new medications — and raises a system notification for each one.
// Foreground/background-tab only — the app must be running (open or
// installed PWA in the background).
export function useEntryNotifications() {
  const feverLogStore = useFeverLogStore()
  const medicationsStore = useMedicationsStore()

  watch(
    () => feverLogStore.lastRemoteEntry,
    (entry) => {
      if (entry) void showSystemNotification('Ateş Ölçer', describeEntry(entry), `entry-${entry.id}`)
    },
  )

  watch(
    () => medicationsStore.lastRemoteMedication,
    (medication) => {
      if (medication) {
        void showSystemNotification('Ateş Ölçer', describeMedication(medication), `medication-${medication.id}`)
      }
    },
  )
}
