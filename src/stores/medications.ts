import { ref } from 'vue'
import { defineStore } from 'pinia'
import { addDoc, collection, doc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Medication } from '@/types/health'

function medicationsCollection(familyId: string, childId: string) {
  return collection(db, 'families', familyId, 'children', childId, 'medications')
}

export const useMedicationsStore = defineStore('medications', () => {
  const medications = ref<Medication[]>([])
  let unsubscribe: (() => void) | null = null

  function watchChild(familyId: string | null, childId: string | null) {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    medications.value = []
    if (!familyId || !childId) return

    unsubscribe = onSnapshot(medicationsCollection(familyId, childId), (snap) => {
      medications.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Medication)
    })
  }

  async function addMedication(familyId: string, childId: string, data: Omit<Medication, 'id'>) {
    const ref = await addDoc(medicationsCollection(familyId, childId), data)
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

  return { medications, watchChild, addMedication, updateMedication, removeMedication }
})
