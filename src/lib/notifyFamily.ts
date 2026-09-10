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
// Best-effort: a failure here should never block or surface an error for the
// write that already succeeded.
export async function notifyFamily(message: string, tag: string, title?: string): Promise<void> {
  const authStore = useAuthStore()
  const familyId = authStore.familyId
  if (!familyId) return

  try {
    const idToken = await auth.currentUser?.getIdToken()
    if (!idToken) return
    await fetch('/api/notify-family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({
        familyId,
        title: title ?? message,
        body: title ? message : '',
        tag,
      }),
    })
  } catch (err) {
    console.error('notifyFamily failed', err)
  }
}
