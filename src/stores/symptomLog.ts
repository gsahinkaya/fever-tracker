import { defineStore } from 'pinia'
import { addDoc, collection, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import { currentWhoLabel, messageForSymptom } from '@/lib/describeActivity'
import { notifyFamily } from '@/lib/notifyFamily'
import type { SymptomEntry, SymptomType } from '@/types/health'

function symptomsCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'symptoms')
}

export const useSymptomLogStore = defineStore('symptomLog', () => {
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
  } = useWatermarkedFeed<SymptomEntry>({
    storageKeyPrefix: 'ates-olcer:last-seen-symptoms',
    buildQuery: (familyId, childId) =>
      query(symptomsCollection(familyId, childId), orderBy('takenAt', 'desc')),
    mapDoc: (id, data) =>
      ({ ...data, id, takenAt: (data.takenAt as Timestamp).toMillis() }) as SymptomEntry,
    sortKey: (entry) => entry.takenAt,
    collection: symptomsCollection,
  })

  async function addSymptom(type: SymptomType, note?: string, takenAt?: Date) {
    const { familyId, childId } = requireContext()
    const payload: Omit<SymptomEntry, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      type,
      takenAt: takenAt ? Timestamp.fromDate(takenAt) : Timestamp.now(),
      ...(note ? { note } : {}),
      ...creatorFields(),
    }
    await addDoc(symptomsCollection(familyId, childId), payload)
    void notifyFamily(messageForSymptom(currentWhoLabel(), type), 'entry-push')
  }

  return {
    entries,
    activeChildId,
    incomingEntries,
    lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
    addSymptom,
    removeEntry,
    recentEntries,
  }
})
