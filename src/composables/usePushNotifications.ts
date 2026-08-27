import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getMessaging, getToken, isSupported } from 'firebase/messaging'
import { firebaseApp, db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'

const PUSH_SCOPE = '/firebase-cloud-messaging-push-scope'

// register() can resolve while the worker is still installing/waiting —
// getToken()'s PushManager.subscribe() needs it to actually be *active*,
// or it fails with "no active Service Worker".
function waitForActive(
  registration: ServiceWorkerRegistration,
): Promise<ServiceWorkerRegistration> {
  if (registration.active) return Promise.resolve(registration)
  const worker = registration.installing ?? registration.waiting
  if (!worker) return Promise.resolve(registration)
  return new Promise((resolve) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') resolve(registration)
    })
  })
}

// Registered at a scope distinct from vite-plugin-pwa's own service worker
// (which handles offline caching) so the two coexist instead of one
// clobbering the other's control of the page.
async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration(PUSH_SCOPE)
  const registration =
    existing ??
    (await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: PUSH_SCOPE }))
  return waitForActive(registration)
}

// Called after notification permission is already granted (see
// useDoseReminders' requestPermission, used from HomeView) — this is the
// second half: turning that permission into an actual device token other
// family members' devices can be pushed to, even while this device's app
// is closed.
export async function registerDeviceForPush(): Promise<void> {
  if (Notification.permission !== 'granted') return
  if (!(await isSupported())) return

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
  if (!vapidKey) return

  const authStore = useAuthStore()
  if (!authStore.user) return

  try {
    const registration = await registerPushServiceWorker()
    const messaging = getMessaging(firebaseApp)
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
    if (!token) return

    // Doc ID = the token itself, so re-registering the same device is a
    // no-op rather than an ever-growing pile of stale tokens.
    await setDoc(doc(db, 'users', authStore.user.uid, 'deviceTokens', token), {
      createdAt: serverTimestamp(),
    })
  } catch (err) {
    // Push is a nice-to-have layered on top of the in-app/foreground
    // notification path, which already works without this — swallow
    // failures (permission quirks, unsupported browser, etc.) rather than
    // surfacing an error for a background enhancement.
    console.error('Push registration failed', err)
  }
}
