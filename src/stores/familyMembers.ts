import { ref } from 'vue'
import { defineStore } from 'pinia'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import type { FamilyMember, UserProfile } from '@/types/family'

// A one-time fetch rather than onSnapshot (unlike stores/children.ts) —
// family membership changes rarely enough that a live listener isn't worth
// the extra open connection; SettingsView/App.vue re-load on familyId change.
export const useFamilyMembersStore = defineStore('familyMembers', () => {
  const loading = ref(false)
  const members = ref<FamilyMember[]>([])

  async function load(familyId: string | null) {
    members.value = []
    if (!familyId) return
    loading.value = true
    try {
      const familySnap = await getDoc(doc(db, 'families', familyId))
      const uids = familySnap.exists() ? Object.keys(familySnap.data().members ?? {}) : []
      const selfUid = auth.currentUser?.uid

      // A member whose profile read is denied (e.g. Firestore rules not yet
      // deployed) is resolved individually so it doesn't blank the whole list.
      const results = await Promise.allSettled(
        uids.map(async (uid) => {
          const snap = await getDoc(doc(db, 'users', uid))
          const profile = snap.exists() ? (snap.data() as UserProfile) : null
          return { uid, name: profile?.name, email: profile?.email, isSelf: uid === selfUid }
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

  return { loading, members, load }
})
