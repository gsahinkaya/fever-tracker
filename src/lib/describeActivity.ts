import { t } from '@/i18n'
import type { FeedingEntry, GrowthEntry, LogEntry, Medication } from '@/types/health'

// Turns a fever/medication/feeding entry into a human sentence — shared by
// the in-app bell/banner (App.vue) and the OS system notification
// (useEntryNotifications), which both need to describe the exact same
// "someone else just did X" activity.
export function describeEntry(entry: LogEntry): string {
  const who = entry.createdByEmail?.split('@')[0] ?? t('notifications.someone')
  return entry.type === 'reading'
    ? t('notifications.addedReading', { who, temp: entry.temperature })
    : t('notifications.gaveMedication', { who, name: entry.medicationName })
}

export function describeMedication(medication: Medication): string {
  const who = medication.createdByEmail?.split('@')[0] ?? t('notifications.someone')
  return t('notifications.addedMedication', { who, name: medication.name })
}

export function describeFeeding(entry: FeedingEntry): string {
  const who = entry.createdByEmail?.split('@')[0] ?? t('notifications.someone')
  if (entry.type === 'breastfeeding') return t('notifications.breastfed', { who })
  if (entry.type === 'bottle') {
    return t('notifications.gaveBottle', {
      who,
      amount: entry.amountMl,
      milkType: t(`notifications.milkTypes.${entry.milkType}`),
    })
  }
  return t('notifications.gaveSolidFood', { who })
}

export function describeGrowth(entry: GrowthEntry): string {
  const who = entry.createdByEmail?.split('@')[0] ?? t('notifications.someone')
  const parts: string[] = []
  if (entry.heightCm) parts.push(`${entry.heightCm} cm`)
  if (entry.weightKg) parts.push(`${entry.weightKg} kg`)
  return t('notifications.addedGrowth', { who, parts: parts.join(' · ') })
}
