import { auth } from '@/firebase'
import { useAuthStore } from '@/stores/auth'

// Fired right after a successful write, to push the same activity message to
// every other family member's device via FCM — reaches a closed app, which
// the foreground-only OS Notification in useEntryNotifications can't. Both
// paths can fire for the same entry when a device has the app open with push
// registered (the live Firestore listener beats the server round-trip, then
// the push arrives and — same tag — replaces it instead of adding a second
// one), so their tags are kept in sync; see the tag argument at each call
// site.
//
// No separate `title` is used for the common "who did X" case: the message
// itself becomes the title and the body is left empty, since a generic
// "Alfred" title only duplicates what the notification's own icon already
// says. `title` stays available for callers (e.g. the emergency alert) that
// have a genuinely distinct heading and want both lines populated.
//
// `link` is where firebase-messaging-sw.js's notificationclick handler
// sends the parent when they tap this on a lock screen/notification tray —
// matches the route App.vue's bell uses for the same kind of entry
// (notificationSources), so tapping the same activity notification lands
// on the same screen whether the app was open or closed. Defaults to home
// for anything that doesn't have a more specific screen (or wasn't updated
// to pass one).
// Best-effort: a failure here should never block or surface an error for the
// write that already succeeded.
export async function notifyFamily(
  message: string,
  tag: string,
  title?: string,
  link?: string,
): Promise<void> {
  const authStore = useAuthStore()
  const familyId = authStore.familyId
  if (!familyId) return

  let idToken: string | undefined
  try {
    idToken = await auth.currentUser?.getIdToken()
  } catch (err) {
    console.error('notifyFamily failed', err)
    return
  }
  if (!idToken) return
  const payload = JSON.stringify({
    familyId,
    title: title ?? message,
    body: title ? message : '',
    tag,
    link: link ?? '/',
  })

  // One retry after a transient failure (a flaky mobile connection at the
  // exact moment of the write is common — this is often fired right after
  // a parent hits "save" on spotty wifi/cellular). Safe to retry blindly:
  // the receiving side dedupes on `tag`, so a first attempt that actually
  // landed just gets silently replaced by an identical second one.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('/api/notify-family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: payload,
      })
      if (res.ok) return
      console.error('notifyFamily failed', res.status, await res.text().catch(() => ''))
    } catch (err) {
      console.error('notifyFamily failed', err)
    }
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 1500))
  }
}
