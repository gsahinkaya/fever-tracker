import type { VercelRequest, VercelResponse } from '@vercel/node'
import { importPKCS8, SignJWT } from 'jose'

// Deliberately zero local imports — see the comment at the top of
// check-upcoming-vaccinations.ts: sharing logic via a local module broke
// Vercel's per-file function bundling in production, so this duplicates the
// same Firestore-REST + FCM boilerplate rather than importing it.

interface ServiceAccount {
  client_email: string
  private_key: string
  project_id: string
}

function getServiceAccount(): ServiceAccount {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not set')
  return JSON.parse(json)
}

async function getGoogleAccessToken(scopes: string[]): Promise<string> {
  const sa = getServiceAccount()
  const now = Math.floor(Date.now() / 1000)
  const privateKey = await importPKCS8(sa.private_key, 'RS256')
  const assertion = await new SignJWT({ scope: scopes.join(' ') })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`)
  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

interface FirestoreValue {
  stringValue?: string
  integerValue?: string
  doubleValue?: number
  booleanValue?: boolean
  timestampValue?: string
  arrayValue?: { values?: FirestoreValue[] }
  mapValue?: { fields?: Record<string, FirestoreValue> }
}

function numberField(v?: FirestoreValue): number | undefined {
  if (!v) return undefined
  if (v.integerValue != null) return Number(v.integerValue)
  return v.doubleValue
}
interface FirestoreDocument {
  name: string
  fields?: Record<string, FirestoreValue>
  updateTime?: string
}

function docId(doc: FirestoreDocument): string {
  return doc.name.split('/').pop()!
}

function baseUrl(projectId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
}

async function listDocuments(
  accessToken: string,
  projectId: string,
  path: string,
  orderBy?: string,
): Promise<FirestoreDocument[]> {
  const query = orderBy ? `pageSize=300&orderBy=${encodeURIComponent(orderBy)}` : 'pageSize=300'
  const res = await fetch(`${baseUrl(projectId)}/${path}?${query}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return []
  const data = (await res.json()) as { documents?: FirestoreDocument[] }
  return data.documents ?? []
}

