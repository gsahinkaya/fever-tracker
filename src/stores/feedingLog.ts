import { defineStore } from 'pinia'
import { addDoc, collection, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import {
  currentWhoLabel,
  messageForBottle,
  messageForBreastfeeding,
  messageForSolidFood,
} from '@/lib/describeActivity'
import { notifyFamily } from '@/lib/notifyFamily'
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
    recentEntries,
    removeEntry,
    clearAllEntries,
  } = useWatermarkedFeed<FeedingEntry>({
    storageKeyPrefix: 'ates-olcer:last-seen-feedings',
    buildQuery: (familyId, childId) =>
      query(feedingsCollection(familyId, childId), orderBy('takenAt', 'desc')),
    mapDoc: (id, data) =>
      ({ ...data, id, takenAt: (data.takenAt as Timestamp).toMillis() }) as FeedingEntry,
    sortKey: (entry) => entry.takenAt,
    collection: feedingsCollection,
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
    void notifyFamily(messageForBreastfeeding(currentWhoLabel()), 'entry-push')
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
    void notifyFamily(messageForBottle(currentWhoLabel(), amountMl, milkType), 'entry-push')
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
    void notifyFamily(messageForSolidFood(currentWhoLabel()), 'entry-push')
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
