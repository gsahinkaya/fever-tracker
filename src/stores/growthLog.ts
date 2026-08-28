import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore'
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

  // Called from the child profile form (both creating a new child and
  // editing an existing one) whenever height/weight/head-circumference was
  // entered there — but only actually writes a Growth entry if this child
  // has none yet. Once real Growth entries exist, the profile form is just
  // updating the child's own fields (see childrenStore.updateChild) and
  // must NOT keep minting new dated entries every time a parent tweaks a
  // number in Settings. Takes familyId/childId directly (not
  // requireContext/activeChildId) since the edited child isn't necessarily
  // the active one.
  async function seedInitialEntryIfNone(
    familyId: string,
    childId: string,
    heightCm?: number,
    weightKg?: number,
    headCircumferenceCm?: number,
  ) {
    const existing = await getDocs(query(growthCollection(familyId, childId), limit(1)))
    if (!existing.empty) return
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
    seedInitialEntryIfNone,
  }
})
