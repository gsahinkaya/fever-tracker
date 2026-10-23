import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { auth, db } from '@/firebase'
import type { UserProfile } from '@/types/family'
import { t } from '@/i18n'

const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars (0/O, 1/I)

function randomInviteCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)]
  }
  return code
}

async function createFamily(ownerUid: string): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomInviteCode()
    const familyRef = doc(db, 'families', code)
    const snap = await getDoc(familyRef)
    if (!snap.exists()) {
      await setDoc(familyRef, {
        ownerUid,
        members: { [ownerUid]: true },
        createdAt: serverTimestamp(),
      })
      return code
    }
  }
  throw new Error(t('auth.register.errors.inviteCodeCreateFailed'))
}

async function joinFamily(inviteCode: string, uid: string): Promise<string> {
  const code = inviteCode.trim().toUpperCase()
  const familyRef = doc(db, 'families', code)
  const snap = await getDoc(familyRef)
  if (!snap.exists()) {
    throw new Error(t('auth.register.errors.inviteCodeNotFound'))
  }
  await updateDoc(familyRef, { [`members.${uid}`]: true })
  return code
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const profile = ref<UserProfile | null>(null)
  const initializing = ref(true)

  onAuthStateChanged(auth, async (u) => {
    user.value = u
    if (u) {
      const snap = await getDoc(doc(db, 'users', u.uid))
      profile.value = snap.exists() ? (snap.data() as UserProfile) : null
    } else {
      profile.value = null
    }
    initializing.value = false
  })

  const isAuthenticated = computed(() => !!user.value)
  const familyId = computed(() => profile.value?.familyId ?? null)

  async function register(opts: {
    email: string
    password: string
    name?: string
    phone?: string
    birthDate?: string
    relation?: UserProfile['relation']
    inviteCode?: string
  }) {
    const cred = await createUserWithEmailAndPassword(auth, opts.email, opts.password)
    const uid = cred.user.uid

    const familyIdToUse = opts.inviteCode
      ? await joinFamily(opts.inviteCode, uid)
      : await createFamily(uid)

    const userProfile: UserProfile = {
      email: opts.email,
      familyId: familyIdToUse,
      ...(opts.name ? { name: opts.name } : {}),
      ...(opts.phone ? { phone: opts.phone } : {}),
      ...(opts.birthDate ? { birthDate: opts.birthDate } : {}),
      ...(opts.relation ? { relation: opts.relation } : {}),
    }
    await setDoc(doc(db, 'users', uid), userProfile)
    profile.value = userProfile
  }

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function markOnboardingSeen() {
    if (!user.value || profile.value?.hasSeenOnboarding) return
    // Flip the local flag first — the wizard's v-model reads it, so waiting
    // on the Firestore round-trip before this makes "Atla"/"Anladım"
    // feel unresponsive (a real, visible delay, not just a slow test) on a
    // slow connection. The write below still persists it for other
    // devices/a reinstall.
    if (profile.value) profile.value.hasSeenOnboarding = true
    await updateDoc(doc(db, 'users', user.value.uid), { hasSeenOnboarding: true })
  }

  // Settings' "edit profile" — accounts created before `relation` existed
  // (or anyone who skipped it at registration) have no way to set it
  // otherwise, and the family-owner "may remove a member" rule requires it.
  async function updateProfile(data: Pick<UserProfile, 'name' | 'relation'>) {
    if (!user.value) return
    const payload = {
      ...(data.name ? { name: data.name } : {}),
      ...(data.relation ? { relation: data.relation } : {}),
    }
    await updateDoc(doc(db, 'users', user.value.uid), payload)
    if (profile.value) Object.assign(profile.value, payload)
  }

  async function logout() {
    await firebaseSignOut(auth)
  }

  // Apple & Google Store requirement: Users must be able to delete their account
  // and all associated personal data from within the app.
  async function deleteAccount(password: string) {
    const currentUser = user.value
    if (!currentUser || !currentUser.email) {
      throw new Error(t('auth.login.error'))
    }
    const email = currentUser.email
    const uid = currentUser.uid
    const famId = profile.value?.familyId

    // 1. Re-authenticate with password to satisfy Firebase Auth recent-login requirement
    const credential = EmailAuthProvider.credential(email, password)
    await reauthenticateWithCredential(currentUser, credential)

    // 2. Remove user's registered device tokens
    try {
      const tokensRef = collection(db, 'users', uid, 'deviceTokens')
      const tokensSnap = await getDocs(tokensRef)
      for (const d of tokensSnap.docs) {
        await deleteDoc(d.ref)
      }
    } catch (e) {
      console.warn('Failed to delete device tokens during account deletion:', e)
    }

    // 3. Clean up family membership
    if (famId) {
      try {
        const familyRef = doc(db, 'families', famId)
        const famSnap = await getDoc(familyRef)
        if (famSnap.exists()) {
          const famData = famSnap.data()
          const members = famData.members || {}
          const otherMemberUids = Object.keys(members).filter((m) => m !== uid && members[m])

          if (famData.ownerUid === uid) {
            if (otherMemberUids.length === 0) {
              // Sole member: delete the family document
              await deleteDoc(familyRef)
            } else {
              // Pass ownership to first remaining member and remove self
              const newOwnerUid = otherMemberUids[0]
              await updateDoc(familyRef, {
                ownerUid: newOwnerUid,
                [`members.${uid}`]: deleteField(),
              })
            }
          } else {
            // Normal member: remove self from family
            await updateDoc(familyRef, {
              [`members.${uid}`]: deleteField(),
            })
          }
        }
      } catch (e) {
        console.warn('Failed to update family during account deletion:', e)
      }
    }

    // 4. Delete user's profile document
    try {
      await deleteDoc(doc(db, 'users', uid))
    } catch (e) {
      console.warn('Failed to delete user profile document:', e)
    }

    // 5. Clean up local app cache & preferences
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('ates-olcer:') || key.startsWith('alfred:'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k))
    } catch {}

    // 6. Delete Firebase Auth user
    await deleteUser(currentUser)

    user.value = null
    profile.value = null
  }

  return {
    user,
    profile,
    initializing,
    isAuthenticated,
    familyId,
    register,
    login,
    logout,
    deleteAccount,
    markOnboardingSeen,
    updateProfile,
  }
})
