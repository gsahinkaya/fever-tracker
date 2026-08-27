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

interface DutyPharmacy {
  name: string
  dist: string
  address: string
  phone: string
  loc: string
}

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

  const il = typeof req.query.il === 'string' ? req.query.il.trim() : ''
  const ilce = typeof req.query.ilce === 'string' ? req.query.ilce.trim() : ''
  if (!il || !ilce) {
    res.status(400).json({ error: 'İl ve ilçe gerekli.' })
    return
  }

  const apiKey = process.env.COLLECTAPI_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Sunucu yapılandırma hatası.' })
    return
  }

  try {
    const url = `https://api.collectapi.com/health/dutyPharmacy?il=${encodeURIComponent(il)}&ilce=${encodeURIComponent(ilce)}`
    const apiRes = await fetch(url, {
      headers: { authorization: `apikey ${apiKey}`, 'content-type': 'application/json' },
    })
    if (!apiRes.ok) {
      console.error('CollectAPI error', apiRes.status, await apiRes.text())
      res.status(502).json({ error: 'Eczane bilgisi alınamadı, tekrar dene.' })
      return
    }
    const data = (await apiRes.json()) as { success: boolean; result?: DutyPharmacy[] }
    if (!data.success) {
      res.status(502).json({ error: 'Eczane bilgisi alınamadı, tekrar dene.' })
      return
    }
    res.status(200).json({ pharmacies: data.result ?? [] })
  } catch (err) {
    console.error('nobetci-eczane request failed', err)
    res.status(502).json({ error: 'Eczane bilgisi alınamadı, tekrar dene.' })
  }
}
