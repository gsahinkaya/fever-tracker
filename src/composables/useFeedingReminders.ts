import { watch } from 'vue'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useChildrenStore } from '@/stores/children'
import { t } from '@/i18n'
import { createNotifyOnceTracker } from '@/lib/notifyOnce'
import { useNow } from './useNow'

// Foreground counterpart to api/check-feeding-reminders.ts, the same split
// as useDoseReminders/check-medication-courses.ts: this drives the in-app
// reminder while the tab/PWA is open, the server-side poll is what reaches
// a closed one.
const notifyOnce = createNotifyOnceTracker('ates-olcer:notified-feedings')

export function useFeedingReminders() {
  const feedingStore = useFeedingLogStore()
  const childrenStore = useChildrenStore()
  const now = useNow(15_000)

  watch(now, (current) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const childId = feedingStore.activeChildId
    if (!childId) return
    const child = childrenStore.children.find((c) => c.id === childId)
    const intervalHours = child?.feedingReminderIntervalHours
    if (!intervalHours) return

    // Breastfeeding and bottle share one timer (a baby getting both doesn't
    // need two independent reminders) — solid food doesn't reset it, this
    // is about milk feeds specifically. `entries` is already ordered
    // newest-first (see feedingLog.ts's buildQuery), so the first match is
    // the last one that counts.
    const last = feedingStore.entries.find(
      (entry) => entry.type === 'breastfeeding' || entry.type === 'bottle',
    )
    if (!last) return

    const dueAt = last.takenAt + intervalHours * 60 * 60 * 1000
    if (dueAt > current) return

    notifyOnce(
      `feeding:${childId}:${last.id}`,
      t('notifications.feedingReminderReady', { name: child!.name }),
    )
  })
}
