# Kido

Offline-first PWA for families to track a child's fever, medication doses,
feeding, and growth together — built so a parent can log something at 3am
with no signal and have it sync the moment the connection comes back, and so
the other parent finds out about it without having to ask.

## Features

- **Ateş (Fever)** — log temperature readings, optionally backdated to when
  the measurement actually happened.
- **İlaç (Medication)** — define medications with a safe re-dose interval;
  Kido forecasts the next safe dose time and warns if you log one too early.
- **Beslenme (Feeding)** — breastfeeding, bottle, and solid food entries.
- **Büyüme (Growth)** — height/weight history with trend charts.
- **Doktor Özet Raporu** — the last 48 hours of fever/medication history as a
  one-tap PDF download to bring to a doctor's visit.
- **Kido'ya Sor** — free-form questions answered by Gemini, scoped to
  child-care topics, with a standing "see a real doctor for anything serious"
  disclaimer.
- **Family sync** — every child can be shared with multiple family members
  via an invite code/link. Adding an entry notifies everyone else: an in-app
  banner + bell while the app is open, and a real push notification (Firebase
  Cloud Messaging) even when it's closed.
- **Onboarding wizard** — a one-time walkthrough of the home screen's tiles,
  shown once per account and never again.
- Offline-first via Firestore's local persistence; installable as a PWA.
- i18n-ready (`src/locales/`) — every user-facing string is routed through
  vue-i18n, currently with a single `tr` locale.

## Tech stack

- **Vue 3** (Composition API, `<script setup>`) + **Vuetify** + **Pinia** +
  **vue-router** + **vue-i18n**
- **Firebase**: Firestore (offline persistence, security rules), Auth,
  Cloud Messaging
- **Vercel serverless functions** (`api/`) for the two things that need a
  secret off the client: asking Gemini, and pushing notifications to other
  family members' devices
- **jose** for lightweight JWT verification/signing — Firebase ID tokens are
  verified against Google's public JWKS, and a service-account key is used
  to mint short-lived Google OAuth tokens for the Firestore REST API and FCM
  HTTP v1 API. Deliberately **no `firebase-admin`** — it doesn't bundle
  cleanly for Vercel's serverless functions (see `api/tsconfig.json`).

## Project setup

```sh
npm install
cp .env.example .env   # fill in the values below
npm run dev
```

### Environment variables

| Variable | Where it's used | Where to get it |
|---|---|---|
| `VITE_FIREBASE_*` | Client Firebase config | Firebase Console → Project Settings → General → your web app |
| `VITE_FIREBASE_VAPID_KEY` | Web push public key | Firebase Console → Project Settings → Cloud Messaging → Web configuration → Generate key pair |
| `GEMINI_API_KEY` | Server-only, `api/kido-sor.ts` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (free tier) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server-only, `api/notify-family.ts` | Firebase Console → Project Settings → Service Accounts → Generate new private key (paste the full JSON as one line) |

`VITE_`-prefixed variables are safe to expose (they end up in the client
bundle); the other two are server secrets and must only be set as Vercel
project environment variables, never committed.

### Firestore security rules

Rules live in `firestore.rules` and are deployed with the Firebase CLI
(`firebase.json` / `.firebaserc` already point it at the right project):

```sh
firebase deploy --only firestore:rules
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Type-check + production build |
| `npm run type-check` | `vue-tsc --build` |
| `npm run lint` | oxlint + eslint |
| `npm run format` | oxfmt |
| `npm run test:unit` | Vitest |

`api/*.ts` type-checks separately under `api/tsconfig.json`
(`npx tsc --noEmit -p api/tsconfig.json`). It's deliberately isolated from
the app's composite root `tsconfig.json` — Vercel bundles each function on
its own, and the root config's project-reference setup broke that bundling
in a way that only showed up at deploy time (see git history if you hit
`FUNCTION_INVOCATION_FAILED` on a new route someday).

## Deployment

Hosted on Vercel, deployed on push to `main`. `vercel.json` rewrites all
non-asset, non-`/api` routes to `index.html` for the SPA, and excludes
`api/` and `assets/` from that catch-all.
