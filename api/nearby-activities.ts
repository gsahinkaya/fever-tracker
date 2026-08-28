import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createRemoteJWKSet, jwtVerify } from 'jose'

// This file deliberately does NOT import from a shared local module — see
// the comment at the top of kido-sor.ts for why: every attempt at sharing
// this ~15-line check via a local module broke Vercel's per-file function
// bundling in production even though it type-checked and bundled fine
// locally with @vercel/ncc.
const JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
)

async function verifyFirebaseToken(idToken: string) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID
  if (!projectId) throw new Error('VITE_FIREBASE_PROJECT_ID is not set')
  await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  })
}

// Kept in sync by hand with src/composables/useNearbyActivities.ts, which
// can't import this file (see note above) — the client sends lat/lon only,
// this builds the actual Overpass query server-side.
const CATEGORIES: { tag: string; value: string }[] = [
  { tag: 'amenity', value: 'cinema' },
  { tag: 'amenity', value: 'theatre' },
  { tag: 'tourism', value: 'zoo' },
  { tag: 'tourism', value: 'aquarium' },
  { tag: 'tourism', value: 'museum' },
  { tag: 'tourism', value: 'theme_park' },
  { tag: 'leisure', value: 'amusement_arcade' },
  { tag: 'leisure', value: 'bowling_alley' },
]
const RADIUS_METERS = 10_000

function buildOverpassQuery(lat: number, lon: number): string {
  const clauses = CATEGORIES.flatMap(({ tag, value }) => [
    `node["${tag}"="${value}"](around:${RADIUS_METERS},${lat},${lon});`,
    `way["${tag}"="${value}"](around:${RADIUS_METERS},${lat},${lon});`,
  ]).join('\n  ')
  // Kept under maxDuration below with margin for network/cold-start
  // overhead — a dense city center (many results across 8 categories) is
  // the slow case this needs to survive without Vercel killing the
  // function first.
  return `[out:json][timeout:20];\n(\n  ${clauses}\n);\nout center tags;`
}

// Vercel's default serverless timeout (~10s) isn't enough for Overpass
// under load in a dense city — this function was hitting it and returning
// a hard 502 for exactly the users in busy areas who'd get the most value
// from this feature. Hobby plan allows up to 60s.
export const config = {
  maxDuration: 30,
}

// This app talks to Overpass server-side (not directly from the browser,
// unlike Nominatim reverse-geocoding elsewhere in the app) because
// overpass-api.de's CORS behavior turned out to be inconsistent in
// production — it sometimes omits Access-Control-Allow-Origin, which
// silently breaks the browser fetch with no way to retry around it.
// Server-to-server requests aren't subject to CORS at all, so proxying
// here sidesteps the flakiness entirely. No API key involved — this is
// purely a CORS workaround, not a secret to protect — but auth is still
// required to keep this endpoint from being an open proxy for arbitrary
// traffic to Overpass.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const authHeader = req.headers.authorization
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!idToken) {
    res.status(401).json({ error: 'Giriş yapman gerekiyor.' })
    return
  }
  try {
    await verifyFirebaseToken(idToken)
  } catch {
    res.status(401).json({ error: 'Oturum geçersiz, tekrar giriş yap.' })
    return
  }

  const lat = Number(req.query.lat)
  const lon = Number(req.query.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    res.status(400).json({ error: 'Konum gerekli.' })
    return
  }

  try {
    const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(buildOverpassQuery(lat, lon))}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    if (!overpassRes.ok) {
      console.error('Overpass error', overpassRes.status, await overpassRes.text())
      res.status(502).json({ error: 'Yer bilgisi alınamadı, tekrar dene.' })
      return
    }
    const data = await overpassRes.json()
    res.status(200).json(data)
  } catch (err) {
    console.error('nearby-activities request failed', err)
    res.status(502).json({ error: 'Yer bilgisi alınamadı, tekrar dene.' })
  }
}
