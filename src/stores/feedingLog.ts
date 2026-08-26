import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import type { BottleEntry, BreastfeedingEntry, FeedingEntry, SolidFoodEntry } from '@/types/health'

function feedingsCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'feedings')
}

export const useFeedingLogStore = defineStore('feedingLog', () => {
  const {
    items: entries,
    activeChildId,
    incoming: incomingEntries,
    lastRemote: lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
    requireContext,
    creatorFields,
  } = useWatermarkedFeed<FeedingEntry>({
    storageKeyPrefix: 'ates-olcer:last-seen-feedings',
    buildQuery: (familyId, childId) =>
      query(feedingsCollection(familyId, childId), orderBy('takenAt', 'desc')),
    mapDoc: (id, data) =>
      ({ ...data, id, takenAt: (data.takenAt as Timestamp).toMillis() }) as FeedingEntry,
    sortKey: (entry) => entry.takenAt,
  })

  async function addBreastfeeding(
    durationMinutes?: number,
    side?: BreastfeedingEntry['side'],
    takenAt?: Date,
  ) {
    const { familyId, childId } = requireContext()
    const payload: Omit<BreastfeedingEntry, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      type: 'breastfeeding',
      takenAt: takenAt ? Timestamp.fromDate(takenAt) : Timestamp.now(),
      ...(durationMinutes ? { durationMinutes } : {}),
      ...(side ? { side } : {}),
      ...creatorFields(),
    }
    await addDoc(feedingsCollection(familyId, childId), payload)
  }

  async function addBottle(amountMl: number, milkType: BottleEntry['milkType'], takenAt?: Date) {
    const { familyId, childId } = requireContext()
    const payload: Omit<BottleEntry, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      type: 'bottle',
      takenAt: takenAt ? Timestamp.fromDate(takenAt) : Timestamp.now(),
      amountMl,
      milkType,
      ...creatorFields(),
    }
    await addDoc(feedingsCollection(familyId, childId), payload)
  }

  async function addSolidFood(note?: string, takenAt?: Date) {
    const { familyId, childId } = requireContext()
    const payload: Omit<SolidFoodEntry, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      type: 'solid',
      takenAt: takenAt ? Timestamp.fromDate(takenAt) : Timestamp.now(),
      ...(note ? { note } : {}),
      ...creatorFields(),
    }
    await addDoc(feedingsCollection(familyId, childId), payload)
  }

  async function removeEntry(id: string) {
    const { familyId, childId } = requireContext()
    await deleteDoc(doc(feedingsCollection(familyId, childId), id))
  }

  async function clearAllEntries() {
    const { familyId, childId } = requireContext()
    const snapshot = await getDocs(feedingsCollection(familyId, childId))
    const batch = writeBatch(db)
    snapshot.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }

  function recentEntries(hours: number): FeedingEntry[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000
    return entries.value.filter((e) => e.takenAt >= cutoff)
  }

  return {
    entries,
    activeChildId,
    incomingEntries,
    lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
    addBreastfeeding,
    addBottle,
    addSolidFood,
    removeEntry,
    clearAllEntries,
    recentEntries,
  }
})
