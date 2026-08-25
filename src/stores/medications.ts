import { ref } from 'vue'
import { defineStore } from 'pinia'
import { addDoc, collection, doc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import type { Medication } from '@/types/health'

function medicationsCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'medications')
}

export const useMedicationsStore = defineStore('medications', () => {
  const medications = ref<Medication[]>([])
  // Medications the *other* parent added since we last acknowledged them, for
  // the in-app banner. receivedAt lets the banner merge these with incoming
  // entries (a separate store) in true arrival order. Cleared on child
  // switch and on acknowledgeIncoming().
  const incomingMedications = ref<{ medication: Medication; receivedAt: number }[]>([])
  // Fires once per remotely-added medication, for triggering a system notification.
  const lastRemoteMedication = ref<Medication | null>(null)
  let unsubscribe: (() => void) | null = null

  function watchChild(familyId: string | null, childId: string | null) {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    medications.value = []
    incomingMedications.value = []
    if (!familyId || !childId) return

    const authStore = useAuthStore()
    // The listener's first callback is the initial read of existing docs, not
    // new activity — only look for "added" medications from later callbacks.
    let isInitialSnapshot = true
    unsubscribe = onSnapshot(medicationsCollection(familyId, childId), (snap) => {
      medications.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Medication)

      if (!isInitialSnapshot) {
        const myUid = authStore.user?.uid
        for (const change of snap.docChanges()) {
          // hasPendingWrites is true for our own optimistic writes and never
          // flips to false in a later callback (the doc content doesn't
          // change once synced), so this naturally excludes our own writes.
          if (change.type !== 'added' || change.doc.metadata.hasPendingWrites) continue
          const data = change.doc.data()
          if (data.createdBy && data.createdBy === myUid) continue
          const medication = { ...data, id: change.doc.id } as Medication
          incomingMedications.value = [...incomingMedications.value, { medication, receivedAt: Date.now() }]
          lastRemoteMedication.value = medication
        }
      }
      isInitialSnapshot = false
    })
  }

  function acknowledgeIncoming() {
    incomingMedications.value = []
  }

  async function addMedication(familyId: string, childId: string, data: Omit<Medication, 'id'>) {
    const authStore = useAuthStore()
    const uid = authStore.user?.uid
    const email = authStore.profile?.email ?? authStore.user?.email ?? undefined
    const payload = {
      ...data,
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
