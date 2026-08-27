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
  // True from the moment a family is watched until its first snapshot
  // arrives, so views can tell "no children yet" apart from "haven't heard
  // back from Firestore yet" and avoid flashing an empty state right after
  // joining a family that already has children.
  const loading = ref(false)
  let unsubscribe: (() => void) | null = null

  function watchFamily(familyId: string | null) {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    children.value = []
    if (!familyId) {
      loading.value = false
      return
    }
    loading.value = true
    unsubscribe = onSnapshot(collection(db, 'families', familyId, 'children'), (snap) => {
      children.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Child)
      loading.value = false
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

  return { children, loading, watchFamily, addChild, updateChild, removeChild }
})
