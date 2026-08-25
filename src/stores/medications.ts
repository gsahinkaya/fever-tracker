import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { addDoc, collection, doc, onSnapshot, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { loadLastSeen, saveLastSeen } from '@/lib/lastSeen'
import type { Medication } from '@/types/health'

function medicationsCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'medications')
}

function lastSeenKey(childId: string) {
  return `ates-olcer:last-seen-medications:${childId}`
}

export const useMedicationsStore = defineStore('medications', () => {
  const medications = ref<Medication[]>([])
  const activeChildId = ref<string | null>(null)
  // Persisted per device+child so medications the other parent added while
  // this device was closed still show up as unseen next time it opens — not
  // just ones that happen to arrive while a listener is already live.
  const lastSeenAt = ref(0)
  // Fires once per remotely-added medication, for triggering a system notification.
  const lastRemoteMedication = ref<Medication | null>(null)
  let unsubscribe: (() => void) | null = null

  // Medications the *other* parent added since we last acknowledged them,
  // for the bell/banner. Derived straight from `medications` + the
  // watermark so it's correct whether that data came from the initial load
  // or a live update. Medications created before `createdAt` existed sort
  // as 0 and are treated as already-seen.
  const incomingMedications = computed(() => {
    const myUid = useAuthStore().user?.uid
    return medications.value
      .filter((m) => m.createdBy && m.createdBy !== myUid && (m.createdAt ?? 0) > lastSeenAt.value)
      .slice()
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
  })

  function watchChild(familyId: string | null, childId: string | null) {
    activeChildId.value = childId
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    medications.value = []
    lastRemoteMedication.value = null
    lastSeenAt.value = childId ? loadLastSeen(lastSeenKey(childId)) : 0
    if (!familyId || !childId) return

    const authStore = useAuthStore()
    // The listener's first callback is the initial read of existing docs, not
    // new activity — only look for "added" medications from later callbacks,
    // to avoid popping a system notification for old, already-synced data.
    let isInitialSnapshot = true
    unsubscribe = onSnapshot(medicationsCollection(familyId, childId), (snap) => {
      medications.value = snap.docs.map((d) => {
        const data = d.data()
        return {
          ...data,
          id: d.id,
          ...(data.createdAt ? { createdAt: (data.createdAt as Timestamp).toMillis() } : {}),
        } as Medication
      })

      if (!isInitialSnapshot) {
        const myUid = authStore.user?.uid
        for (const change of snap.docChanges()) {
          // hasPendingWrites is true for our own optimistic writes and never
          // flips to false in a later callback (the doc content doesn't
          // change once synced), so this naturally excludes our own writes.
          if (change.type !== 'added' || change.doc.metadata.hasPendingWrites) continue
          const data = change.doc.data()
          if (data.createdBy && data.createdBy === myUid) continue
          lastRemoteMedication.value = {
            ...data,
            id: change.doc.id,
            ...(data.createdAt ? { createdAt: (data.createdAt as Timestamp).toMillis() } : {}),
          } as Medication
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

  async function addMedication(familyId: string, childId: string, data: Omit<Medication, 'id'>) {
    const authStore = useAuthStore()
    const uid = authStore.user?.uid
    const email = authStore.profile?.email ?? authStore.user?.email ?? undefined
    const payload = {
      ...data,
      createdAt: Timestamp.now(),
      ...(uid ? { createdBy: uid } : {}),
      ...(email ? { createdByEmail: email } : {}),
    }
    const ref = await addDoc(medicationsCollection(familyId, childId), payload)
    return ref.id
  }

  async function updateMedication(
    familyId: string,
    childId: string,
    medicationId: string,
    data: Partial<Omit<Medication, 'id'>>,
  ) {
    await updateDoc(doc(medicationsCollection(familyId, childId), medicationId), data)
  }

  async function removeMedication(familyId: string, childId: string, medicationId: string) {
    await deleteDoc(doc(medicationsCollection(familyId, childId), medicationId))
  }

  return {
    medications,
    incomingMedications,
    lastRemoteMedication,
    watchChild,
    acknowledgeIncoming,
    addMedication,
    updateMedication,
    removeMedication,
  }
})
