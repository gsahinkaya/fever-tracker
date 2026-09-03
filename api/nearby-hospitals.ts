import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createRemoteJWKSet, jwtVerify } from 'jose'

// This file deliberately does NOT import from a shared local module — see
// the comment at the top of ask-alfred.ts for why: every attempt at sharing
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

// Kept in sync by hand with src/composables/useNearbyHospitals.ts, which
// can't import this file (see note above) — the client sends lat/lon only,
// this builds the actual Overpass query server-side. amenity=hospital is
// OSM's canonical tag for an actual hospital (as opposed to
// amenity=clinic/doctors, which this deliberately excludes — "hastane" is
// specifically hospitals, not every kind of medical office).
const RADIUS_METERS = 15_000

function buildOverpassQuery(lat: number, lon: number): string {
  return `[out:json][timeout:20];
(
  node["amenity"="hospital"](around:${RADIUS_METERS},${lat},${lon});
  way["amenity"="hospital"](around:${RADIUS_METERS},${lat},${lon});
);
out center tags;`
}

// Vercel's default serverless timeout (~10s) isn't enough for Overpass
// under load in a dense city — see nearby-activities.ts, which hit the
// same issue. Hobby plan allows up to 60s.
export const config = {
  maxDuration: 30,
}

// Proxied server-side for the same reason as nearby-activities.ts:
// overpass-api.de's CORS headers are inconsistent enough in production that
// calling it straight from the browser silently breaks. No API key
// involved — this is purely a CORS workaround — but auth is still required
// so this endpoint isn't an open proxy for arbitrary Overpass traffic.
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
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Overpass's Apache front-end 406s requests with no Accept header
        // (see nearby-activities.ts) — an explicit Accept and real
        // User-Agent (per Overpass's usage policy) avoids that.
        Accept: 'application/json',
        'User-Agent': 'Alfred/1.0 (+https://fever-tracker-nu.vercel.app)',
      },
    })
    if (!overpassRes.ok) {
      console.error('Overpass error', overpassRes.status, await overpassRes.text())
      res.status(502).json({ error: 'Hastane bilgisi alınamadı, tekrar dene.' })
      return
    }
    const data = await overpassRes.json()
    res.status(200).json(data)
  } catch (err) {
    console.error('nearby-hospitals request failed', err)
    res.status(502).json({ error: 'Hastane bilgisi alınamadı, tekrar dene.' })
  }
}
