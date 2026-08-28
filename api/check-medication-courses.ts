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

// Vercel Cron (see vercel.json) hits this once a day. It scans every
// family's children for a medication whose courseStartAt or courseEndAt
// (see types/health.ts Medication — both precise timestamps, not just a
// date) falls within today's UTC calendar day, and pushes a reminder to
// every member of that family — including while their app is closed. The
// multiple-times-a-day "time for the next dose" reminder stays
// foreground-only (useDoseReminders) since a daily cron can't do hourly
// granularity; this cron only covers the two day-level moments that matter
// most for a fixed-length course like antibiotics: starting it and not
// stopping it early.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const projectId = getServiceAccount().project_id
  const accessToken = await getGoogleAccessToken(SCOPES)
  const startOfToday = new Date()
  startOfToday.setUTCHours(0, 0, 0, 0)
  const todayStart = startOfToday.getTime()
  const todayEnd = todayStart + 86_400_000

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
          const startAt = med.fields?.courseStartAt?.integerValue
          const endAt = med.fields?.courseEndAt?.integerValue
          const medName = med.fields?.name?.stringValue ?? 'İlaç'

          const startsToday = startAt != null && Number(startAt) >= todayStart && Number(startAt) < todayEnd
          const endsToday = endAt != null && Number(endAt) >= todayStart && Number(endAt) < todayEnd

          let body: string | null = null
          if (startsToday) {
            body = `${childName} için ${medName} kürü bugün başlıyor. Kür boyunca düzenli vermeyi unutma.`
          } else if (endsToday) {
            body = `${childName} için ${medName} kürü bugün sona eriyor. Kürü yarıda bırakmadığından emin ol.`
          }
          if (!body) continue

          const tokenLists = await Promise.all(
            memberUids.map((uid) =>
              listDocuments(accessToken, projectId, `users/${uid}/deviceTokens`),
            ),
          )
          const tokens = tokenLists.flat().map(docId)
          const results = await Promise.allSettled(
            tokens.map((token) => sendPush(accessToken, projectId, token, 'Kido', body!)),
          )
          notificationsSent += results.filter((r) => r.status === 'fulfilled' && r.value).length
        }
      }
    }
    res.status(200).json({ familiesChecked, notificationsSent })
  } catch (err) {
    console.error('check-medication-courses failed', err)
    res.status(500).json({ error: 'Internal error' })
  }
}
