import type { VercelRequest, VercelResponse } from '@vercel/node'
import { importPKCS8, SignJWT } from 'jose'

// This file deliberately has zero local imports (see the comment at the top
// of ask-alfred.ts) — every attempt at sharing logic via a local module broke
// Vercel's per-file function bundling in production even though it
// type-checked and bundled fine locally with @vercel/ncc.
//
// The vaccination schedule below must be kept in sync BY HAND with
// src/data/vaccinationSchedule.ts — this file can't import it. Only `id`
// and `ageDays` matter here (they drive the due-date math and the
// completedVaccineIds check); names aren't needed for the push copy.
const VACCINATION_SCHEDULE: { id: string; name: string; ageDays: number }[] = [
  { id: 'hepb-1', name: 'Hepatit B (1. doz)', ageDays: 0 },
  { id: 'bcg', name: 'BCG', ageDays: 60 },
  { id: 'altili-1', name: 'Altılı Karma (1. doz)', ageDays: 60 },
  { id: 'kpa-1', name: 'Pnömokok (1. doz)', ageDays: 60 },
  { id: 'altili-2', name: 'Altılı Karma (2. doz)', ageDays: 120 },
  { id: 'kpa-2', name: 'Pnömokok (2. doz)', ageDays: 120 },
  { id: 'altili-3', name: 'Altılı Karma (3. doz)', ageDays: 180 },
  { id: 'opa-1', name: 'OPA (1. doz)', ageDays: 180 },
  { id: 'kkk-1', name: 'KKK (1. doz)', ageDays: 365 },
  { id: 'sucicegi-1', name: 'Suçiçeği (1. doz)', ageDays: 365 },
  { id: 'kpa-pekistirme', name: 'Pnömokok (pekiştirme)', ageDays: 365 },
  { id: 'altili-pekistirme', name: 'Altılı Karma (pekiştirme)', ageDays: 540 },
  { id: 'opa-2', name: 'OPA (2. doz)', ageDays: 540 },
  { id: 'hepa-1', name: 'Hepatit A (1. doz)', ageDays: 540 },
  { id: 'hepa-2', name: 'Hepatit A (2. doz)', ageDays: 730 },
  { id: 'kkk-2', name: 'KKK (2. doz)', ageDays: 1460 },
  { id: 'dabt-ipa-pekistirme', name: 'DaBT-İPA (pekiştirme)', ageDays: 1460 },
  { id: 'sucicegi-2', name: 'Suçiçeği (2. doz)', ageDays: 1460 },
  { id: 'td-pekistirme', name: 'Td (pekiştirme)', ageDays: 4745 },
]

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
    // Data-only payload, deliberately with no top-level `notification`
    // field: when a webpush message carries one, the browser auto-displays
    // it directly *and* firebase-messaging-sw.js's onBackgroundMessage
    // fires and shows a second one — the same push landing twice in the
    // tray. Keeping everything in `data` forces exactly one display path.
    //
    // TTL:43200 (12h) — this says "due tomorrow", still roughly true for
    // most of a day but not worth showing at all a day or more late if
    // delivery got stuck (see check-medication-courses.ts's sendPush for
    // the concrete case that motivated this: a device silently missing
    // pushes because its service worker was stuck on a broken update).
    body: JSON.stringify({
      message: {
        token,
        webpush: { headers: { TTL: '43200' } },
        data: { title, body, tag: 'vaccine-reminder', link: '/asilar' },
      },
    }),
  })
  return res.ok
}

const SCOPES = [
  'https://www.googleapis.com/auth/datastore',
  'https://www.googleapis.com/auth/firebase.messaging',
]

// Vercel Cron (see vercel.json) hits this once a day. It scans every
// family's children for a vaccination whose due date is exactly tomorrow
// and that hasn't been marked done, and pushes a reminder to every member
// of that family — including while their app is closed.
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

  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const tomorrowStart = startOfToday.getTime() + 86_400_000
  const tomorrowEnd = tomorrowStart + 86_400_000

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
        const birthDateStr = child.fields?.birthDate?.stringValue
        let dueName: string | null = null

        if (birthDateStr) {
          const birth = new Date(birthDateStr).getTime()
          const completedIds = new Set(
            (child.fields?.completedVaccineIds?.arrayValue?.values ?? [])
              .map((v) => v.stringValue)
              .filter((v): v is string => !!v),
          )
          const due = VACCINATION_SCHEDULE.find((item) => {
            if (completedIds.has(item.id)) return false
            const dueAt = birth + item.ageDays * 86_400_000
            return dueAt >= tomorrowStart && dueAt < tomorrowEnd
          })
          if (due) dueName = due.name
        }

        // Parent-added vaccines (outside the national schedule) have no
        // birthDate dependency — a plain dueDate string set directly on the
        // entry, checked the same "due tomorrow" way.
        if (!dueName) {
          const customVaccines = child.fields?.customVaccines?.arrayValue?.values ?? []
          const dueCustom = customVaccines.find((v) => {
            const fields = v.mapValue?.fields
            if (!fields || fields.done?.booleanValue) return false
            const dueDateStr = fields.dueDate?.stringValue
            if (!dueDateStr) return false
            const dueAt = new Date(dueDateStr).getTime()
            return dueAt >= tomorrowStart && dueAt < tomorrowEnd
          })
          const customName = dueCustom?.mapValue?.fields?.name?.stringValue
          if (customName) dueName = customName
        }

        if (!dueName) continue

        const childName = child.fields?.name?.stringValue ?? 'Çocuğun'
        const tokenLists = await Promise.all(
          memberUids.map((uid) =>
            listDocuments(accessToken, projectId, `users/${uid}/deviceTokens`),
          ),
        )
        const tokens = tokenLists.flat().map(docId)
        const results = await Promise.allSettled(
          tokens.map((token) =>
            sendPush(
              accessToken,
              projectId,
              token,
              childName,
              `${childName} için yarın ${dueName} zamanı geliyor.`,
            ),
          ),
        )
        notificationsSent += results.filter((r) => r.status === 'fulfilled' && r.value).length
      }
    }
    res.status(200).json({ familiesChecked, notificationsSent })
  } catch (err) {
    console.error('check-upcoming-vaccinations failed', err)
    res.status(500).json({ error: 'Internal error' })
  }
}
