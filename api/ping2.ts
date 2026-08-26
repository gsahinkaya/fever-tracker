import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, hasApp: getApps().length, cert: typeof cert, initializeApp: typeof initializeApp, getAuth: typeof getAuth })
}
