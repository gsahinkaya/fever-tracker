import { watch } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useGrowthLogStore } from '@/stores/growthLog'
import { showSystemNotification } from '@/lib/systemNotification'
import {
  describeEntry,
  describeFeeding,
  describeGrowth,
  describeMedication,
} from '@/lib/describeActivity'

// Watches for activity the other parent adds — new fever readings, doses
// given, or new medications — and raises a system notification for each one.
// Foreground/background-tab only — the app must be running (open or
// installed PWA in the background).
export function useEntryNotifications() {
  const feverLogStore = useFeverLogStore()
  const medicationsStore = useMedicationsStore()
  const feedingLogStore = useFeedingLogStore()
  const growthLogStore = useGrowthLogStore()

  watch(
    () => feverLogStore.lastRemoteEntry,
    (entry) => {
      if (entry) void showSystemNotification(describeEntry(entry), '', `entry-${entry.id}`)
    },
  )

  watch(
    () => medicationsStore.lastRemoteMedication,
    (medication) => {
      if (medication) {
        void showSystemNotification(
          describeMedication(medication),
          '',
          `medication-${medication.id}`,
        )
      }
    },
  )

  watch(
    () => feedingLogStore.lastRemoteEntry,
    (entry) => {
      if (entry) void showSystemNotification(describeFeeding(entry), '', `feeding-${entry.id}`)
    },
  )

  watch(
    () => growthLogStore.lastRemoteEntry,
    (entry) => {
      if (entry) void showSystemNotification(describeGrowth(entry), '', `growth-${entry.id}`)
    },
  )
}
