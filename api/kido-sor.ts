import type { VercelRequest, VercelResponse } from '@vercel/node'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

// Lazily initialized so a cold start that never receives a request never pays
// for it, and so repeated invocations in the same warm instance reuse it.
function getFirebaseAuth() {
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set')
    initializeApp({ credential: cert(JSON.parse(raw)) })
  }
  return getAuth()
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
    await getFirebaseAuth().verifyIdToken(idToken)
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
