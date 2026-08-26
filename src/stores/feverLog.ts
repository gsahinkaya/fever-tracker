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
  } = useWatermarkedFeed<LogEntry>({
    storageKeyPrefix: 'ates-olcer:last-seen-entries',
    buildQuery: (familyId, childId) =>
      query(entriesCollection(familyId, childId), orderBy('takenAt', 'desc')),
    mapDoc: (id, data) =>
      ({ ...data, id, takenAt: (data.takenAt as Timestamp).toMillis() }) as LogEntry,
    sortKey: (entry) => entry.takenAt,
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
  }

  async function removeEntry(id: string) {
    const { familyId, childId } = requireContext()
    await deleteDoc(doc(entriesCollection(familyId, childId), id))
  }

  async function clearAllEntries() {
    const { familyId, childId } = requireContext()
    const snapshot = await getDocs(entriesCollection(familyId, childId))
    const batch = writeBatch(db)
    snapshot.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
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

  function recentEntries(hours: number): LogEntry[] {
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
    addReading,
    addDose,
    removeEntry,
    clearAllEntries,
    lastDose,
    nextSafeDoseAt,
    recentEntries,
  }
})
