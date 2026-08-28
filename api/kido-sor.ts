import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createRemoteJWKSet, jwtVerify } from 'jose'

// Verifying a Firebase ID token doesn't require the Admin SDK (and its heavy,
// serverless-bundler-unfriendly dependency tree) — it's a standard RS256 JWT
// signed with Google's rotating public keys. Verifying it directly with a
// lightweight JOSE library needs no service-account secret at all.
//
// This file deliberately does NOT import from a shared local module (e.g.
// api/_lib or a project-root server/ dir) even though notify-family.ts needs
// the exact same logic — every attempt at that broke both functions with
// FUNCTION_INVOCATION_FAILED / ERR_MODULE_NOT_FOUND in Vercel's actual
// deploy, even though it type-checked and bundled fine locally with
// @vercel/ncc. Duplicating these ~15 lines is the price of Vercel's
// zero-config per-file function bundling actually working.
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

// Keyed by the same locale codes as src/lib/locale.ts (LocaleCode) — the
// client sends its current app language in the request body so the answer
// language always matches the UI, not just the static copy around it.
const SYSTEM_PROMPTS = {
  tr: `Sen Kido adında, bebek/çocuk sahibi ebeveynlere yardımcı olan bir asistansın.
Kido uygulaması ateş, ilaç ve beslenme (emzirme/biberon/katı gıda) takibi yapan bir aile uygulamasıdır.
Ebeveynlerin çocuk bakımı, ateş, ilaç dozlama, beslenme ve genel bebek/çocuk sağlığıyla ilgili sorularını
kısa, anlaşılır ve güven verici bir dille Türkçe yanıtla. Ciddi/acil durumlarda (yüksek ateş, nefes darlığı vb.)
mutlaka bir doktora veya acil servise başvurulması gerektiğini belirt. Sen bir doktorun yerini tutmazsın,
verdiğin bilgiler genel bilgilendirme amaçlıdır.`,
  en: `You are an assistant named Kido that helps parents of babies/young children.
The Kido app tracks fever, medication and feeding (breastfeeding/bottle/solid food) for a family.
Answer parents' questions about childcare, fever, medication dosing, feeding and general baby/child
health in short, clear, reassuring English. In serious/urgent situations (high fever, difficulty
breathing, etc.) always state that a doctor or emergency service must be consulted. You are not a
substitute for a doctor — the information you give is for general guidance only.`,
} as const

const ERROR_MESSAGES = {
  tr: {
    needsLogin: 'Giriş yapman gerekiyor.',
    invalidSession: 'Oturum geçersiz, tekrar giriş yap.',
    emptyQuestion: 'Soru boş olamaz.',
    questionTooLong: 'Soru çok uzun.',
    serverConfig: 'Sunucu yapılandırma hatası.',
    noAnswer: 'Yanıt alınamadı, tekrar dene.',
  },
  en: {
    needsLogin: 'You need to log in.',
    invalidSession: 'Session invalid, please log in again.',
    emptyQuestion: "Question can't be empty.",
    questionTooLong: 'Question is too long.',
    serverConfig: 'Server configuration error.',
    noAnswer: 'Could not get a response, please try again.',
  },
} as const

function messagesFor(language: unknown) {
  return language === 'en' ? ERROR_MESSAGES.en : ERROR_MESSAGES.tr
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const messages = messagesFor(req.body?.language)

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const authHeader = req.headers.authorization
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!idToken) {
    res.status(401).json({ error: messages.needsLogin })
    return
  }

  try {
    await verifyFirebaseToken(idToken)
  } catch {
    res.status(401).json({ error: messages.invalidSession })
    return
  }

  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : ''
  if (!question) {
    res.status(400).json({ error: messages.emptyQuestion })
    return
  }
  if (question.length > 1000) {
    res.status(400).json({ error: messages.questionTooLong })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: messages.serverConfig })
    return
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: req.body?.language === 'en' ? SYSTEM_PROMPTS.en : SYSTEM_PROMPTS.tr }],
          },
          contents: [{ role: 'user', parts: [{ text: question }] }],
        }),
      },
    )

    if (!geminiResponse.ok) {
      console.error('Gemini API error', geminiResponse.status, await geminiResponse.text())
      res.status(502).json({ error: messages.noAnswer })
      return
    }

    const data = await geminiResponse.json()
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (typeof answer !== 'string') {
      console.error('Unexpected Gemini response shape', JSON.stringify(data))
      res.status(502).json({ error: messages.noAnswer })
      return
    }

    res.status(200).json({ answer })
  } catch (err) {
    console.error('kido-sor request failed', err)
    res.status(502).json({ error: 'Yanıt alınamadı, tekrar dene.' })
  }
}
