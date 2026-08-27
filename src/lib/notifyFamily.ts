import { auth } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { t } from '@/i18n'

// Fired right after a successful write, to push the same activity message
// to every other family member's *closed* app via FCM — the foreground-only
// OS Notification in useEntryNotifications can't reach a device that isn't
// open. Best-effort: a failure here should never block or surface an error
// for the write that already succeeded.
export async function notifyFamily(body: string, tag: string): Promise<void> {
  const authStore = useAuthStore()
  const familyId = authStore.familyId
  if (!familyId) return

  try {
    const idToken = await auth.currentUser?.getIdToken()
    if (!idToken) return
    await fetch('/api/notify-family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ familyId, title: t('common.appName'), body, tag }),
    })
  } catch (err) {
    console.error('notifyFamily failed', err)
  }
}
