import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import type { UserProfile } from '@/types/family'

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
  throw new Error('Davet kodu oluşturulamadı, tekrar dene.')
}

async function joinFamily(inviteCode: string, uid: string): Promise<string> {
  const code = inviteCode.trim().toUpperCase()
  const familyRef = doc(db, 'families', code)
  const snap = await getDoc(familyRef)
  if (!snap.exists()) {
    throw new Error('Davet kodu bulunamadı. Kodu kontrol edip tekrar dene.')
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
    await updateDoc(doc(db, 'users', user.value.uid), { hasSeenOnboarding: true })
    if (profile.value) profile.value.hasSeenOnboarding = true
  }

  async function logout() {
    await firebaseSignOut(auth)
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
    markOnboardingSeen,
  }
})
