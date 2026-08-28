import { defineStore } from 'pinia'
import { addDoc, collection, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import { currentWhoLabel, messageForDiaper } from '@/lib/describeActivity'
import { notifyFamily } from '@/lib/notifyFamily'
import type { DiaperEntry, DiaperType } from '@/types/health'

function diapersCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'diapers')
}

export const useDiaperLogStore = defineStore('diaperLog', () => {
  const {
    items: entries,
    activeChildId,
    incoming: incomingEntries,
    lastRemote: lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
    requireContext,
    creatorFields,
    recentEntries,
    removeEntry,
    clearAllEntries,
  } = useWatermarkedFeed<DiaperEntry>({
    storageKeyPrefix: 'ates-olcer:last-seen-diapers',
    buildQuery: (familyId, childId) =>
      query(diapersCollection(familyId, childId), orderBy('takenAt', 'desc')),
    mapDoc: (id, data) =>
      ({ ...data, id, takenAt: (data.takenAt as Timestamp).toMillis() }) as DiaperEntry,
    sortKey: (entry) => entry.takenAt,
    collection: diapersCollection,
  })

  async function addDiaper(type: DiaperType, note?: string, takenAt?: Date) {
    const { familyId, childId } = requireContext()
    const payload: Omit<DiaperEntry, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      type,
      takenAt: takenAt ? Timestamp.fromDate(takenAt) : Timestamp.now(),
      ...(note ? { note } : {}),
      ...creatorFields(),
    }
    await addDoc(diapersCollection(familyId, childId), payload)
    void notifyFamily(messageForDiaper(currentWhoLabel(), type), 'entry-push')
  }

  return {
    entries,
    activeChildId,
    incomingEntries,
    lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
    addDiaper,
    removeEntry,
    clearAllEntries,
    recentEntries,
  }
})
