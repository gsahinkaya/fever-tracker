export interface Child {
  id: string
  name: string
  birthDate?: string
}

export interface UserProfile {
  email: string
  familyId: string
  phone?: string
  birthDate?: string
}

export interface Family {
  id: string
  ownerUid: string
  members: Record<string, true>
}