// Patches a single field on a medication doc so a later poll doesn't
// re-send the same push. `documentName` is the doc's full resource name,
// e.g. ".../documents/families/X/children/Y/medications/Z" (med.name
// as-is).
//
// `ifUnchangedSince`, when given, makes this a conditional write
// (currentDocument.updateTime) instead of an unconditional one — needed
// because this endpoint has two independent triggers that can run
// concurrently (a GitHub Actions poll every 15 min, and vercel.json's own
// daily cron as a fallback in case that workflow ever stops firing, e.g.
// GitHub disabling a schedule after 60 days of repo inactivity — their
// schedules coincide exactly at 0:00/:15/:30/:45, including the daily
// cron's 07:00 UTC slot). Without a precondition, two overlapping
// invocations can both read the same medication as "not yet notified"
// before either has written back, and both send — this is the actual
// cause of the double/triple-notification reports.
//
// Returns whether the write landed (false means it lost the race — someone
// else's write already changed the document's updateTime, so the caller
// should skip sending) and, on success, the patched document's fresh
// updateTime (the PATCH response body is the updated document) so a
// caller chaining a second conditional write to the same document in this
// same request — course start/end/reminder and next-dose can both be due
// for one medication in one poll — uses the up-to-date value instead of
// the now-stale one that would make its own write spuriously lose the
// "race" against itself.
async function patchField(
  accessToken: string,
  documentName: string,
  field: string,
  value: FirestoreValue,
  ifUnchangedSince?: string,
): Promise<{ ok: boolean; updateTime?: string }> {
  const precondition = ifUnchangedSince
    ? `&currentDocument.updateTime=${encodeURIComponent(ifUnchangedSince)}`
    : ''
  const res = await fetch(
    `https://firestore.googleapis.com/v1/${documentName}?updateMask.fieldPaths=${field}${precondition}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { [field]: value } }),
    },
  )
  if (!res.ok) return { ok: false }
  const updated = (await res.json().catch(() => null)) as { updateTime?: string } | null
  return { ok: true, updateTime: updated?.updateTime }
}

// Creates a medicationAlerts doc so this same moment also shows up in the
// in-app bell/banner (App.vue via stores/medicationAlerts.ts) — a field
// patch on the medication doc (patchField above) doesn't trigger
// useWatermarkedFeed's "added" listener the bell relies on, only a genuinely
// new document does. `createdBy` is a sentinel, never a real family
// member's uid, which is exactly what makes that composable's "not my own
// write" filter treat it as incoming for every member.
async function createMedicationAlert(
  accessToken: string,
  projectId: string,
  familyId: string,
  childId: string,
  takenAt: number,
  medicationName: string,
  kind: string,
): Promise<void> {
  await fetch(
    `${baseUrl(projectId)}/families/${familyId}/children/${childId}/medicationAlerts`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          takenAt: { integerValue: String(takenAt) },
          medicationName: { stringValue: medicationName },
          kind: { stringValue: kind },
          createdBy: { stringValue: 'alfred-system' },
        },
      }),
    },
  )
}

// When set, the service worker adds a "Verildi" action button to the
// notification that deep-links straight into /hizli-doz (see
// src/views/QuickDoseView.vue) instead of just opening the app — lets a
// parent log the dose without unlocking the phone and finding the button
// themselves. Only meaningful for a "give a dose now" moment (a reminder or
// the next-dose nudge), not courseEnd, which means the opposite.
interface QuickDose {
  childId: string
  medicationId: string
  medicationName: string
}

async function sendPush(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  quickDose?: QuickDose,
): Promise<boolean> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    // Data-only payload, deliberately with no top-level `notification`
    // field: when a webpush message carries one, the browser auto-displays
    // it directly *and* firebase-messaging-sw.js's onBackgroundMessage
    // fires and shows a second one — the same push landing twice in the
    // tray. Keeping everything in `data` forces exactly one display path.
    body: JSON.stringify({
      message: {
        token,
        data: {
          title,
          body,
          tag: 'medication-course-reminder',
          link: '/ilaclar',
          ...(quickDose
            ? {
                childId: quickDose.childId,
                medId: quickDose.medicationId,
                medName: quickDose.medicationName,
              }
            : {}),
        },
      },
    }),
  })
  return res.ok
}

const SCOPES = [
  'https://www.googleapis.com/auth/datastore',
  'https://www.googleapis.com/auth/firebase.messaging',
]

interface DueCheck {
  fieldTs: string
  fieldNotified: string
  // Matches MedicationAlertKind in src/types/health.ts — kept as a plain
  // string here rather than importing that type (see the top-of-file note
  // on zero local imports).
  kind: 'courseStart' | 'courseEnd' | 'reminder'
  // The notification's title — carries the "who/what" (child + medication)
  // so it's readable at a glance on a lock screen, which can truncate or
  // hide the body entirely. No app name in it: the notification's own icon
  // already identifies which app it's from.
  title: (childName: string, medName: string) => string
  message: (childName: string, medName: string) => string
}

const COURSE_START: DueCheck = {
  fieldTs: 'courseStartAt',
  fieldNotified: 'courseStartNotified',
  kind: 'courseStart',
  title: (childName, medName) => `${childName} için ${medName} kürü başlıyor`,
  message: (childName, medName) =>
    `${childName} için ${medName} kürünü başlatma zamanı geldi. Kür boyunca düzenli vermeyi unutma.`,
}
const COURSE_END: DueCheck = {
  fieldTs: 'courseEndAt',
  fieldNotified: 'courseEndNotified',
  kind: 'courseEnd',
  title: (childName, medName) => `${childName} için ${medName} kürü bitti`,
  message: (childName, medName) =>
    `${childName} için ${medName} kürü sona erdi. Kürü yarıda bırakmadığından emin ol.`,
}
const REMINDER: DueCheck = {
  fieldTs: 'reminderAt',
  fieldNotified: 'reminderNotified',
  kind: 'reminder',
  title: (childName, medName) => `${childName} için ${medName} hatırlatması`,
  message: (childName, medName) => `${childName} için ${medName} hatırlatma zamanı geldi.`,
}

// Claims this exact moment first (a conditional write, so at most one
// concurrent invocation wins it — see patchField's comment on why this
// endpoint needs that), then sends one push and records the
// medicationAlerts doc (so it also shows up in the in-app bell) only if
// the claim actually landed. Shared by the fixed-timestamp checks (course
// start/end, the one-time reminder alarm) and the recurring next-dose
// check below, which otherwise duplicated this claim/token-lookup/push
// sequence three-and-then-four ways.
async function pushAndMark(
  accessToken: string,
  projectId: string,
  memberUids: string[],
  familyId: string,
  childId: string,
  dueAt: number,
  medName: string,
  medicationId: string,
  kind: 'courseStart' | 'courseEnd' | 'reminder' | 'nextDose',
  title: string,
  message: string,
  documentName: string,
  documentUpdateTime: string | undefined,
  notifiedField: string,
  notifiedValue: FirestoreValue,
): Promise<{ sent: number; updateTime?: string }> {
  // Mark notified regardless of whether any device tokens existed —
  // otherwise a family with no registered devices yet would get this same
  // "due" moment re-evaluated (harmlessly, just wasted work) on every
  // single poll forever.
  const claim = await patchField(
    accessToken,
    documentName,
    notifiedField,
    notifiedValue,
    documentUpdateTime,
  )
  // Lost the race to a concurrent invocation — it already handled this
  // moment. Still hand back the original updateTime unchanged, since we
  // didn't write anything.
  if (!claim.ok) return { sent: 0, updateTime: documentUpdateTime }

  // The in-app bell entry is created unconditionally (not gated on token
  // lookup below) since a family member with the app open right now should
  // see it even if push delivery had nothing to reach.
  const alertPromise = createMedicationAlert(
    accessToken,
    projectId,
    familyId,
    childId,
    dueAt,
    medName,
    kind,
  )
  const tokenLists = await Promise.all(
    memberUids.map((uid) => listDocuments(accessToken, projectId, `users/${uid}/deviceTokens`)),
  )
  const tokens = tokenLists.flat().map(docId)
  // courseEnd means "the course is over" — the opposite of "give a dose
  // now" — so it's the one kind that doesn't get the quick-log action.
  const quickDose: QuickDose | undefined =
    kind !== 'courseEnd' ? { childId, medicationId, medicationName: medName } : undefined
  const results = await Promise.allSettled(
    tokens.map((token) => sendPush(accessToken, projectId, token, title, message, quickDose)),
  )
  await alertPromise
  return {
    sent: results.filter((r) => r.status === 'fulfilled' && r.value).length,
    updateTime: claim.updateTime,
  }
}

// Vercel Cron (see vercel.json) hits this once a day as a fallback; a
// GitHub Actions workflow can hit it every few minutes for much closer to
// real-time delivery (Vercel Hobby can't schedule cron more often than
// daily). Each poll scans every family's children's medications for a
// courseStartAt, courseEndAt, or reminderAt (see types/health.ts
// Medication) that's due and not yet notified, AND for whether the next
// dose interval (minIntervalHours since the last logged dose) has come
// due — pushing to every member of that family, including while their app
// is closed. useDoseReminders' foreground-only version of the interval
// check still runs too (it's what shows the in-app "next safe dose"
// banner while the app is open); this is what reaches a closed app/PWA,
// which that one never could on its own.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Fails closed: a missing CRON_SECRET is a misconfiguration, not an
  // excuse to let this endpoint (which pushes to every family in the
  // database) sit open to whoever finds the URL.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const projectId = getServiceAccount().project_id
  const accessToken = await getGoogleAccessToken(SCOPES)
  const now = Date.now()

  let familiesChecked = 0
  let notificationsSent = 0

  try {
    const families = await listDocuments(accessToken, projectId, 'families')
    for (const family of families) {
      familiesChecked++
      const familyId = docId(family)
      const memberUids = Object.keys(family.fields?.members?.mapValue?.fields ?? {})
      const children = await listDocuments(
        accessToken,
        projectId,
        `families/${familyId}/children`,
      )

      for (const child of children) {
        const childId = docId(child)
        const childName = child.fields?.name?.stringValue ?? 'Çocuğun'
        const medications = await listDocuments(
          accessToken,
          projectId,
          `families/${familyId}/children/${childId}/medications`,
        )
        if (!medications.length) continue

        // Fetched once per child (not per medication) — every medication's
        // last-dose lookup below reads from this same list. Doses and fever
        // readings share the `entries` collection (see stores/feverLog.ts),
        // so this is filtered by `type: 'dose'` per medication below.
        // Ordered newest-first (unlike every other listDocuments call here)
        // because this collection is the fastest-growing one in the app —
        // without an explicit order, the 300-doc page cap could return an
        // arbitrary older slice that misses the actual most recent dose.
        const entries = await listDocuments(
          accessToken,
          projectId,
          `families/${familyId}/children/${childId}/entries`,
          'takenAt desc',
        )

        for (const med of medications) {
          const medName = med.fields?.name?.stringValue ?? 'İlaç'

          // No lower bound on how overdue this can be — a late medical
          // reminder is far better than a permanently silent one. A stray
          // outage (the CRON_SECRET misconfiguration this endpoint shipped
          // with initially, for example) would otherwise leave a moment
          // stuck forever once it aged out of a fixed lookback window,
          // since nothing else ever re-checks it. The notified flag alone
          // guarantees each moment still only ever fires once.
          // Threaded through both checks below (course/reminder, then
          // next-dose) rather than each reading med.updateTime directly —
          // if the first one actually wrote, the document's real
          // updateTime has moved on, and the second conditional write
          // needs the fresh value or it would spuriously "lose the race"
          // against its own sibling write.
          let medUpdateTime = med.updateTime

          const due = [COURSE_START, COURSE_END, REMINDER].find((check) => {
            const ts = med.fields?.[check.fieldTs]?.integerValue
            if (ts == null || med.fields?.[check.fieldNotified]?.booleanValue) return false
            return Number(ts) <= now
          })
          if (due) {
            const dueAt = Number(med.fields![due.fieldTs]!.integerValue)
            const result = await pushAndMark(
              accessToken,
              projectId,
              memberUids,
              familyId,
              childId,
              dueAt,
              medName,
              docId(med),
              due.kind,
              due.title(childName, medName),
              due.message(childName, medName),
              med.name,
              medUpdateTime,
              due.fieldNotified,
              { booleanValue: true },
            )
            notificationsSent += result.sent
            medUpdateTime = result.updateTime
          }

          // The multiple-times-a-day "time for the next dose" reminder —
          // server-side counterpart to useDoseReminders' foreground-only
          // version, which never reaches a closed app/PWA. A finished
          // course (antibiotics being the classic case) shouldn't keep
          // nagging once it's over, even though the interval math would
          // otherwise happily keep producing one.
          const courseEndAt = numberField(med.fields?.courseEndAt)
          if (courseEndAt != null && now > courseEndAt) continue

          const minIntervalHours = numberField(med.fields?.minIntervalHours)
          if (minIntervalHours == null) continue

          // `entries` is ordered newest-first, so the first match is the
          // last dose actually given.
          const lastDoseDoc = entries.find(
            (e) =>
              e.fields?.type?.stringValue === 'dose' &&
              e.fields?.medicationId?.stringValue === docId(med) &&
              e.fields?.takenAt?.timestampValue,
          )
          if (!lastDoseDoc) continue
          const lastDoseId = docId(lastDoseDoc)
          const lastDoseTakenAt = new Date(lastDoseDoc.fields!.takenAt!.timestampValue!).getTime()

          const safeAt = lastDoseTakenAt + minIntervalHours * 60 * 60 * 1000
          if (safeAt > now) continue
          if (med.fields?.nextDoseNotifiedFor?.stringValue === lastDoseId) continue

          const nextDoseResult = await pushAndMark(
            accessToken,
            projectId,
            memberUids,
            familyId,
            childId,
            safeAt,
            medName,
            docId(med),
            'nextDose',
            `${childName} için ${medName} zamanı`,
            `${childName} için ${medName} vermek üzere güvenli doz zamanı geldi.`,
            med.name,
            medUpdateTime,
            'nextDoseNotifiedFor',
            { stringValue: lastDoseId },
          )
          notificationsSent += nextDoseResult.sent
        }
      }
    }
    res.status(200).json({ familiesChecked, notificationsSent })
  } catch (err) {
    console.error('check-medication-courses failed', err)
    res.status(500).json({ error: 'Internal error' })
  }
}
