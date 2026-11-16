import type { MedicalNoteCategory } from '@/types/health'

export interface MedicalNoteCategoryOption {
  value: MedicalNoteCategory
  icon: string
}

export const MEDICAL_NOTE_CATEGORIES: readonly MedicalNoteCategoryOption[] = [
  { value: 'hospital', icon: 'mdi-hospital-box-outline' },
  { value: 'examination', icon: 'mdi-doctor' },
  { value: 'test', icon: 'mdi-flask-outline' },
  { value: 'medication', icon: 'mdi-pill' },
  { value: 'other', icon: 'mdi-note-text-outline' },
] as const

export const MEDICAL_NOTE_CATEGORY_ICONS: Record<MedicalNoteCategory, string> = {
  hospital: 'mdi-hospital-box-outline',
  examination: 'mdi-doctor',
  test: 'mdi-flask-outline',
  medication: 'mdi-pill',
  other: 'mdi-note-text-outline',
}
