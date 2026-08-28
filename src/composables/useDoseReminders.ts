import { watch } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { t } from '@/i18n'
import { useNow } from './useNow'

// Foreground-only reminder: notifies while this tab/PWA is open and in memory.
// Real background/lock-screen alarms require a server-pushed notification
// (Firebase Cloud Messaging) — see NEXT-STEPS notes once Firebase is wired up.
const notifiedFor = new Set<string>()

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
      // A finished course (antibiotics being the classic case) shouldn't
      // keep nagging for "next safe dose" once it's over, even though the
      // interval math would otherwise happily produce one.
      if (med.courseEndDate && current > new Date(med.courseEndDate).getTime() + 86_400_000) return

      const last = store.lastDose(med.id)
      if (!last) {
        // No dose logged yet, so the interval-based reminder below has
        // nothing to anchor on — it would never fire on its own. If a
        // course start date is set, prompt once per day from that date
        // onward so the very first dose isn't the one that gets forgotten.
        if (med.courseStartDate) {
          const startAt = new Date(med.courseStartDate).getTime()
          const dayKey = new Date(current).toISOString().slice(0, 10)
          const key = `${med.id}:course-start:${dayKey}`
          if (current >= startAt && !notifiedFor.has(key)) {
            notifiedFor.add(key)
            new Notification(t('common.appName'), {
              body: t('notifications.courseStartReady', { name: med.name }),
              icon: '/icon-192.png',
              tag: key,
            })
          }
        }
        return
      }

      const safeAt = store.nextSafeDoseAt(med.id, med.minIntervalHours)
      if (!safeAt) return

      const key = `${med.id}:${last.id}`
      if (safeAt <= current && !notifiedFor.has(key)) {
        notifiedFor.add(key)
        new Notification(t('common.appName'), {
          body: t('notifications.doseReady', { name: med.name }),
          icon: '/icon-192.png',
          tag: key,
        })
      }
    })
  })

  return { requestPermission }
}
