import type { VercelRequest, VercelResponse } from '@vercel/node'
import { importPKCS8, SignJWT } from 'jose'

// This file deliberately has zero local imports (see the comment at the top
// of ask-alfred.ts) — every attempt at sharing logic via a local module broke
// Vercel's per-file function bundling in production even though it
// type-checked and bundled fine locally with @vercel/ncc.

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
        data: { title, body, tag: 'calendar-event-reminder', link: '/takvim' },
      },
    }),
  })
  return res.ok
}

const SCOPES = [
  'https://www.googleapis.com/auth/datastore',
  'https://www.googleapis.com/auth/firebase.messaging',
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Kept in sync by hand with lib/calendarRecurrence.ts's nextOccurrence,
// which this file can't import (see the top-of-file note on zero local
// imports) — but this only needs a yes/no answer for one specific date
// (tomorrow), not "what's the next occurrence", so it's simpler than that
// one rather than a literal copy.
function isDueTomorrow(anchorDate: string, repeat: string | undefined, tomorrowStr: string): boolean {
  if (!repeat) return anchorDate === tomorrowStr
  if (anchorDate > tomorrowStr) return false
  const anchor = new Date(`${anchorDate}T00:00:00Z`)
  const tomorrow = new Date(`${tomorrowStr}T00:00:00Z`)
  if (repeat === 'weekly') {
    const diffDays = Math.round((tomorrow.getTime() - anchor.getTime()) / 86_400_000)
    return diffDays % 7 === 0
  }
  if (repeat === 'monthly') {
    return anchor.getUTCDate() === tomorrow.getUTCDate()
  }
  return false
}

// Vercel Cron (see vercel.json) hits this once a day. It scans every
// family's children for a calendar event whose `date` (a plain YYYY-MM-DD
// string — see types/health.ts) is exactly tomorrow, and pushes a reminder
// to every member of that family — including while their app is closed.
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

  const tomorrow = new Date(Date.now() + 86_400_000)
  const tomorrowStr = `${tomorrow.getUTCFullYear()}-${pad(tomorrow.getUTCMonth() + 1)}-${pad(tomorrow.getUTCDate())}`

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
        const childName = child.fields?.name?.stringValue ?? 'Çocuğun'
        const events = await listDocuments(
          accessToken,
          projectId,
          `families/${familyId}/children/${docId(child)}/calendarEvents`,
        )
        const dueEvents = events.filter((e) =>
          isDueTomorrow(e.fields?.date?.stringValue ?? '', e.fields?.repeat?.stringValue, tomorrowStr),
        )
        if (!dueEvents.length) continue

        const tokenLists = await Promise.all(
          memberUids.map((uid) =>
            listDocuments(accessToken, projectId, `users/${uid}/deviceTokens`),
          ),
        )
        const tokens = tokenLists.flat().map(docId)

        for (const event of dueEvents) {
          const title = event.fields?.title?.stringValue ?? 'Etkinlik'
          const time = event.fields?.time?.stringValue
          const body = time
            ? `${childName} için yarın saat ${time}: ${title}`
            : `${childName} için yarın: ${title}`
          const results = await Promise.allSettled(
            tokens.map((token) => sendPush(accessToken, projectId, token, childName, body)),
          )
          notificationsSent += results.filter((r) => r.status === 'fulfilled' && r.value).length
        }
      }
    }
    res.status(200).json({ familiesChecked, notificationsSent })
  } catch (err) {
    console.error('check-upcoming-calendar-events failed', err)
    res.status(500).json({ error: 'Internal error' })
  }
}
