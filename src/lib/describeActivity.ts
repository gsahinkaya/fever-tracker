import { t } from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import type {
  CalendarEvent,
  DiaperEntry,
  FeedingEntry,
  GrowthEntry,
  LogEntry,
  Medication,
  MedicationAlertEntry,
  SleepEntry,
  SymptomEntry,
} from '@/types/health'
import type { FamilyMember } from '@/types/family'

export function whoLabel(email?: string): string {
  return email?.split('@')[0] ?? t('notifications.someone')
}

// Prefers the family member's actual name (collected at registration) over
// the createdByEmail-derived fallback above — used in the entry tables so
// "who did this" reads as a real name rather than an email prefix.
export function whoNameLabel(members: FamilyMember[], uid?: string, email?: string): string {
  const name = uid ? members.find((m) => m.uid === uid)?.name : undefined
  return name || whoLabel(email)
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
export function messageForDiaper(who: string, type: string): string {
  return t('notifications.addedDiaper', { who, type: t(`diaper.types.${type}`) })
}
export function messageForCalendarEvent(who: string, title: string): string {
  return t('notifications.addedCalendarEvent', { who, title })
}
export function messageForSleepStart(who: string): string {
  return t('notifications.startedSleep', { who })
}
export function formatDuration(durationMinutes: number): string {
  const h = Math.floor(durationMinutes / 60)
  const m = durationMinutes % 60
  return h > 0
    ? t('common.durationHoursMinutes', { h, m })
    : t('common.durationMinutes', { m })
}
export function messageForSleepEnd(who: string, durationMinutes: number): string {
  return t('notifications.wokeUp', { who, duration: formatDuration(durationMinutes) })
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

export function describeDiaper(entry: DiaperEntry): string {
  return messageForDiaper(whoLabel(entry.createdByEmail), entry.type)
}

export function describeCalendarEvent(entry: CalendarEvent): string {
  return messageForCalendarEvent(whoLabel(entry.createdByEmail), entry.title)
}

// Only ever reflects the "just started" state in practice — the bell/
// banner's incoming list is driven by Firestore "added" events (see
// useWatermarkedFeed), which fire once at creation; the later update that
// sets endedAt doesn't re-trigger it. The wake-up push notification (see
// sleepLog.ts endSleep) is a separate, explicit notifyFamily call so that
// half of the story still reaches the family even though it never shows
// up in-app as a second "incoming" item.
export function describeSleep(entry: SleepEntry): string {
  const who = whoLabel(entry.createdByEmail)
  if (entry.endedAt == null) return messageForSleepStart(who)
  return messageForSleepEnd(who, Math.round((entry.endedAt - entry.takenAt) / 60_000))
}

// The only describeX here with no "who" — these are server-fired (a course
// starting/ending or a one-time alarm becoming due), not something a family
// member did, so there's no actor to name.
export function describeMedicationAlert(entry: MedicationAlertEntry): string {
  if (entry.kind === 'courseStart') {
    return t('notifications.courseStartReady', { name: entry.medicationName })
  }
  if (entry.kind === 'courseEnd') {
    return t('notifications.courseEndReady', { name: entry.medicationName })
  }
  if (entry.kind === 'nextDose') {
    return t('notifications.doseReady', { name: entry.medicationName })
  }
  return t('notifications.reminderReady', { name: entry.medicationName })
}
