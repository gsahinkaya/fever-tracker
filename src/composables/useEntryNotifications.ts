import { watch } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useGrowthLogStore } from '@/stores/growthLog'
import { PUSH_SCOPE } from '@/composables/usePushNotifications'
import {
  describeEntry,
  describeFeeding,
  describeGrowth,
  describeMedication,
} from '@/lib/describeActivity'

// Android Chrome throws on `new Notification()` and requires going through a
// service worker; desktop browsers support both. Prefer a SW registration
// when one exists and fall back otherwise so this still works in plain
// browser tabs and in dev (no SW registered).
//
// Specifically the *push-scoped* registration (firebase-messaging-sw.js, not
// vite-plugin-pwa's own one at '/'): this same activity also triggers a
// server-sent FCM push (see the notifyFamily calls in the stores below)
// shown through that exact registration, and a device with the app merely
// open in the background — not fully closed — gets both. Showing this one
// through the identical registration+tag lets the platform's own same-tag
// "replace, don't add" behavior collapse the pair into one, however they
// interleave, instead of leaving two cards in the tray.
async function showSystemNotification(title: string, body: string, tag: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const options: NotificationOptions = { body, icon: '/icon-192.png', tag }

  const registration =
    'serviceWorker' in navigator
      ? ((await navigator.serviceWorker.getRegistration(PUSH_SCOPE)) ??
        (await navigator.serviceWorker.getRegistration()))
      : undefined
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
      if (entry) void showSystemNotification(describeEntry(entry), '', `entry-${entry.id}`)
    },
  )

  watch(
    () => medicationsStore.lastRemoteMedication,
    (medication) => {
      if (medication) {
        void showSystemNotification(
          describeMedication(medication),
          '',
          `medication-${medication.id}`,
        )
      }
    },
  )

  watch(
    () => feedingLogStore.lastRemoteEntry,
    (entry) => {
      if (entry) void showSystemNotification(describeFeeding(entry), '', `feeding-${entry.id}`)
    },
  )

  watch(
    () => growthLogStore.lastRemoteEntry,
    (entry) => {
      if (entry) void showSystemNotification(describeGrowth(entry), '', `growth-${entry.id}`)
    },
  )
}
