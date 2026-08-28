import { defineStore } from 'pinia'
import { addDoc, collection, orderBy, query, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import { currentWhoLabel, messageForDose, messageForReading } from '@/lib/describeActivity'
import { notifyFamily } from '@/lib/notifyFamily'
import type { LogEntry, FeverReading, DoseEntry } from '@/types/health'

function entriesCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'entries')
}

export const useFeverLogStore = defineStore('feverLog', () => {
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
  } = useWatermarkedFeed<LogEntry>({
    storageKeyPrefix: 'ates-olcer:last-seen-entries',
    buildQuery: (familyId, childId) =>
      query(entriesCollection(familyId, childId), orderBy('takenAt', 'desc')),
    mapDoc: (id, data) =>
      ({ ...data, id, takenAt: (data.takenAt as Timestamp).toMillis() }) as LogEntry,
    sortKey: (entry) => entry.takenAt,
    collection: entriesCollection,
  })

  async function addReading(temperature: number, note?: string, takenAt?: Date) {
    const { familyId, childId } = requireContext()
    const payload: Omit<FeverReading, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      type: 'reading',
      temperature,
      takenAt: takenAt ? Timestamp.fromDate(takenAt) : Timestamp.now(),
      ...(note ? { note } : {}),
      ...creatorFields(),
    }
    await addDoc(entriesCollection(familyId, childId), payload)
    void notifyFamily(messageForReading(currentWhoLabel(), temperature), 'entry-push')
  }

  async function addDose(medicationId: string, medicationName: string, takenAt?: Date) {
    const { familyId, childId } = requireContext()
    const payload: Omit<DoseEntry, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      type: 'dose',
      medicationId,
      medicationName,
      takenAt: takenAt ? Timestamp.fromDate(takenAt) : Timestamp.now(),
      ...creatorFields(),
    }
    await addDoc(entriesCollection(familyId, childId), payload)
    void notifyFamily(messageForDose(currentWhoLabel(), medicationName), 'entry-push')
  }

  function lastDose(medicationId: string): DoseEntry | undefined {
    return entries.value.find(
      (e): e is DoseEntry => e.type === 'dose' && e.medicationId === medicationId,
    )
  }

  function nextSafeDoseAt(medicationId: string, minIntervalHours: number): number | null {
    const last = lastDose(medicationId)
    if (!last) return null
    return last.takenAt + minIntervalHours * 60 * 60 * 1000
  }

  return {
    entries,
    activeChildId,
    incomingEntries,
    lastRemoteEntry,
    watchChild,
    acknowledgeIncoming,
    addReading,
    addDose,
    removeEntry,
    clearAllEntries,
    lastDose,
    nextSafeDoseAt,
    recentEntries,
  }
})
