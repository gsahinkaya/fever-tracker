import { watch } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { t } from '@/i18n'
import { useNow } from './useNow'

// Foreground-only reminder: notifies while this tab/PWA is open and in memory.
// Real background/lock-screen alarms require a server-pushed notification
// (Firebase Cloud Messaging) — see NEXT-STEPS notes once Firebase is wired up.
const notifiedFor = new Set<string>()

// Every reminder kind below (one-time alarm, course start, next-dose) is the
// same shape: "if due and not already shown for this exact key, show it."
// `key` alone determines whether this fires again — callers key by
// whatever makes a moment unique (the alarm's own timestamp, a day string,
// the triggering dose's id), not by time, so this stays a pure "have I
// already told them about *this*" check.
function notifyOnce(key: string, body: string) {
  if (notifiedFor.has(key)) return
  notifiedFor.add(key)
  new Notification(t('common.appName'), { body, icon: '/icon-192.png', tag: key })
}

export function useDoseReminders() {
  const store = useFeverLogStore()
  const medicationsStore = useMedicationsStore()
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

    medicationsStore.medications.forEach((med) => {
      // A one-time alarm, independent of dose history/course dates — fires
      // exactly once (keyed by the alarm's own value, so editing it to a
      // new time naturally re-arms without needing any reset elsewhere).
      if (med.reminderAt && current >= med.reminderAt) {
        notifyOnce(
          `${med.id}:reminder:${med.reminderAt}`,
          t('notifications.reminderReady', { name: med.name }),
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
            t('notifications.courseStartReady', { name: med.name }),
          )
        }
        return
      }

      const safeAt = store.nextSafeDoseAt(med.id, med.minIntervalHours)
      if (!safeAt) return

      if (safeAt <= current) {
        notifyOnce(`${med.id}:${last.id}`, t('notifications.doseReady', { name: med.name }))
      }
    })
  })

  return { requestPermission }
}
