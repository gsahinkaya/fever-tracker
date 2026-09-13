# Alfred

Offline-first PWA for families to track a child's fever, medication doses,
feeding, and growth together — built so a parent can log something at 3am
with no signal and have it sync the moment the connection comes back, and so
the other parent finds out about it without having to ask.

## Features

- **Ateş (Fever)** — log temperature readings, backdated to any date/time,
  with a triage message (see-a-doctor / emergency) based on age + reading.
- **İlaç (Medication)** — define medications with a safe re-dose interval;
  Alfred forecasts the next safe dose time and warns if you log one too
  early. Also tracks a syrup's opened/expiry date (warns before it runs
  out), an optional fixed-length course (antibiotics) with start/end
  reminders, and a one-time custom reminder — all backed by both a
  foreground check and a server-side push so it still reaches a closed app.
- **Beslenme (Feeding)** — breastfeeding, bottle, and solid food entries,
  each backdatable, plus an optional reminder that fires once that many
  hours have passed since the last breastfeeding/bottle.
- **Semptomlar (Symptoms)**, **Uyku Takibi (Sleep)**, **Bez Değişimi
  (Diaper)** — quick-log entries for each, all backdatable.
- **Büyüme (Growth)** — height/weight/head-circumference history, plotted
  against WHO growth-standard percentile curves once birth date + sex are
  known.
- **Aşılar (Vaccinations)** — the Turkish national schedule computed from
  birth date, plus custom (off-schedule) vaccines; a day-ahead push
  reminder for whatever's next due.
- **Gelişim Kilometre Taşları (Milestones)** — an age-grouped developmental
  checklist.
- **Takvim (Calendar)** — appointments/birthdays/reminders with optional
  daily/weekly/monthly repeat, a day-ahead push reminder, and one-tap
  export to the phone's own calendar (.ics).
- **Nöbetçi Eczane / Yakındaki Hastaneler / Yakındaki Etkinlikler** —
  location-based lookups (CollectAPI for pharmacies, OpenStreetMap/Overpass
  for hospitals and kid-friendly activities), each one tap to call or get
  directions.
- **Doktora Göster** — the last 7 days of fever/medication/feeding/growth
  history plus current growth/vaccination status, as a screen you can hand
  the doctor directly or download as a one-tap PDF.
- **Alfred'e Sor** — free-form questions answered by Gemini, scoped to
  child-care topics, with a standing "see a real doctor for anything serious"
  disclaimer.
- **Family sync** — every child can be shared with multiple family members
  via an invite code/link. Adding an entry notifies everyone else: an in-app
  toast + bell while the app is open, and a real push notification (Firebase
  Cloud Messaging) even when it's closed — both tapping the notification and
  tapping its row in the bell land on that entry's specific screen. The bell
  also doubles as a notification history (not just unread), and any row can
  be dismissed individually without touching the underlying record.
- **Acil Durum (Emergency)** — one button (behind a confirmation) calls 112
  and pushes an alert with your location to every family member.
- **Onboarding wizard** — a one-time walkthrough of the home screen's tiles,
  shown once per account and never again.
- Offline-first via Firestore's local persistence; installable as a PWA.
- i18n-ready (`src/locales/`) — every user-facing string is routed through
  vue-i18n, with `tr` and `en` locales.

## Tech stack

- **Vue 3** (Composition API, `<script setup>`) + **Vuetify** + **Pinia** +
  **vue-router** + **vue-i18n**
- **Firebase**: Firestore (offline persistence, security rules), Auth,
  Cloud Messaging
- **Vercel serverless functions** (`api/`) for everything that needs a
  secret off the client: asking Gemini, pushing activity notifications to
  other family members' devices, the daily-schedule/reminder checks
  (medication courses, feeding reminders, upcoming calendar events,
  upcoming vaccinations), and the CollectAPI/Overpass location lookups
- **jose** for lightweight JWT verification/signing — Firebase ID tokens are
  verified against Google's public JWKS, and a service-account key is used
  to mint short-lived Google OAuth tokens for the Firestore REST API and FCM
  HTTP v1 API. Deliberately **no `firebase-admin`** — it doesn't bundle
  cleanly for Vercel's serverless functions (see `api/tsconfig.json`).
- **GitHub Actions** (`.github/workflows/reminders.yml`) polls the
  medication-course and feeding-reminder endpoints every 15 minutes for
  close-to-real-time delivery — Vercel Hobby's own cron (`vercel.json`)
  can't schedule more often than daily, so it's kept only as a fallback for
  those two.

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
| `GEMINI_API_KEY` | Server-only, `api/ask-alfred.ts` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (free tier) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Server-only, `api/notify-family.ts` + every `api/check-*.ts` cron endpoint | Firebase Console → Project Settings → Service Accounts → Generate new private key (paste the full JSON as one line) |
| `COLLECTAPI_KEY` | Server-only, `api/duty-pharmacy.ts` | [collectapi.com](https://collectapi.com) → Profile → Token |
| `CRON_SECRET` | Server-only, every `api/check-*.ts` cron endpoint (optional but recommended) | Any random string — also set as a `CRON_SECRET` repo secret for `.github/workflows/reminders.yml` to use |

`VITE_`-prefixed variables are safe to expose (they end up in the client
bundle); the rest are server secrets and must only be set as Vercel project
environment variables (and, for `CRON_SECRET`, a GitHub Actions repo
secret of the same name), never committed.

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
