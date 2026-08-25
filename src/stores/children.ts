import { ref } from 'vue'
import { defineStore } from 'pinia'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { Child } from '@/types/family'

export const useChildrenStore = defineStore('children', () => {
  const children = ref<Child[]>([])
  let unsubscribe: (() => void) | null = null

  function watchFamily(familyId: string | null) {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    children.value = []
    if (!familyId) return
    unsubscribe = onSnapshot(collection(db, 'families', familyId, 'children'), (snap) => {
      children.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Child)
    })
  }

  async function addChild(familyId: string, data: Omit<Child, 'id'>) {
    const ref = await addDoc(collection(db, 'families', familyId, 'children'), data)
    return ref.id
  }

  async function updateChild(familyId: string, childId: string, data: Partial<Omit<Child, 'id'>>) {
    await updateDoc(doc(db, 'families', familyId, 'children', childId), data)
  }

  async function removeChild(familyId: string, childId: string) {
    // Firestore doesn't cascade-delete subcollections, so clear the child's
    // entries, medications, and feedings first to avoid leaving orphaned
    // data behind.
    const entriesRef = collection(db, 'families', familyId, 'children', childId, 'entries')
    const medicationsRef = collection(db, 'families', familyId, 'children', childId, 'medications')
    const feedingsRef = collection(db, 'families', familyId, 'children', childId, 'feedings')
    const [entriesSnap, medicationsSnap, feedingsSnap] = await Promise.all([
      getDocs(entriesRef),
      getDocs(medicationsRef),
      getDocs(feedingsRef),
    ])
    const batch = writeBatch(db)
    entriesSnap.docs.forEach((d) => batch.delete(d.ref))
    medicationsSnap.docs.forEach((d) => batch.delete(d.ref))
    feedingsSnap.docs.forEach((d) => batch.delete(d.ref))
    batch.delete(doc(db, 'families', familyId, 'children', childId))
    await batch.commit()
  }

  return { children, watchFamily, addChild, updateChild, removeChild }
})
