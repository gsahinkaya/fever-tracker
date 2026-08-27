import { createRemoteJWKSet, jwtVerify } from 'jose'

// Verifying a Firebase ID token doesn't require the Admin SDK (and its heavy,
// serverless-bundler-unfriendly dependency tree) — it's a standard RS256 JWT
// signed with Google's rotating public keys. Verifying it directly with a
// lightweight JOSE library needs no service-account secret at all. Shared by
// every api/ route that needs "is this a real signed-in Firebase user".
const JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
)

// Returns the verified caller's uid.
export async function verifyFirebaseToken(idToken: string): Promise<string> {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID
  if (!projectId) throw new Error('VITE_FIREBASE_PROJECT_ID is not set')
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  })
  if (typeof payload.sub !== 'string') throw new Error('Token has no subject')
  return payload.sub
}

export function bearerToken(authHeader: string | undefined): string | null {
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
}
