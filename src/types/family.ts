export interface Child {
  id: string
  name: string
  birthDate?: string
  gender?: 'female' | 'male'
  heightCm?: number
  weightKg?: number
  // IDs from vaccinationSchedule.ts that have been marked as given.
  completedVaccineIds?: string[]
}

export interface UserProfile {
  email: string
  familyId: string
  name?: string
  phone?: string
  birthDate?: string
  // Tracked on the account (not just a device) so the onboarding wizard
  // stays dismissed across devices/reinstalls once the user has seen it.
  hasSeenOnboarding?: boolean
}

export interface Family {
  id: string
  ownerUid: string
  members: Record<string, true>
}
