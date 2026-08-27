import { watch } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useGrowthLogStore } from '@/stores/growthLog'
import { t } from '@/i18n'
import {
  describeEntry,
  describeFeeding,
  describeGrowth,
  describeMedication,
} from '@/lib/describeActivity'

// Android Chrome throws on `new Notification()` and requires going through a
// service worker; desktop browsers support both. Prefer the SW registration
// when one exists (always true in the installed PWA) and fall back otherwise
// so this still works in plain browser tabs and in dev (no SW registered).
async function showSystemNotification(title: string, body: string, tag: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const options: NotificationOptions = { body, icon: '/icon-192.png', tag }

  const registration =
    'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
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
  const feedingLogStore = useFeedingLogStore()
  const growthLogStore = useGrowthLogStore()

  watch(
    () => feverLogStore.lastRemoteEntry,
    (entry) => {
      if (entry)
        void showSystemNotification(t('common.appName'), describeEntry(entry), `entry-${entry.id}`)
    },
  )

  watch(
    () => medicationsStore.lastRemoteMedication,
    (medication) => {
      if (medication) {
        void showSystemNotification(
          t('common.appName'),
          describeMedication(medication),
          `medication-${medication.id}`,
        )
      }
    },
  )

  watch(
    () => feedingLogStore.lastRemoteEntry,
    (entry) => {
      if (entry)
        void showSystemNotification(
          t('common.appName'),
          describeFeeding(entry),
          `feeding-${entry.id}`,
        )
    },
  )

  watch(
    () => growthLogStore.lastRemoteEntry,
    (entry) => {
      if (entry)
        void showSystemNotification(
          t('common.appName'),
          describeGrowth(entry),
          `growth-${entry.id}`,
        )
    },
  )
}
