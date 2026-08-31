import { defineStore } from 'pinia'
import { collection, orderBy, query } from 'firebase/firestore'
import { db } from '@/firebase'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import type { MedicationAlertEntry } from '@/types/health'

function medicationAlertsCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'medicationAlerts')
}

// Read-only from the client's side — every document here is created by
// api/check-medication-courses.ts (the server), this store only exists to
// surface that same event in the in-app bell/banner. See the comment on
// MedicationAlertEntry (types/health.ts) for why a server-created doc, not
// the notified-flag update, is what makes that possible.
export const useMedicationAlertsStore = defineStore('medicationAlerts', () => {
  const {
    items: entries,
    activeChildId,
    incoming: incomingEntries,
    lastRemote: lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
  } = useWatermarkedFeed<MedicationAlertEntry>({
    storageKeyPrefix: 'ates-olcer:last-seen-medication-alerts',
    buildQuery: (familyId, childId) =>
      query(medicationAlertsCollection(familyId, childId), orderBy('takenAt', 'desc')),
    // Written by the server as a plain millisecond number (Firestore's
    // integerValue over REST — see check-medication-courses.ts), the same
    // way courseStartAt/courseEndAt/reminderAt are, not a Timestamp — so
    // unlike every client-written entry type, this needs no .toMillis().
    mapDoc: (id, data) => ({ ...data, id, takenAt: data.takenAt as number }) as MedicationAlertEntry,
    sortKey: (entry) => entry.takenAt,
  })

  return {
    entries,
    activeChildId,
    incomingEntries,
    lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
  }
})
