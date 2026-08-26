import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createRemoteJWKSet, jwtVerify } from 'jose'

// Verifying a Firebase ID token doesn't require the Admin SDK (and its heavy,
// serverless-bundler-unfriendly dependency tree) — it's a standard RS256 JWT
// signed with Google's rotating public keys. Verifying it directly with a
// lightweight JOSE library needs no service-account secret at all.
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

async function verifyFirebaseToken(idToken: string) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID
  if (!projectId) throw new Error('VITE_FIREBASE_PROJECT_ID is not set')
  await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  })
}

const SYSTEM_PROMPT = `Sen Kido adında, bebek/çocuk sahibi ebeveynlere yardımcı olan bir asistansın.
Kido uygulaması ateş, ilaç ve beslenme (emzirme/biberon/katı gıda) takibi yapan bir aile uygulamasıdır.
Ebeveynlerin çocuk bakımı, ateş, ilaç dozlama, beslenme ve genel bebek/çocuk sağlığıyla ilgili sorularını
kısa, anlaşılır ve güven verici bir dille Türkçe yanıtla. Ciddi/acil durumlarda (yüksek ateş, nefes darlığı vb.)
mutlaka bir doktora veya acil servise başvurulması gerektiğini belirt. Sen bir doktorun yerini tutmazsın,
verdiğin bilgiler genel bilgilendirme amaçlıdır.`

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

  try {
    await verifyFirebaseToken(idToken)
  } catch {
    res.status(401).json({ error: 'Oturum geçersiz, tekrar giriş yap.' })
    return
  }

  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : ''
  if (!question) {
    res.status(400).json({ error: 'Soru boş olamaz.' })
    return
  }
  if (question.length > 1000) {
    res.status(400).json({ error: 'Soru çok uzun.' })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'Sunucu yapılandırma hatası.' })
    return
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: question }] }],
        }),
      },
    )

    if (!geminiResponse.ok) {
      res.status(502).json({ error: 'Yanıt alınamadı, tekrar dene.' })
      return
    }

    const data = await geminiResponse.json()
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof answer !== 'string') {
      res.status(502).json({ error: 'Yanıt alınamadı, tekrar dene.' })
      return
    }

    res.status(200).json({ answer })
  } catch {
    res.status(502).json({ error: 'Yanıt alınamadı, tekrar dene.' })
  }
}
