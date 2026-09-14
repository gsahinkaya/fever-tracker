import type { VercelRequest, VercelResponse } from '@vercel/node'
import { importPKCS8, SignJWT } from 'jose'

// Deliberately zero local imports — see the comment at the top of
// check-medication-courses.ts: sharing this Firestore-REST + FCM
// boilerplate via a local module broke Vercel's per-file function bundling
// in production, so every check-*.ts endpoint duplicates it instead.

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

// Conditional write (currentDocument.updateTime) so two overlapping
// invocations (a GitHub Actions poll every 15 min, plus vercel.json's daily
// cron as a fallback — see check-medication-courses.ts's patchField for the
// full story) can't both read the same child as "not yet notified" and
// both send. Returns false when it lost that race.
async function patchField(
  accessToken: string,
  documentName: string,
  field: string,
  value: FirestoreValue,
  ifUnchangedSince: string,
): Promise<boolean> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/${documentName}?updateMask.fieldPaths=${field}&currentDocument.updateTime=${encodeURIComponent(ifUnchangedSince)}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { [field]: value } }),
    },
  )
  return res.ok
}

// Creates a feedingReminders doc so this same moment also shows up in the
// in-app bell/banner (App.vue via stores/feedingReminders.ts) — a field
// patch on the child doc (patchField above) doesn't trigger
// useWatermarkedFeed's "added" listener the bell relies on, only a genuinely
// new document does. `createdBy` is a sentinel, never a real family
// member's uid — see MedicationAlertEntry's comment in types/health.ts for
// why that's exactly what makes it show as "incoming" for every member.
async function createFeedingReminderAlert(
  accessToken: string,
  projectId: string,
  familyId: string,
  childId: string,
  takenAt: number,
  childName: string,
): Promise<void> {
  await fetch(`${baseUrl(projectId)}/families/${familyId}/children/${childId}/feedingReminders`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        takenAt: { integerValue: String(takenAt) },
        childName: { stringValue: childName },
        createdBy: { stringValue: 'alfred-system' },
      },
    }),
  })
}

async function sendPush(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
): Promise<boolean> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    // Data-only payload (no top-level `notification`) and a single clean
    // sentence as the title with an empty body — see
    // check-medication-courses.ts's sendPush for why both of those matter
    // (double display on some browsers; a redundant second line on a lock
    // screen otherwise).
    body: JSON.stringify({
      message: {
        token,
        // Urgency:high — see notify-family.ts's sendPush for why this
        // matters alongside TTL for time-sensitive delivery.
        webpush: { headers: { TTL: '3600', Urgency: 'high' } },
        data: { title, body: '', tag: 'feeding-reminder', link: '/feeding' },
      },
    }),
  })
  return res.ok
}

const SCOPES = [
  'https://www.googleapis.com/auth/datastore',
  'https://www.googleapis.com/auth/firebase.messaging',
]

// Server-side counterpart to useFeedingReminders' foreground-only version
// (src/composables/useFeedingReminders.ts), the same split as
// check-medication-courses.ts/useDoseReminders — this is what reaches a
// closed app/PWA. Each poll scans every family's children for a
// feedingReminderIntervalHours (see types/family.ts Child) and, when set,
// checks whether that many hours have passed since the last breastfeeding
// or bottle entry (solid food doesn't count).
export default async function handler(req: VercelRequest, res: VercelResponse) {
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
        const intervalHours = numberField(child.fields?.feedingReminderIntervalHours)
        if (!intervalHours) continue

        const childId = docId(child)
        const childName = child.fields?.name?.stringValue ?? 'Çocuğun'

        // Newest-first so the first breastfeeding/bottle match is the last
        // one that actually counts — solid food doesn't reset this timer.
        const feedings = await listDocuments(
          accessToken,
          projectId,
          `families/${familyId}/children/${childId}/feedings`,
          'takenAt desc',
        )
        const lastFeeding = feedings.find((f) => {
          const type = f.fields?.type?.stringValue
          return (type === 'breastfeeding' || type === 'bottle') && f.fields?.takenAt?.timestampValue
        })
        if (!lastFeeding) continue

        const lastFeedingId = docId(lastFeeding)
        const lastFeedingAt = new Date(lastFeeding.fields!.takenAt!.timestampValue!).getTime()
        const dueAt = lastFeedingAt + intervalHours * 60 * 60 * 1000
        if (dueAt > now) continue
        if (child.fields?.feedingReminderNotifiedFor?.stringValue === lastFeedingId) continue
        if (!child.updateTime) continue

        const claimed = await patchField(
          accessToken,
          child.name,
          'feedingReminderNotifiedFor',
          { stringValue: lastFeedingId },
          child.updateTime,
        )
        // Lost the race to a concurrent invocation, or the child doc has no
        // updateTime to condition on — either way, someone else already
        // handled (or will handle) this moment.
        if (!claimed) continue

        // Unconditional (not gated on token lookup below) so a family
        // member with the app open right now sees it even if push delivery
        // had nothing to reach — same reasoning as
        // check-medication-courses.ts's pushAndMark.
        const alertPromise = createFeedingReminderAlert(
          accessToken,
          projectId,
          familyId,
          childId,
          dueAt,
          childName,
        )

        const tokenLists = await Promise.all(
          memberUids.map((uid) => listDocuments(accessToken, projectId, `users/${uid}/deviceTokens`)),
        )
        const tokens = tokenLists.flat().map(docId)
        const message = `${childName} için beslenme zamanı geldi`
        const results = await Promise.allSettled(
          tokens.map((token) => sendPush(accessToken, projectId, token, message)),
        )
        await alertPromise
        notificationsSent += results.filter((r) => r.status === 'fulfilled' && r.value).length
      }
    }
    res.status(200).json({ familiesChecked, notificationsSent })
  } catch (err) {
    console.error('check-feeding-reminders failed', err)
    res.status(500).json({ error: 'Internal error' })
  }
}
