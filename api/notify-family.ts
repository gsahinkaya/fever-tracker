import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'jose'

// This file deliberately has zero local imports (see the comment at the top
// of kido-sor.ts) — every attempt at sharing this logic via a local module
// (api/_lib, a project-root server/ dir) crashed both functions with
// FUNCTION_INVOCATION_FAILED / ERR_MODULE_NOT_FOUND on Vercel's real
// deploy, despite type-checking and bundling fine locally with @vercel/ncc.

// --- Firebase ID token verification (duplicated from kido-sor.ts) ---
const JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
)

async function verifyFirebaseToken(idToken: string): Promise<string> {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID
  if (!projectId) throw new Error('VITE_FIREBASE_PROJECT_ID is not set')
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  })
  if (typeof payload.sub !== 'string') throw new Error('Token has no subject')
  return payload.sub
}

// --- Service-account-derived Google OAuth access token ---
interface ServiceAccount {
  client_email: string
  private_key: string
  project_id: string
}

let serviceAccount: ServiceAccount | null = null

function getServiceAccount(): ServiceAccount {
  if (serviceAccount) return serviceAccount
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!json) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not set')
  serviceAccount = JSON.parse(json)
  return serviceAccount!
}

let cachedToken: { token: string; expiresAt: number } | null = null

async function getGoogleAccessToken(scopes: string[]): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt > now + 300) return cachedToken.token

  const sa = getServiceAccount()
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

  const data = (await res.json()) as { access_token: string; expires_in: number }
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in }
  return data.access_token
}

// --- Minimal Firestore REST reads ---
interface FirestoreDocument {
  name: string
  fields?: Record<string, FirestoreValue>
}
interface FirestoreValue {
  mapValue?: { fields?: Record<string, FirestoreValue> }
}

function docUrl(projectId: string, path: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`
}

async function getFamilyMemberUids(
  accessToken: string,
  projectId: string,
  familyId: string,
): Promise<string[]> {
  const res = await fetch(docUrl(projectId, `families/${familyId}`), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return []
  const data = (await res.json()) as FirestoreDocument
  const membersField = data.fields?.members?.mapValue?.fields ?? {}
  return Object.keys(membersField)
}

async function getDeviceTokens(
  accessToken: string,
  projectId: string,
  uid: string,
): Promise<string[]> {
  const res = await fetch(docUrl(projectId, `users/${uid}/deviceTokens`), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return []
  const data = (await res.json()) as { documents?: FirestoreDocument[] }
  return (data.documents ?? []).map((d) => d.name.split('/').pop()!)
}

// --- FCM send ---
async function sendPush(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  tag: string,
): Promise<boolean> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        data: { tag },
        webpush: { fcm_options: { link: '/' } },
      },
    }),
  })
  if (!res.ok) console.error('FCM send failed', res.status, await res.text())
  return res.ok
}

const SCOPES = [
  'https://www.googleapis.com/auth/datastore',
  'https://www.googleapis.com/auth/firebase.messaging',
]

// Called right after a client writes a fever/medication/feeding/growth
// entry, to push the same "someone in your family just did X" notification
// to every OTHER member's registered devices — including while their app is
// closed, which the existing foreground-only Notification path can't reach.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const authHeader = req.headers.authorization
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!idToken) {
    res.status(401).json({ error: 'Giriş yapman gerekiyor.' })
    return
  }

  let callerUid: string
  try {
    callerUid = await verifyFirebaseToken(idToken)
  } catch {
    res.status(401).json({ error: 'Oturum geçersiz, tekrar giriş yap.' })
    return
  }

  const { familyId, title, body, tag } = (req.body ?? {}) as Record<string, unknown>
  if (typeof familyId !== 'string' || typeof title !== 'string' || typeof body !== 'string') {
    res.status(400).json({ error: 'Eksik parametre.' })
    return
  }

  try {
    const projectId = getServiceAccount().project_id
    const accessToken = await getGoogleAccessToken(SCOPES)

    // Only an actual member of this family can trigger a push to it —
    // otherwise any signed-in user who knew/guessed a familyId could spam
    // another family's devices.
    const memberUids = await getFamilyMemberUids(accessToken, projectId, familyId)
    if (!memberUids.includes(callerUid)) {
      res.status(403).json({ error: 'Bu aileye erişimin yok.' })
      return
    }

    const otherUids = memberUids.filter((uid) => uid !== callerUid)
    const tokenLists = await Promise.all(
      otherUids.map((uid) => getDeviceTokens(accessToken, projectId, uid)),
    )
    const tokens = tokenLists.flat()

    const results = await Promise.allSettled(
      tokens.map((token) =>
        sendPush(accessToken, projectId, token, title, body, typeof tag === 'string' ? tag : ''),
      ),
    )
    const sent = results.filter((r) => r.status === 'fulfilled' && r.value).length

    res.status(200).json({ sent, targeted: tokens.length })
  } catch (err) {
    console.error('notify-family failed', err)
    res.status(500).json({ error: 'Bildirim gönderilemedi.' })
  }
}
