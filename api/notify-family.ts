import type { VercelRequest, VercelResponse } from '@vercel/node'
import { bearerToken, verifyFirebaseToken } from './_lib/verifyToken'
import { getGoogleAccessToken, getServiceAccountProjectId } from './_lib/googleAuth'
import { getDeviceTokens, getFamilyMemberUids } from './_lib/firestoreRest'

const SCOPES = [
  'https://www.googleapis.com/auth/datastore',
  'https://www.googleapis.com/auth/firebase.messaging',
]

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

// Called right after a client writes a fever/medication/feeding/growth
// entry, to push the same "someone in your family just did X" notification
// to every OTHER member's registered devices — including while their app is
// closed, which the existing foreground-only Notification path can't reach.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const idToken = bearerToken(req.headers.authorization)
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
    const projectId = getServiceAccountProjectId()
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
