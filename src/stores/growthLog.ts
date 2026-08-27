import { defineStore } from 'pinia'
import { addDoc, collection, deleteDoc, doc, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import type { GrowthEntry } from '@/types/health'

function growthCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'growth')
}

export const useGrowthLogStore = defineStore('growthLog', () => {
  const {
    items: entries,
    activeChildId,
    incoming: incomingEntries,
    lastRemote: lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
    requireContext,
    creatorFields,
  } = useWatermarkedFeed<GrowthEntry>({
    storageKeyPrefix: 'ates-olcer:last-seen-growth',
    buildQuery: (familyId, childId) =>
      query(growthCollection(familyId, childId), orderBy('takenAt', 'desc')),
    mapDoc: (id, data) =>
      ({ ...data, id, takenAt: (data.takenAt as Timestamp).toMillis() }) as GrowthEntry,
    sortKey: (entry) => entry.takenAt,
  })

  async function addGrowthEntry(heightCm?: number, weightKg?: number, takenAt?: Date) {
    const { familyId, childId } = requireContext()
    const payload: Omit<GrowthEntry, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      takenAt: takenAt ? Timestamp.fromDate(takenAt) : Timestamp.now(),
      ...(heightCm ? { heightCm } : {}),
      ...(weightKg ? { weightKg } : {}),
      ...creatorFields(),
    }
    await addDoc(growthCollection(familyId, childId), payload)
  }

  async function removeEntry(id: string) {
    const { familyId, childId } = requireContext()
    await deleteDoc(doc(growthCollection(familyId, childId), id))
  }

  return {
    entries,
    activeChildId,
    incomingEntries,
    lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
    addGrowthEntry,
    removeEntry,
  }
})
