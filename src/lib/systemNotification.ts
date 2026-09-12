import { PUSH_SCOPE } from '@/composables/usePushNotifications'

// Android Chrome throws on `new Notification()` and requires going through a
// service worker; desktop browsers support both. Prefer a SW registration
// when one exists and fall back otherwise so this still works in plain
// browser tabs and in dev (no SW registered).
//
// Specifically the *push-scoped* registration (firebase-messaging-sw.js, not
// vite-plugin-pwa's own one at '/'): the same activity/reminder this shows
// for can also arrive as a server-sent FCM push through that exact
// registration, and a device with the app merely open in the background —
// not fully closed — can get both. Showing this one through the identical
// registration+tag lets the platform's own same-tag "replace, don't add"
// behavior collapse the pair into one, however they interleave, instead of
// leaving two cards in the tray.
export async function showSystemNotification(title: string, body: string, tag: string) {
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
