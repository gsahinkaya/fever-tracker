export interface Medication {
  id: string
  name: string
  minIntervalHours: number
  note?: string
  // Inventory tracking, all optional — a syrup opened on this date is only
  // good for shelfLifeDaysAfterOpening more days (defaults to 90 if unset,
  // a common pharmacist rule of thumb), separate from the printed expiry
  // date on the box itself.
  openedAt?: number
  expiryDate?: string
  shelfLifeDaysAfterOpening?: number
  // Who added this medication and when, so the other parent can be
  // notified — including catching up after reopening the app, which needs
  // a timestamp to compare against a "last seen" watermark. Optional
  // because medications created before these fields existed won't have them.
  createdBy?: string
  createdByEmail?: string
  createdAt?: number
}

export interface FeverReading {
  id: string
  type: 'reading'
  temperature: number
  takenAt: number
  note?: string
  // Who added this entry, so the other parent can be notified. Optional
  // because entries created before this field existed won't have it.
  createdBy?: string
  createdByEmail?: string
}

export interface DoseEntry {
  id: string
  type: 'dose'
  medicationId: string
  // Snapshot of the medication's name at the time it was given, so past
  // entries stay meaningful even if the medication is later renamed/deleted.
  medicationName: string
  takenAt: number
  createdBy?: string
  createdByEmail?: string
}

export type LogEntry = FeverReading | DoseEntry

export interface BreastfeedingEntry {
  id: string
  type: 'breastfeeding'
  takenAt: number
  durationMinutes?: number
  side?: 'left' | 'right' | 'both'
  createdBy?: string
  createdByEmail?: string
}

export interface BottleEntry {
  id: string
  type: 'bottle'
  takenAt: number
  amountMl: number
  milkType: 'breast-milk' | 'formula' | 'mixed'
  createdBy?: string
  createdByEmail?: string
}

export interface SolidFoodEntry {
  id: string
  type: 'solid'
  takenAt: number
  note?: string
  createdBy?: string
  createdByEmail?: string
}

export type FeedingEntry = BreastfeedingEntry | BottleEntry | SolidFoodEntry

export interface GrowthEntry {
  id: string
  takenAt: number
  // At least one of the three is required (enforced by the add dialog) —
  // a visit might only measure some of these.
  heightCm?: number
  weightKg?: number
  headCircumferenceCm?: number
  createdBy?: string
  createdByEmail?: string
}

export type SymptomType = 'cough' | 'vomiting' | 'diarrhea' | 'rash' | 'runnyNose' | 'other'

export interface SymptomEntry {
  id: string
  takenAt: number
  type: SymptomType
  note?: string
  createdBy?: string
  createdByEmail?: string
}
