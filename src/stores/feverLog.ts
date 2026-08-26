import { computed, ref } from 'vue'
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
import { loadLastSeen, saveLastSeen } from '@/lib/lastSeen'
import type { LogEntry, FeverReading, DoseEntry } from '@/types/health'

function entriesCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'entries')
}

function lastSeenKey(childId: string) {
  return `ates-olcer:last-seen-entries:${childId}`
}

export const useFeverLogStore = defineStore('feverLog', () => {
  // Sorted newest-first by the Firestore query itself.
  const entries = ref<LogEntry[]>([])
  const activeChildId = ref<string | null>(null)
  // Persisted per device+child so entries the other parent added while this
  // device was closed still show up as unseen next time it opens — not just
  // ones that happen to arrive while a listener is already live.
  const lastSeenAt = ref(0)
  // Fires once per remotely-added entry, for triggering a system notification.
  const lastRemoteEntry = ref<LogEntry | null>(null)
  let unsubscribe: (() => void) | null = null

  // Entries the *other* parent added since we last acknowledged them, for
  // the bell/banner. Derived straight from `entries` + the watermark so it's
  // correct whether that data came from the initial load or a live update.
  const incomingEntries = computed(() => {
    const myUid = useAuthStore().user?.uid
    return entries.value
      .filter((e) => e.createdBy && e.createdBy !== myUid && e.takenAt > lastSeenAt.value)
      .slice()
      .sort((a, b) => a.takenAt - b.takenAt)
  })

  function watchChild(childId: string | null) {
    activeChildId.value = childId
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    entries.value = []
    lastRemoteEntry.value = null
    lastSeenAt.value = childId ? loadLastSeen(lastSeenKey(childId)) : 0

    const authStore = useAuthStore()
    if (!childId || !authStore.familyId) return

    const q = query(entriesCollection(authStore.familyId, childId), orderBy('takenAt', 'desc'))
    // The listener's first callback is the initial read of existing docs, not
    // new activity — only look for "added" entries from later callbacks, to
    // avoid popping a system notification for old, already-synced data.
    let isInitialSnapshot = true
    unsubscribe = onSnapshot(q, (snapshot) => {
      entries.value = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          ...data,
          id: d.id,
          takenAt: (data.takenAt as Timestamp).toMillis(),
        } as LogEntry
      })

      if (!isInitialSnapshot) {
        const myUid = authStore.user?.uid
        for (const change of snapshot.docChanges()) {
          // hasPendingWrites is true for our own optimistic writes and never
          // flips to false in a later callback (the doc content doesn't
          // change once synced), so this naturally excludes our own writes.
          if (change.type !== 'added' || change.doc.metadata.hasPendingWrites) continue
          const data = change.doc.data()
          if (data.createdBy && data.createdBy === myUid) continue
          lastRemoteEntry.value = {
            ...data,
            id: change.doc.id,
            takenAt: (data.takenAt as Timestamp).toMillis(),
          } as LogEntry
        }
      }
      isInitialSnapshot = false
    })
  }

  function acknowledgeIncoming() {
    if (!activeChildId.value) return
    const now = Date.now()
    lastSeenAt.value = now
    saveLastSeen(lastSeenKey(activeChildId.value), now)
  }

  function requireContext() {
    const authStore = useAuthStore()
    if (!authStore.familyId || !activeChildId.value) {
      throw new Error('Aktif çocuk seçilmedi')
    }
    return { familyId: authStore.familyId, childId: activeChildId.value }
  }

  function creatorFields() {
    const authStore = useAuthStore()
    const uid = authStore.user?.uid
    const email = authStore.profile?.email ?? authStore.user?.email ?? undefined
    return {
      ...(uid ? { createdBy: uid } : {}),
      ...(email ? { createdByEmail: email } : {}),
    }
  }

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
