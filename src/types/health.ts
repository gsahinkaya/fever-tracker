export interface Medication {
  id: string
  name: string
  minIntervalHours: number
  note?: string
}

export interface FeverReading {
  id: string
  type: 'reading'
  temperature: number
  takenAt: number
  note?: string
}

export interface DoseEntry {
  id: string
  type: 'dose'
  medicationId: string
  // Snapshot of the medication's name at the time it was given, so past
  // entries stay meaningful even if the medication is later renamed/deleted.
  medicationName: string
  takenAt: number
}

export type LogEntry = FeverReading | DoseEntry
