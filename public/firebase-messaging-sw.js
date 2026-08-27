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
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? 'Kido'
  const body = payload.notification?.body ?? ''
  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    tag: payload.data?.tag,
  })
})
