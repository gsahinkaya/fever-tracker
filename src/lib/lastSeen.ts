// Persists "when did I last check this child's activity" per device, so the
// other parent's readings/doses/medications still show up as unseen after
// reopening the app — not just the ones that happened while a listener
// already had the app open live.
export function loadLastSeen(storageKey: string): number {
  const stored = localStorage.getItem(storageKey)
  if (stored) return Number(stored)
  // First time this device has ever watched this child: nothing existing
  // counts as unseen, but establish a real baseline now so a *future*
  // session (even one that never explicitly acknowledges anything) can
  // still catch up on what happened since this moment.
  const now = Date.now()
  localStorage.setItem(storageKey, String(now))
  return now
}

export function saveLastSeen(storageKey: string, timestamp: number) {
  localStorage.setItem(storageKey, String(timestamp))
}
