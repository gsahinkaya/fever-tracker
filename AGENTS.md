# Alfred Project Rules & AI Guidelines

Bu dosya, projede çalışan tüm yapay zeka (AI) asistanları ve geliştiriciler için temel mimari kuralları, kodlama standartlarını ve dikkat edilmesi gereken kritik kısıtlamaları içerir.

---

## 1. Proje Özeti ve Teknoloji Yığını

- **Uygulama:** Alfred — Aileler için offline-first çocuk takip asistanı (Ateş, İlaç, Beslenme, Büyüme, Uyku, Bez, Aşı, Nöbetçi Eczane, Doktora Göster, Alfred'e Sor vb.).
- **Frontend:** Vue 3 (Composition API + `<script setup lang="ts">`), Vuetify 3 (Material Design), Pinia, Vue Router, Vue I18n.
- **Backend / Serverless:** Vercel Serverless Functions (`api/*.ts`), Node.js + TypeScript (`api/tsconfig.json`).
- **Veritabanı & Kimlik Doğrulama:** Firebase Firestore (offline persistence açık), Firebase Auth, Firebase Cloud Messaging (Web & Mobil Push).
- **Mobil Katman:** Capacitor (`capacitor.config.ts`, `ios/`, `android/`).
- **Derleme ve Kod Kalitesi:** Vite 8, vue-tsc, oxlint + ESLint (`npm run lint`), oxfmt (`npm run format`), Vitest.

---

## 2. Temel Kodlama ve Mimari Kuralları

### A. Vue 3 & UI Standartları
1. **Bileşen Yapısı:**
   - Daima `<script setup lang="ts">` kullanın.
   - Vuetify 3 bileşenlerini tercih edin (`v-container`, `v-card`, `v-btn`, `v-dialog`, `v-text-field` vb.).
   - Mobil öncelikli (Mobile-First / PWA & Capacitor uyumlu) ve dokunmatik ekran dostu tasarlayın.
2. **Uluslararasılaştırma (i18n):**
   - **KURAL:** Şablonlar (`.vue`) içine kesinlikle statik kullanıcı metinleri gömmeyin (hardcoded text yasaktır).
   - Tüm kullanıcıya görünen metinler `src/locales/tr.ts` ve `src/locales/en.ts` dosyalarına eklenmeli ve `$t('...')` / `t('...')` ile çağrılmalıdır.

### B. Serverless Fonksiyonlar (`api/*.ts`)
1. **`firebase-admin` KULLANMAYIN:**
   - `api/` dizininde `firebase-admin` paketi Vercel üzerinde derleme hatalarına (`FUNCTION_INVOCATION_FAILED`) yol açtığı için **kullanılmaz**.
   - Firebase ID token doğrulama ve Firestore/FCM REST çağrıları için hafif `jose` kütüphanesi ve servis hesabı JWT üretimi kullanılır.
2. **Ayrı Type-Check:**
   - `api/` dizini kendi bağımsız `api/tsconfig.json` yapılandırmasına sahiptir (`npx tsc --noEmit -p api/tsconfig.json`). Ana frontend tsconfig'ine dahil etmeyin.
3. **Cron ve Güvenlik:**
   - Zamanlanmış cron uç noktalarında (`api/check-*.ts`) `CRON_SECRET` Bearer token doğrulaması zorunludur.

### C. Ortam Değişkenleri ve Gizlilik
1. **İstemci Değişkenleri (`VITE_*`):**
   - Yalnızca `VITE_` önekli değişkenler tarayıcı paketine dahil edilir ve herkese açıktır.
2. **Gizli Anahtarlar (Server Secrets):**
   - `FIREBASE_SERVICE_ACCOUNT_JSON`, `GEMINI_API_KEY`, `COLLECTAPI_KEY`, `CRON_SECRET` gibi anahtarlar **asla** istemci koduna (`src/`) aktarılmamalı ve asla commit edilmemelidir.

### D. Firestore Veri Modeli ve Güvenlik
1. **Güvenlik Kuralları (`firestore.rules`):**
   - Yeni bir koleksiyon veya veri alanı eklendiğinde aile erişim izinlerini (`familyId`, `members`) göz önünde bulundurun.
2. **Offline-First Yaklaşım:**
   - Firestore yerel önbellek (cache) ile çalışır. İnternet bağlantısı koptuğunda dahi yazma işlemlerinin yerel olarak çalışıp bağlantı gelince senkronize olmasını destekleyin.

---

## 3. Bağımlılık ve Paket Yönetimi

1. **`npm audit fix --force` ASLA ÇALIŞTIRILMAMALIDIR:**
   - Bu komut Firebase v9 gibi ana paketleri kırıcı alt sürümlere indirger. Zafiyetler doğrudan ilgili paketin minör/yama sürümü güncellenerek çözülmelidir.
2. **Kod Biçimlendirme & Lint:**
   - Proje standart linter aracı `oxlint` + `eslint` (`npm run lint`), formatlayıcı ise `oxfmt` (`npm run format`) aracıdır.

---

## 4. Değişiklik Doğrulama Adımları

Herhangi bir kodlama veya refactor işleminden sonra aşağıdaki kontrollerin hatasız (Exit Code 0) tamamlandığından emin olun:

```bash
# 1. TypeScript tip kontrolü
npm run type-check

# 2. Linter kontrolü
npm run lint

# 3. Production build kontrolü
npm run build
```

---

## 5. Dağıtım (Deployment) Kuralları

- `main` dalına yapılan `git push` işlemleri Vercel üzerinde otomatik olarak derlenip yayına alınır.
- `vercel.json` yönlendirmeleri SPA için yapılandırılmıştır (`/api/` ve `assets/` dışındaki tüm rotalar `index.html`'e yönlendirilir).
