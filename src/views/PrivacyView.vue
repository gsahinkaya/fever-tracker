<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useLocaleStore } from '@/stores/locale'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const { t } = useI18n()
const localeStore = useLocaleStore()
const authStore = useAuthStore()

const isTr = computed(() => localeStore.locale === 'tr')

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else if (authStore.isAuthenticated) {
    router.push('/settings')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <v-container style="max-width: 720px" class="py-6 px-4">
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center">
        <v-btn
          icon="mdi-arrow-left"
          variant="tonal"
          color="primary"
          size="small"
          :aria-label="t('common.back')"
          @click="goBack"
        />
        <h1 class="text-h6 font-weight-bold ml-3 mb-0">
          {{ isTr ? 'Gizlilik Politikası' : 'Privacy Policy' }}
        </h1>
      </div>

      <v-btn-toggle
        :model-value="localeStore.locale"
        color="primary"
        variant="outlined"
        density="compact"
        mandatory
        @update:model-value="localeStore.setLocale"
      >
        <v-btn value="tr" size="small">TR</v-btn>
        <v-btn value="en" size="small">EN</v-btn>
      </v-btn-toggle>
    </div>

    <!-- Turkish Content -->
    <div v-if="isTr">
      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="text-caption text-medium-emphasis mb-2">Son Güncelleme: 23 Ekim 2026</div>
        <p class="text-body-2 mb-3">
          Alfred ("Uygulama"), ailelerin bebek ve çocuklarının sağlık, ateş, ilaç, beslenme, uyku, bez
          değişimi ve büyüme verilerini güvenli bir şekilde takip etmelerini sağlayan bir aile
          asistanıdır. Gizliliğinize ve çocuklarınızın kişisel sağlık verilerinin güvenliğine en üst
          düzeyde önem veriyoruz.
        </p>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-4">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">1. Toplanan Bilgiler</h2>
        <ul class="text-body-2 pl-4 mb-2">
          <li class="mb-1">
            <strong>Hesap Bilgileri:</strong> Giriş yapmak ve verileri ailenizle senkronize etmek için
            kullandığınız e-posta adresi, ad-soyad (isteğe bağlı) ve çocukla ilişkiniz (anne, baba, vb.).
          </li>
          <li class="mb-1">
            <strong>Çocuk ve Sağlık Kayıtları:</strong> Çocuğun adı/takma adı, doğum tarihi, boy/kilo/baş
            çevresi ölçümleri, ateş değerleri, kullanılan ilaçlar ve doz saatleri, beslenme, uyku ve bez
            kayıtları.
          </li>
          <li class="mb-1">
            <strong>Cihaz ve Bildirim Bilgileri:</strong> Aile üyeleri yeni bir ölçüm veya ilaç dozu
            eklediğinde ya da bir sonraki doz saati geldiğinde anlık bildirim (Push Notification)
            alabilmeniz için cihazınıza özel Firebase Cloud Messaging (FCM) bildirim anahtarı.
          </li>
          <li>
            <strong>Konum Bilgisi:</strong> Yalnızca sizin açık onayınızla ve anlık olarak en yakındaki
            nöbetçi eczaneleri veya acil hastaneleri göstermek için kullanılır. Konumunuz sunucularımızda
            asla kaydedilmez veya izlenmez.
          </li>
        </ul>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-4">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">2. Verilerin Saklanması ve Güvenlik</h2>
        <p class="text-body-2 mb-2">
          Tüm verileriniz Google Cloud / Firebase Firestore altyapısında, endüstri standardı güvenlik ve
          şifreleme (SSL/TLS aktarımda ve diskte şifreli) protokolleriyle saklanır.
        </p>
        <p class="text-body-2 mb-0">
          Her aileye özel 6 haneli benzersiz bir Aile Kodu atanır. Yalnızca davet kodunu verdiğiniz aile
          bireyleri çocuğunuzun kayıtlarını görebilir ve yeni kayıt ekleyebilir. Yabancıların verilerinize
          erişmesi veritabanı güvenlik kurallarıyla engellenmiştir.
        </p>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-4">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">3. Yapay Zeka (Ask Alfred) ve Üçüncü Taraf Hizmetler</h2>
        <p class="text-body-2 mb-2">
          <strong>Ask Alfred:</strong> Ebeveynlerin çocuk bakımı ve sağlık sorularını yanıtlamak için Google
          Gemini yapay zeka servisini kullanır. Yapay zekaya yalnızca sorduğunuz soru iletilir; çocuğunuzun
          adı, geçmiş ölçümleri veya kimlik bilgileri <strong>asla gönderilmez</strong>.
        </p>
        <p class="text-body-2 mb-0">
          <strong>Harita ve Nöbetçi Eczaneler:</strong> Kamuya açık nöbetçi eczane ve hastane verileri için
          OpenStreetMap ve resmi nöbetçi eczane servisleri kullanılır.
        </p>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-4">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">4. Veri Paylaşımı ve Reklamlar</h2>
        <p class="text-body-2 mb-0">
          Alfred içerisinde hiçbir üçüncü taraf reklam ağı veya veri takipçisi (tracking tracker)
          bulunmamaktadır. Verileriniz <strong>asla üçüncü taraflara satılmaz, kiralanmaz veya reklam amaçlı
          kullanılmaz</strong>.
        </p>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-4">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">5. Verilerinizi Dışa Aktarma ve Hesap Silme Hakları</h2>
        <p class="text-body-2 mb-2">
          Kişisel verileriniz üzerinde tam kontrole sahipsiniz:
        </p>
        <ul class="text-body-2 pl-4 mb-2">
          <li class="mb-1">
            <strong>Dışa Aktarma:</strong> İstediğiniz zaman "Doktor Raporu" ekranından tüm ateş, ilaç ve
            gelişim kayıtlarınızı tek dokunuşla PDF olarak indirebilirsiniz.
          </li>
          <li>
            <strong>Hesap ve Veri Silme:</strong> Uygulama içinden <em>Ayarlar &gt; Hesabımı Sil</em>
            seçeneğini kullanarak hesabınızı, profilinizi ve cihaz kayıtlarınızı kalıcı olarak silebilirsiniz.
            İşlem tamamlandığında verileriniz derhal ve geri döndürülemez biçimde silinir.
          </li>
        </ul>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-6">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">6. İletişim</h2>
        <p class="text-body-2 mb-0">
          Gizlilik politikamız veya verilerinizle ilgili her türlü soru, öneri ve destek talebiniz için
          bizimle iletişime geçebilirsiniz:
          <br />
          <a href="mailto:destek@alfredapp.com" class="text-primary font-weight-bold">
            destek@alfredapp.com
          </a>
        </p>
      </v-card>
    </div>

    <!-- English Content -->
    <div v-else>
      <v-card variant="outlined" class="pa-4 mb-4">
        <div class="text-caption text-medium-emphasis mb-2">Last Updated: October 23, 2026</div>
        <p class="text-body-2 mb-3">
          Alfred ("the App") is a family assistant designed to help parents securely track their children's
          health, fever, medication, feeding, sleep, diaper changes, and growth. We take your privacy and the
          security of your child's data with utmost seriousness.
        </p>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-4">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">1. Information We Collect</h2>
        <ul class="text-body-2 pl-4 mb-2">
          <li class="mb-1">
            <strong>Account Information:</strong> Email address, optional name, and relationship to child (mother,
            father, etc.) used to sign in and synchronize data with your family.
          </li>
          <li class="mb-1">
            <strong>Child & Health Records:</strong> Child's name or nickname, birth date, measurements (height,
            weight, head circumference), temperature readings, medication dosages, feeding, sleep, and diaper logs.
          </li>
          <li class="mb-1">
            <strong>Device & Notification Data:</strong> A unique Firebase Cloud Messaging (FCM) token generated for
            your device to deliver push notifications when a family member logs an event or a medication is due.
          </li>
          <li>
            <strong>Location Data:</strong> Used strictly with your explicit consent in real-time to locate nearby
            duty pharmacies and emergency hospitals. Location data is never stored on our servers or profiled.
          </li>
        </ul>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-4">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">2. Data Storage & Security</h2>
        <p class="text-body-2 mb-2">
          All data is securely stored on Google Cloud / Firebase Firestore infrastructure utilizing industry-standard
          encryption (TLS in transit and AES at rest).
        </p>
        <p class="text-body-2 mb-0">
          Each family is assigned a unique 6-character Family Code. Only family members who possess your code can
          access or contribute to your child's records. Strict database security rules prohibit unauthorized access.
        </p>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-4">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">3. Artificial Intelligence (Ask Alfred) & Third Parties</h2>
        <p class="text-body-2 mb-2">
          <strong>Ask Alfred:</strong> Answers questions using Google Gemini AI. Only the text of your question is
          sent to the service; your child's name, logs, and identifying information are <strong>never shared</strong>.
        </p>
        <p class="text-body-2 mb-0">
          <strong>Nearby Facilities:</strong> OpenStreetMap and public pharmacy APIs are used solely for public
          facility lookups.
        </p>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-4">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">4. Data Sharing & Ads</h2>
        <p class="text-body-2 mb-0">
          Alfred contains no third-party advertisements or ad tracking SDKs. Your personal information is
          <strong>never sold, rented, or shared with data brokers</strong>.
        </p>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-4">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">5. Data Export & Account Deletion Rights</h2>
        <p class="text-body-2 mb-2">You maintain complete ownership of your data:</p>
        <ul class="text-body-2 pl-4 mb-2">
          <li class="mb-1">
            <strong>Export:</strong> Download a comprehensive PDF Doctor's Report at any time from the app.
          </li>
          <li>
            <strong>Account Deletion:</strong> You can permanently delete your account, profile, and device
            registrations at any time via <em>Settings &gt; Delete Account</em>. This action takes effect immediately
            and irreversibly.
          </li>
        </ul>
      </v-card>

      <v-card variant="outlined" class="pa-4 mb-6">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">6. Contact Us</h2>
        <p class="text-body-2 mb-0">
          If you have any questions regarding this Privacy Policy or your data, please contact us at:
          <br />
          <a href="mailto:destek@alfredapp.com" class="text-primary font-weight-bold">
            destek@alfredapp.com
          </a>
        </p>
      </v-card>
    </div>
  </v-container>
</template>
