import { defineStore } from 'pinia'
import { collection, orderBy, query } from 'firebase/firestore'
import { db } from '@/firebase'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import type { FeedingReminderEntry } from '@/types/health'

function feedingRemindersCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'feedingReminders')
}

// Read-only from the client's side — every document here is created by
// api/check-feeding-reminders.ts (the server), this store only exists to
// surface that same event in the in-app bell/banner. Mirrors
// stores/medicationAlerts.ts exactly.
export const useFeedingRemindersStore = defineStore('feedingReminders', () => {
  const {
    items: entries,
    activeChildId,
    incoming: incomingEntries,
    allRemote: allRemoteEntries,
    lastRemote: lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
  } = useWatermarkedFeed<FeedingReminderEntry>({
    storageKeyPrefix: 'ates-olcer:last-seen-feeding-reminders',
    buildQuery: (familyId, childId) =>
      query(feedingRemindersCollection(familyId, childId), orderBy('takenAt', 'desc')),
    mapDoc: (id, data) =>
      ({ ...data, id, takenAt: data.takenAt as number }) as FeedingReminderEntry,
    sortKey: (entry) => entry.takenAt,
  })

  return {
    entries,
    activeChildId,
    incomingEntries,
    allRemoteEntries,
    lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
  }
})
