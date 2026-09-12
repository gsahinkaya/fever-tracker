import { showSystemNotification } from './systemNotification'

// Shared by every foreground interval/one-time reminder (useDoseReminders,
// useFeedingReminders): "if due and not already shown for this exact key,
// show it once." Persisted to localStorage (not just an in-memory Set)
// because a moment that's still due doesn't stop being due just because the
// tab reloaded — without this, reopening the app (or a background tab
// getting suspended and restored) re-ran the whole in-memory history from
// empty and re-fired every already-shown reminder that was still overdue.
// Capped since a long-lived install would otherwise grow this forever.
const MAX_NOTIFIED_KEYS = 200

export function createNotifyOnceTracker(storageKey: string) {
  function load(): Set<string> {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) return new Set(JSON.parse(stored) as string[])
    } catch {
      // Corrupt/unavailable storage — fall through to an empty set rather
      // than blocking reminders entirely.
    }
    return new Set()
  }

  const notifiedFor = load()

  function save() {
    const keys = [...notifiedFor].slice(-MAX_NOTIFIED_KEYS)
    try {
      localStorage.setItem(storageKey, JSON.stringify(keys))
    } catch {
      // Storage full/unavailable — the in-memory Set still dedupes for the
      // rest of this session, it just won't survive a reload.
    }
  }

  return function notifyOnce(key: string, message: string) {
    if (notifiedFor.has(key)) return
    notifiedFor.add(key)
    save()
    void showSystemNotification(message, '', key)
  }
}
