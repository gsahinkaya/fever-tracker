# Alfred Project Rules & AI Guidelines

This document contains architectural rules, coding standards, and critical constraints for all AI coding assistants (Antigravity, Cursor, Claude Code, GitHub Copilot, Windsurf) and developers working on this codebase.

---

## 1. Project Overview & Tech Stack

- **Application:** Alfred — Offline-first child care and health tracking assistant for families (Fever, Medication, Feeding, Growth, Sleep, Diaper, Vaccinations, On-duty Pharmacies, Doctor Reports, Ask Alfred, etc.).
- **Frontend:** Vue 3 (Composition API + `<script setup lang="ts">`), Vuetify 3 (Material Design), Pinia (State Management), Vue Router, Vue I18n.
- **Backend / Serverless:** Vercel Serverless Functions (`api/*.ts`), Node.js + TypeScript (`api/tsconfig.json`).
- **Database & Authentication:** Firebase Firestore (offline persistence enabled), Firebase Auth, Firebase Cloud Messaging (Web & Mobile Push).
- **Mobile Layer:** Capacitor (`capacitor.config.ts`, `ios/`, `android/`).
- **Build & Quality Tooling:** Vite 8, vue-tsc, oxlint + ESLint (`npm run lint`), oxfmt (`npm run format`), Vitest.

---

## 2. Core Architecture & Coding Standards

### A. Vue 3 & UI Guidelines
1. **Component Structure:**
   - Always use `<script setup lang="ts">`.
   - Prefer Vuetify 3 components (`v-container`, `v-card`, `v-btn`, `v-dialog`, `v-text-field`, etc.).
   - Design with a Mobile-First mindset, optimized for touchscreens, PWA, and Capacitor mobile wrappers.
2. **Internationalization (i18n):**
   - **STRICT RULE:** Never hardcode user-facing strings into `.vue` templates.
   - All user-visible text must be defined in both `src/locales/tr.ts` and `src/locales/en.ts`, and accessed via `t('...')` / `$t('...')`.

### B. Serverless Functions (`api/*.ts`)
1. **DO NOT USE `firebase-admin`:**
   - `firebase-admin` causes runtime bundling failures on Vercel (`FUNCTION_INVOCATION_FAILED`) and must **never** be imported in `api/`.
   - Use the lightweight `jose` library to verify Firebase ID tokens and generate Google service account OAuth tokens for direct REST calls to Firestore and FCM.
2. **Independent Type-Check:**
   - The `api/` directory has its own dedicated `api/tsconfig.json` (`npx tsc --noEmit -p api/tsconfig.json`). Do not merge it into the root frontend tsconfig.
3. **Cron & Endpoint Security:**
   - Scheduled cron endpoints (`api/check-*.ts`) must enforce `CRON_SECRET` Bearer token authentication.

### C. Environment Variables & Security
1. **Client Variables (`VITE_*`):**
   - Only variables prefixed with `VITE_` are bundled into the client application. They are public and readable by users.
2. **Server Secrets:**
   - Secrets (`FIREBASE_SERVICE_ACCOUNT_JSON`, `GEMINI_API_KEY`, `COLLECTAPI_KEY`, `CRON_SECRET`) must **never** be exposed in client code (`src/`) and must never be committed.

### D. Firestore Data Model & Offline-First
1. **Security Rules (`firestore.rules`):**
   - When creating or modifying collections or schemas, always ensure proper family-based authorization (`familyId`, `members`).
2. **Offline-First Persistence:**
   - Firestore operates with local cache persistence. Ensure mutations work locally when offline and synchronize gracefully when connectivity is restored.

---

## 3. Dependency & Package Management

1. **NEVER RUN `npm audit fix --force`:**
   - This command forces destructive major downgrades on critical libraries (e.g. Firebase v9). Resolve vulnerabilities by explicitly updating minor/patch versions of affected packages.
2. **Formatting & Linting:**
   - Linter: `oxlint` + `eslint` via `npm run lint`.
   - Formatter: `oxfmt` via `npm run format`.

---

## 4. Verification Workflow

Before considering any task, refactor, or feature complete, verify that all three checks pass with Exit Code 0:

```bash
# 1. TypeScript compilation check
npm run type-check

# 2. Linter check
npm run lint

# 3. Production build check
npm run build
```

---

## 5. Deployment Guidelines

- Pushing to the `main` branch automatically triggers production builds and deployment on Vercel.
- `vercel.json` rewrites all non-asset, non-`/api` routes to `index.html` for SPA navigation.

---

## 6. Developer Communication

- By default, communicate and explain changes to the developer in **Turkish**, unless requested otherwise.
- Code, docstrings, identifiers, and git commit messages must remain in standard English.
