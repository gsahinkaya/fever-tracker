import { ref } from 'vue'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import type { UserProfile } from '@/types/family'

export interface FamilyMember {
  uid: string
  name?: string
  email?: string
  isSelf: boolean
}

export function useFamilyMembers() {
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

      // Older/unowned members may still be denied by security rules if this
      // deploy's rules haven't caught up yet — resolve individually so one
      // denied read doesn't blank out the whole list.
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
}
