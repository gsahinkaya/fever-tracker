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
  // Course dates for medications that must run for a fixed period rather
  // than indefinitely (antibiotics being the classic case) — both optional
  // millisecond timestamps (like openedAt) rather than date-only strings,
  // since a course reminder needs the actual clock time (e.g. "starts at
  // 14:00") not just the day. Drives both the in-app dose reminder
  // (useDoseReminders) and the daily push cron
  // (api/check-medication-courses.ts) that nudges when the course
  // starts/ends, since a course that's never had a dose logged yet would
  // otherwise never trigger the interval-based reminder at all.
  courseStartAt?: number
  courseEndAt?: number
  // Set once check-medication-courses.ts has actually sent the course
  // start/end push for the *current* value of courseStartAt/courseEndAt —
  // lets the cron poll frequently (every few minutes, via GitHub Actions;
  // see .github/workflows) without re-sending the same push on every poll.
  // Reset to false client-side (MedicationsView.vue save()) whenever the
  // parent changes the course date to a new value.
  courseStartNotified?: boolean
  courseEndNotified?: boolean
  // A one-time alarm independent of both the interval reminder and the
  // course dates above — usable on any medication (not just a course) for
  // "remind me to give this at a specific date/time" regardless of dose
  // history. Same notified-flag pattern as the course fields.
  reminderAt?: number
  reminderNotified?: boolean
  // Server-side counterpart to useDoseReminders' foreground-only "time for
  // the next dose" check (api/check-medication-courses.ts) — since that
  // reminder recurs every minIntervalHours rather than firing once, a
  // boolean can't track it; this instead holds the id of the dose entry
  // it was last sent for, so a newly-logged dose (a new id) naturally
  // re-arms it for the next interval.
  nextDoseNotifiedFor?: string
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

// A newborn's diaper changes are tracked separately from other symptoms —
// pee/poop frequency is a routine pediatric hydration/feeding check, not an
// illness signal, and parents log it far more often than an actual symptom.
export type DiaperType = 'pee' | 'poop' | 'both'

export interface DiaperEntry {
  id: string
  takenAt: number
  type: DiaperType
  note?: string
  createdBy?: string
  createdByEmail?: string
}

// A record of a medication course-start/course-end/reminder push that the
// server (api/check-medication-courses.ts) already fired — created purely
// so the same moment also shows up in the in-app bell/banner (App.vue),
// which otherwise only reacts to a client writing a brand-new document via
// useWatermarkedFeed's "added" listener. A boolean field flipping on an
// existing medication doc (courseStartNotified etc.) doesn't trigger that,
// so the server creates one of these instead — the only entry type in the
// app whose `createdBy` is never a real family member's uid (a sentinel
// value instead), which is what makes useWatermarkedFeed's "not my own
// write" filter treat it as incoming for every member.
export type MedicationAlertKind = 'courseStart' | 'courseEnd' | 'reminder' | 'nextDose'

export interface MedicationAlertEntry {
  id: string
  takenAt: number
  medicationName: string
  kind: MedicationAlertKind
  createdBy?: string
  createdByEmail?: string
}

// A future-dated reminder (doctor appointment, a friend's birthday, any
// other special day) — unlike every other entry type here, `date` looks
// forward rather than logging something that already happened, and the
// server (api/check-upcoming-calendar-events.ts) pushes a reminder the day
// before, the same "due tomorrow" check used for vaccinations. `date` is a
// plain YYYY-MM-DD string (like CustomVaccine.dueDate) rather than a
// Firestore Timestamp — this is a day-granularity date, not a moment in
// time, and a Timestamp would round-trip through UTC on every read/write
// for no benefit.
export interface CalendarEvent {
  id: string
  title: string
  date: string
  // Optional HH:mm — a birthday or "special day" usually has none (an
  // all-day event), while a doctor's appointment usually does. Kept
  // separate from `date` rather than combined into one timestamp so an
  // event can stay a plain day even without a time.
  time?: string
  note?: string
  createdBy?: string
  createdByEmail?: string
  // When the event was added (not `date`, which is when it's scheduled for)
  // — drives the "did someone else just add this" bell/banner notification,
  // same role as Medication.createdAt.
  createdAt?: number
}

export interface SleepEntry {
  id: string
  // Kept as `takenAt` (matching every other entry type) so this can go
  // through the same useWatermarkedFeed/sortKey/recentEntries machinery —
  // it's the start time, i.e. when the sleep session began.
  takenAt: number
  // Absent while the sleep is still ongoing (started but not yet ended).
  endedAt?: number
  createdBy?: string
  createdByEmail?: string
}
