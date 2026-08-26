import type { VercelRequest, VercelResponse } from '@vercel/node'
import admin from 'firebase-admin'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    ok: true,
    hasApp: admin.apps.length,
    cert: typeof admin.credential.cert,
    initializeApp: typeof admin.initializeApp,
    auth: typeof admin.auth,
  })
}
