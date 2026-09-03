// A vaccine the parent added themselves — one not on the national schedule
// (a travel vaccine, one their pediatrician recommended off-schedule, a
// yearly flu shot) or private/paid vaccines outside the state program.
// Unlike VACCINATION_SCHEDULE (fixed, ageDays-based), these are free-form
// and have no birthDate-derived due date — the parent sets one directly, or
// leaves it unset for "no particular date yet".
export interface CustomVaccine {
  id: string
  name: string
  dueDate?: string
  done: boolean
}

export interface Child {
  id: string
  name: string
  birthDate?: string
  gender?: 'female' | 'male'
  heightCm?: number
  weightKg?: number
  headCircumferenceCm?: number
  // IDs from vaccinationSchedule.ts that have been marked as given.
  completedVaccineIds?: string[]
  customVaccines?: CustomVaccine[]
}

export type FamilyRelation =
  | 'mother'
  | 'father'
  | 'grandmother'
  | 'grandfather'
  | 'maternalAunt'
  | 'paternalAunt'
  | 'maternalUncle'
  | 'paternalUncle'
  | 'caregiver'
  | 'other'

export interface UserProfile {
  email: string
  familyId: string
  name?: string
  phone?: string
  birthDate?: string
  // Who this account is to the children being tracked — shown next to
  // their name in Settings' family member list, collected at registration.
  relation?: FamilyRelation
  // Tracked on the account (not just a device) so the onboarding wizard
  // stays dismissed across devices/reinstalls once the user has seen it.
  hasSeenOnboarding?: boolean
}

export interface Family {
  id: string
  ownerUid: string
  members: Record<string, true>
}

// A family member resolved from the family doc's member uids + each uid's
// own users/{uid} profile — used to show a real name (not just an email
// prefix) for "who logged this" across the app.
export interface FamilyMember {
  uid: string
  name?: string
  email?: string
  relation?: FamilyRelation
  isSelf: boolean
}
