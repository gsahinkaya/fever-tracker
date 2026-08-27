import { defineStore } from 'pinia'
import { addDoc, collection, deleteDoc, doc, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import { currentWhoLabel, messageForGrowth } from '@/lib/describeActivity'
import { notifyFamily } from '@/lib/notifyFamily'
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

  async function addGrowthEntry(
    heightCm?: number,
    weightKg?: number,
    takenAt?: Date,
    headCircumferenceCm?: number,
  ) {
    const { familyId, childId } = requireContext()
    const payload: Omit<GrowthEntry, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      takenAt: takenAt ? Timestamp.fromDate(takenAt) : Timestamp.now(),
      ...(heightCm ? { heightCm } : {}),
      ...(weightKg ? { weightKg } : {}),
      ...(headCircumferenceCm ? { headCircumferenceCm } : {}),
      ...creatorFields(),
    }
    await addDoc(growthCollection(familyId, childId), payload)
    void notifyFamily(messageForGrowth(currentWhoLabel(), heightCm, weightKg), 'entry-push')
  }

  async function removeEntry(id: string) {
    const { familyId, childId } = requireContext()
    await deleteDoc(doc(growthCollection(familyId, childId), id))
  }

  // Used only when a brand-new child is created with height/weight/head
  // circumference already filled in on the profile form — seeds a first
  // Growth reading so the charts have a starting point without the parent
  // re-entering the same numbers there. Takes familyId/childId directly
  // (not requireContext/activeChildId) since a just-created child isn't
  // necessarily the active one yet.
  async function seedInitialEntry(
    familyId: string,
    childId: string,
    heightCm?: number,
    weightKg?: number,
    headCircumferenceCm?: number,
  ) {
    const payload: Omit<GrowthEntry, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      takenAt: Timestamp.now(),
      ...(heightCm ? { heightCm } : {}),
      ...(weightKg ? { weightKg } : {}),
      ...(headCircumferenceCm ? { headCircumferenceCm } : {}),
      ...creatorFields(),
    }
    await addDoc(growthCollection(familyId, childId), payload)
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
    seedInitialEntry,
  }
})
