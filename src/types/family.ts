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
