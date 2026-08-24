import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import type { LogEntry, FeverReading, DoseEntry } from '@/types/health'

function entriesCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'entries')
}

export const useFeverLogStore = defineStore('feverLog', () => {
  // Sorted newest-first by the Firestore query itself.
  const entries = ref<LogEntry[]>([])
  const activeChildId = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null

  function watchChild(childId: string | null) {
    activeChildId.value = childId
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    entries.value = []

    const authStore = useAuthStore()
    if (!childId || !authStore.familyId) return

    const q = query(entriesCollection(authStore.familyId, childId), orderBy('takenAt', 'desc'))
    unsubscribe = onSnapshot(q, (snapshot) => {
      entries.value = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          ...data,
          id: d.id,
          takenAt: (data.takenAt as Timestamp).toMillis(),
        } as LogEntry
      })
    })
  }

  function requireContext() {
    const authStore = useAuthStore()
    if (!authStore.familyId || !activeChildId.value) {
      throw new Error('Aktif çocuk seçilmedi')
    }
    return { familyId: authStore.familyId, childId: activeChildId.value }
  }

  async function addReading(temperature: number, note?: string) {
    const { familyId, childId } = requireContext()
    const payload: Omit<FeverReading, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      type: 'reading',
      temperature,
      takenAt: Timestamp.now(),
      ...(note ? { note } : {}),
    }
    await addDoc(entriesCollection(familyId, childId), payload)
  }

  async function addDose(medicationId: string, medicationName: string) {
    const { familyId, childId } = requireContext()
    const payload: Omit<DoseEntry, 'id' | 'takenAt'> & { takenAt: Timestamp } = {
      type: 'dose',
      medicationId,
      medicationName,
      takenAt: Timestamp.now(),
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
    return entries.value.find((e): e is DoseEntry => e.type === 'dose' && e.medicationId === medicationId)
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
    watchChild,
    addReading,
    addDose,
    removeEntry,
    clearAllEntries,
    lastDose,
    nextSafeDoseAt,
    recentEntries,
  }
})
