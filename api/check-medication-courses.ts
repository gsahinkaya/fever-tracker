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
  booleanValue?: boolean
  arrayValue?: { values?: FirestoreValue[] }
  mapValue?: { fields?: Record<string, FirestoreValue> }
}
interface FirestoreDocument {
  name: string
  fields?: Record<string, FirestoreValue>
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
): Promise<FirestoreDocument[]> {
  const res = await fetch(`${baseUrl(projectId)}/${path}?pageSize=300`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return []
  const data = (await res.json()) as { documents?: FirestoreDocument[] }
  return data.documents ?? []
}

// Marks a single boolean field on a medication doc so the next poll (this
// endpoint is meant to be hit every few minutes — see
// .github/workflows/medication-reminders.yml) doesn't re-send the same
// push. `documentName` is the doc's full resource name, e.g.
// ".../documents/families/X/children/Y/medications/Z" (med.name as-is).
async function markNotified(
  accessToken: string,
  documentName: string,
  field: string,
): Promise<void> {
  await fetch(`https://firestore.googleapis.com/v1/${documentName}?updateMask.fieldPaths=${field}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { [field]: { booleanValue: true } } }),
  })
}

// Creates a medicationAlerts doc so this same moment also shows up in the
// in-app bell/banner (App.vue via stores/medicationAlerts.ts) — a boolean
// field flip on the medication doc (markNotified above) doesn't trigger
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
          createdBy: { stringValue: 'kido-system' },
        },
      }),
    },
  )
}

async function sendPush(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
): Promise<boolean> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: { tag: 'medication-course-reminder' },
        webpush: { fcm_options: { link: '/ilaclar' } },
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
  message: (childName: string, medName: string) => string
}

const COURSE_START: DueCheck = {
  fieldTs: 'courseStartAt',
  fieldNotified: 'courseStartNotified',
  kind: 'courseStart',
  message: (childName, medName) =>
    `${childName} için ${medName} kürünü başlatma zamanı geldi. Kür boyunca düzenli vermeyi unutma.`,
}
const COURSE_END: DueCheck = {
  fieldTs: 'courseEndAt',
  fieldNotified: 'courseEndNotified',
  kind: 'courseEnd',
  message: (childName, medName) =>
    `${childName} için ${medName} kürü sona erdi. Kürü yarıda bırakmadığından emin ol.`,
}
const REMINDER: DueCheck = {
  fieldTs: 'reminderAt',
  fieldNotified: 'reminderNotified',
  kind: 'reminder',
  message: (childName, medName) => `${childName} için ${medName} hatırlatma zamanı geldi.`,
}

// Vercel Cron (see vercel.json) hits this once a day as a fallback; a
// GitHub Actions workflow can hit it every few minutes for much closer to
// real-time delivery (Vercel Hobby can't schedule cron more often than
// daily). Each poll scans every family's children's medications for a
// courseStartAt, courseEndAt, or
// reminderAt (see types/health.ts Medication) that's due and not yet
// notified, and pushes to every member of that family — including while
// their app is closed. The multiple-times-a-day "time for the next dose"
// reminder stays foreground-only (useDoseReminders) since it depends on
// dose history, not a fixed timestamp.
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

        for (const med of medications) {
          const medName = med.fields?.name?.stringValue ?? 'İlaç'

          // No lower bound on how overdue this can be — a late medical
          // reminder is far better than a permanently silent one. A stray
          // outage (the CRON_SECRET misconfiguration this endpoint shipped
          // with initially, for example) would otherwise leave a moment
          // stuck forever once it aged out of a fixed lookback window,
          // since nothing else ever re-checks it. The notified flag alone
          // guarantees each moment still only ever fires once.
          const due = [COURSE_START, COURSE_END, REMINDER].find((check) => {
            const ts = med.fields?.[check.fieldTs]?.integerValue
            if (ts == null || med.fields?.[check.fieldNotified]?.booleanValue) return false
            return Number(ts) <= now
          })
          if (!due) continue
          const dueAt = Number(med.fields![due.fieldTs]!.integerValue)

          const tokenLists = await Promise.all(
            memberUids.map((uid) =>
              listDocuments(accessToken, projectId, `users/${uid}/deviceTokens`),
            ),
          )
          const tokens = tokenLists.flat().map(docId)
          const results = await Promise.allSettled(
            tokens.map((token) =>
              sendPush(accessToken, projectId, token, 'Kido', due.message(childName, medName)),
            ),
          )
          notificationsSent += results.filter((r) => r.status === 'fulfilled' && r.value).length
          // Mark notified regardless of whether any device tokens existed —
          // otherwise a family with no registered devices yet would get
          // this same "due" moment re-evaluated (harmlessly, just wasted
          // work) on every single poll forever. The in-app bell entry is
          // created unconditionally too, since a family member with the app
          // open right now should see it even if push delivery had nothing
          // to reach.
          await Promise.all([
            markNotified(accessToken, med.name, due.fieldNotified),
            createMedicationAlert(accessToken, projectId, familyId, childId, dueAt, medName, due.kind),
          ])
        }
      }
    }
    res.status(200).json({ familiesChecked, notificationsSent })
  } catch (err) {
    console.error('check-medication-courses failed', err)
    res.status(500).json({ error: 'Internal error' })
  }
}
