export interface Child {
  id: string
  name: string
  birthDate?: string
  gender?: 'female' | 'male'
  heightCm?: number
  weightKg?: number
}

export interface UserProfile {
  email: string
  familyId: string
  name?: string
  phone?: string
  birthDate?: string
}

export interface Family {
  id: string
  ownerUid: string
  members: Record<string, true>
}
