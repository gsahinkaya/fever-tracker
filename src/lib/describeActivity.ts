import { t } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import type { FeedingEntry, GrowthEntry, LogEntry, Medication, SymptomEntry } from '@/types/health'

function whoLabel(email?: string): string {
  return email?.split('@')[0] ?? t('notifications.someone')
}

// For messages built right after *this* device's own write (the push-family
// trigger) — the read-side functions below instead read createdByEmail off
// the fetched entry, since that's who actually wrote it, not who's reading.
export function currentWhoLabel(): string {
  const authStore = useAuthStore()
  return whoLabel(authStore.profile?.email ?? authStore.user?.email ?? undefined)
}

export function messageForReading(who: string, temp: number): string {
  return t('notifications.addedReading', { who, temp })
}
export function messageForDose(who: string, name: string): string {
  return t('notifications.gaveMedication', { who, name })
}
export function messageForMedicationAdded(who: string, name: string): string {
  return t('notifications.addedMedication', { who, name })
}
export function messageForBreastfeeding(who: string): string {
  return t('notifications.breastfed', { who })
}
export function messageForBottle(who: string, amount: number, milkType: string): string {
  return t('notifications.gaveBottle', {
    who,
    amount,
    milkType: t(`notifications.milkTypes.${milkType}`),
  })
}
export function messageForSolidFood(who: string): string {
  return t('notifications.gaveSolidFood', { who })
}
export function messageForGrowth(who: string, heightCm?: number, weightKg?: number): string {
  const parts: string[] = []
  if (heightCm) parts.push(`${heightCm} cm`)
  if (weightKg) parts.push(`${weightKg} kg`)
  return t('notifications.addedGrowth', { who, parts: parts.join(' · ') })
}
export function messageForSymptom(who: string, type: string): string {
  return t('notifications.addedSymptom', { who, type: t(`symptoms.types.${type}`) })
}

// Turns a fever/medication/feeding/growth entry into a human sentence —
// shared by the in-app bell/banner (App.vue) and the OS system notification
// (useEntryNotifications), which both need to describe the exact same
// "someone else just did X" activity.
export function describeEntry(entry: LogEntry): string {
  const who = whoLabel(entry.createdByEmail)
  return entry.type === 'reading'
    ? messageForReading(who, entry.temperature)
    : messageForDose(who, entry.medicationName)
}

export function describeMedication(medication: Medication): string {
  return messageForMedicationAdded(whoLabel(medication.createdByEmail), medication.name)
}

export function describeFeeding(entry: FeedingEntry): string {
  const who = whoLabel(entry.createdByEmail)
  if (entry.type === 'breastfeeding') return messageForBreastfeeding(who)
  if (entry.type === 'bottle') return messageForBottle(who, entry.amountMl, entry.milkType)
  return messageForSolidFood(who)
}

export function describeGrowth(entry: GrowthEntry): string {
  return messageForGrowth(whoLabel(entry.createdByEmail), entry.heightCm, entry.weightKg)
}

export function describeSymptom(entry: SymptomEntry): string {
  return messageForSymptom(whoLabel(entry.createdByEmail), entry.type)
}
