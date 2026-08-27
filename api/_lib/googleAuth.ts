import { importPKCS8, SignJWT } from 'jose'

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

export function getServiceAccountProjectId(): string {
  return getServiceAccount().project_id
}

// Warm-lambda-instance cache — avoids a token-exchange round trip on every
// request while the same serverless instance is reused, without needing any
// external store. Re-minted once ~5 min from expiry.
let cachedToken: { token: string; expiresAt: number } | null = null

// Mints a short-lived Google OAuth2 access token from the service account's
// private key (a signed JWT assertion exchanged at Google's token endpoint)
// — the same mechanism firebase-admin uses internally, done directly with
// `jose` so this project doesn't need to pull in the Admin SDK (see
// verifyToken.ts for why that's avoided here).
export async function getGoogleAccessToken(scopes: string[]): Promise<string> {
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
