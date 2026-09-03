import { ref } from 'vue'
import { defineStore } from 'pinia'
import { deleteField, doc, getDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import type { FamilyMember, UserProfile } from '@/types/family'

// A one-time fetch rather than onSnapshot (unlike stores/children.ts) —
// family membership changes rarely enough that a live listener isn't worth
// the extra open connection; SettingsView/App.vue re-load on familyId change.
export const useFamilyMembersStore = defineStore('familyMembers', () => {
  const loading = ref(false)
  const members = ref<FamilyMember[]>([])
  // Only the owner may remove a member (see firestore.rules) — an invited
  // caregiver must not be able to remove the parent who invited them.
  // Settings uses this to hide the remove button entirely for non-owners
  // rather than showing one that would just fail with permission-denied.
  const ownerUid = ref<string | null>(null)
  let lastFamilyId: string | null = null

  async function load(familyId: string | null) {
    lastFamilyId = familyId
    members.value = []
    ownerUid.value = null
    if (!familyId) return
    loading.value = true
    try {
      const familySnap = await getDoc(doc(db, 'families', familyId))
      ownerUid.value = familySnap.exists() ? (familySnap.data().ownerUid ?? null) : null
      const uids = familySnap.exists() ? Object.keys(familySnap.data().members ?? {}) : []
      const selfUid = auth.currentUser?.uid

      // A member whose profile read is denied (e.g. Firestore rules not yet
      // deployed) is resolved individually so it doesn't blank the whole list.
      const results = await Promise.allSettled(
        uids.map(async (uid) => {
          const snap = await getDoc(doc(db, 'users', uid))
          const profile = snap.exists() ? (snap.data() as UserProfile) : null
          return {
            uid,
            name: profile?.name,
            email: profile?.email,
            relation: profile?.relation,
            isSelf: uid === selfUid,
          }
        }),
      )
      const resolved: FamilyMember[] = []
      for (const result of results) {
        if (result.status === 'fulfilled') resolved.push(result.value)
      }
      members.value = resolved.sort((a, b) => Number(b.isSelf) - Number(a.isSelf))
    } finally {
      loading.value = false
    }
  }

  // Only removes the uid from the family's `members` map — the other
  // person's own users/{uid} profile is untouched (they can still see it
  // and rejoin with a new invite code). Firestore rules restrict this to
  // the family's owner.
  async function removeMember(familyId: string, uid: string) {
    await updateDoc(doc(db, 'families', familyId), { [`members.${uid}`]: deleteField() })
    if (familyId === lastFamilyId) await load(familyId)
  }

  return { loading, members, ownerUid, load, removeMember }
})
