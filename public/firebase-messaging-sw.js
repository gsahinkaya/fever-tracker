// Registered at a dedicated scope (see src/composables/usePushNotifications.ts)
// so it coexists with vite-plugin-pwa's own auto-generated service worker
// instead of fighting it for control of the page. Firebase's web config
// values aren't secret (they already ship in the client bundle) so it's
// fine to hardcode them here — a plain static file can't read Vite env vars.
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBQAXJwTNDd981kV8zLx1QqpS-BzGjJmaY',
  authDomain: 'fever-tracker-360af.firebaseapp.com',
  projectId: 'fever-tracker-360af',
  storageBucket: 'fever-tracker-360af.firebasestorage.app',
  messagingSenderId: '1048644595682',
  appId: '1:1048644595682:web:4be74e66fccb0ae9fc53bb',
})

const messaging = firebase.messaging()

// Foreground messages are handled in-app (useEntryNotifications already
// shows a Notification via the active tab); this only fires for background/
// closed-app pushes, which is the whole reason this file exists.
//
// The server sends data-only messages (no top-level `notification` field)
// on purpose: a message that carries one gets auto-displayed by the browser
// AND shown again here by onBackgroundMessage, so the same push lands twice
// in the tray. Reading everything from `data` keeps this the only place a
// notification gets shown.
messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title ?? 'Alfred'
  const body = payload.data?.body ?? ''
  // Presence of medId means check-medication-courses.ts flagged this as a
  // "give a dose now" moment (a reminder or the next-dose nudge, never
  // courseEnd) — add a one-tap action that deep-links straight into
  // /hizli-doz (src/views/QuickDoseView.vue) instead of making the parent
  // open the app and find the button themselves.
  const medId = payload.data?.medId
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    tag: payload.data?.tag,
    data: {
      link: payload.data?.link ?? '/',
      childId: payload.data?.childId,
      medId,
      medName: payload.data?.medName,
    },
    actions: medId ? [{ action: 'dose-given', title: 'Verildi' }] : [],
  })
})

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {}
  event.notification.close()

  let link = data.link || '/'
  if (event.action === 'dose-given' && data.medId) {
    const params = new URLSearchParams({ medId: data.medId })
    if (data.childId) params.set('childId', data.childId)
    if (data.medName) params.set('medName', data.medName)
    link = `/hizli-doz?${params.toString()}`
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) client.navigate(link).catch(() => {})
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link)
    }),
  )
})
