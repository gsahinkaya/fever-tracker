import { watch } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
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
      const last = store.lastDose(med.id)
      const safeAt = store.nextSafeDoseAt(med.id, med.minIntervalHours)
      if (!last || !safeAt) return

      const key = `${med.id}:${last.id}`
      if (safeAt <= current && !notifiedFor.has(key)) {
        notifiedFor.add(key)
        new Notification('Ateş Ölçer', {
          body: `${med.name} için güvenli doz zamanı geldi.`,
          icon: '/icon-192.png',
          tag: key,
        })
      }
    })
  })

  return { requestPermission }
}
