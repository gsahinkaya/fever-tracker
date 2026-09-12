import { ref } from 'vue'

// Per-device only, like every other "last seen"/"already notified" watermark
// in this app (see useWatermarkedFeed, useDoseReminders) — dismissing a
// notification from the bell's history just declutters *this* device's
// list, it never touches the underlying entry (a fever reading, a dose,
// etc.), so nothing needs syncing across family members or Firestore rules.
const STORAGE_KEY = 'ates-olcer:dismissed-notifications'
const MAX_DISMISSED_KEYS = 500

function load(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as string[]
  } catch {
    // Corrupt/unavailable storage — start clean rather than blocking the
    // history list from rendering at all.
  }
  return []
}

// A ref (not a plain module-level Set) so App.vue's notificationHistoryItems
// computed — which calls isDismissed() per item — actually re-evaluates when
// a notification gets dismissed, instead of silently going stale.
const dismissed = ref(new Set(load()))

export function isDismissed(key: string): boolean {
  return dismissed.value.has(key)
}

export function dismissNotification(key: string) {
  const keys = [...dismissed.value, key].slice(-MAX_DISMISSED_KEYS)
  dismissed.value = new Set(keys)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    // Storage full/unavailable — the in-memory set still works for the rest
    // of this session, it just won't survive a reload.
  }
}
