import { defineStore } from 'pinia'
import { addDoc, collection, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useWatermarkedFeed } from '@/composables/useWatermarkedFeed'
import type { Medication } from '@/types/health'

function medicationsCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'medications')
}

export const useMedicationsStore = defineStore('medications', () => {
  const {
    items: medications,
    incoming: incomingMedications,
    lastRemote: lastRemoteMedication,
    watchChild,
    acknowledgeIncoming,
  } = useWatermarkedFeed<Medication>({
    storageKeyPrefix: 'ates-olcer:last-seen-medications',
    buildQuery: (familyId, childId) => medicationsCollection(familyId, childId),
    // Medications created before `createdAt` existed have no timestamp and
    // sort as 0 — the `incoming` watermark treats them as already-seen.
    mapDoc: (id, data) =>
      ({
        ...data,
        id,
        ...(data.createdAt ? { createdAt: (data.createdAt as Timestamp).toMillis() } : {}),
      }) as Medication,
    sortKey: (medication) => medication.createdAt ?? 0,
  })

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
