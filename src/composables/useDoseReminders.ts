import { watch } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { useChildrenStore } from '@/stores/children'
import { t } from '@/i18n'
import { createNotifyOnceTracker } from '@/lib/notifyOnce'
import { useNow } from './useNow'

// Foreground-only reminder: notifies while this tab/PWA is open and in
// memory. api/check-medication-courses.ts runs the same next-dose interval
// check server-side (polled every few minutes) so a closed app/PWA still
// gets a push — this one is what drives the in-app "next safe dose" banner
// while the app is actually open, which a push notification can't do.
const notifyOnce = createNotifyOnceTracker('ates-olcer:notified-doses')

export function useDoseReminders() {
  const store = useFeverLogStore()
  const medicationsStore = useMedicationsStore()
  const childrenStore = useChildrenStore()
  const now = useNow(15_000)

  async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!('Notification' in window)) return 'unsupported'
    if (Notification.permission === 'default') {
      return await Notification.requestPermission()
    }
    return Notification.permission
  }

  watch(now, (current) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const childName = childrenStore.children.find((c) => c.id === store.activeChildId)?.name
    if (!childName) return

    medicationsStore.medications.forEach((med) => {
      // A one-time alarm, independent of dose history/course dates — fires
      // exactly once (keyed by the alarm's own value, so editing it to a
      // new time naturally re-arms without needing any reset elsewhere).
      if (med.reminderAt && current >= med.reminderAt) {
        notifyOnce(
          `${med.id}:reminder:${med.reminderAt}`,
          t('notifications.reminderReady', { childName, name: med.name }),
        )
      }

      // A finished course (antibiotics being the classic case) shouldn't
      // keep nagging for "next safe dose" once it's over, even though the
      // interval math would otherwise happily produce one.
      if (med.courseEndAt && current > med.courseEndAt) return

      const last = store.lastDose(med.id)
      if (!last) {
        // No dose logged yet, so the interval-based reminder below has
        // nothing to anchor on — it would never fire on its own. If a
        // course start time is set, prompt once per day from that moment
        // onward so the very first dose isn't the one that gets forgotten.
        if (med.courseStartAt && current >= med.courseStartAt) {
          const dayKey = new Date(current).toISOString().slice(0, 10)
          notifyOnce(
            `${med.id}:course-start:${dayKey}`,
            t('notifications.courseStartReady', { childName, name: med.name }),
          )
        }
        return
      }

      const safeAt = store.nextSafeDoseAt(med.id, med.minIntervalHours)
      if (!safeAt) return

      if (safeAt <= current) {
        notifyOnce(
          `${med.id}:${last.id}`,
          t('notifications.doseReady', { childName, name: med.name }),
        )
      }
    })
  })

  return { requestPermission }
}
