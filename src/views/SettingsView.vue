<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFeverLogStore } from '@/stores/feverLog'
import { useChildrenStore } from '@/stores/children'
import { useMedicationsStore } from '@/stores/medications'
import { useDoseReminders } from '@/composables/useDoseReminders'

const router = useRouter()
const authStore = useAuthStore()
const feverLogStore = useFeverLogStore()
const childrenStore = useChildrenStore()
const medicationsStore = useMedicationsStore()
const { requestPermission } = useDoseReminders()

const inviteLink = computed(() =>
  authStore.familyId ? `${window.location.origin}/kayit?kod=${authStore.familyId}` : '',
)
const copied = ref(false)

async function copyInvite() {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // Clipboard API can be unavailable (e.g. insecure context); the code/link is still visible to copy manually.
  }
}

const notifStatus = ref<NotificationPermission | 'unsupported'>(
  'Notification' in window ? Notification.permission : 'unsupported',
)

async function enableNotifications() {
  notifStatus.value = await requestPermission()
}

const activeChildName = computed(
  () => childrenStore.children.find((c) => c.id === feverLogStore.activeChildId)?.name ?? '',
)
const showClearConfirm = ref(false)

async function clearAll() {
  await feverLogStore.clearAllEntries()
  showClearConfirm.value = false
}

async function logout() {
  await authStore.logout()
  router.push('/giris')
}
</script>

<template>
  <v-container style="max-width: 560px">
    <div class="d-flex align-center mb-4">
      <v-btn icon="mdi-arrow-left" variant="tonal" color="primary" to="/" aria-label="Geri" />
      <span class="text-h6 ml-2">Ayarlar</span>
    </div>

    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">Hesap</v-card-title>
      <v-card-text>
        <div class="text-body-2">{{ authStore.profile?.email }}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="logout">Çıkış Yap</v-btn>
      </v-card-actions>
    </v-card>

    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">Çocuklarım</v-card-title>
      <v-card-text class="text-body-2 text-medium-emphasis">
        {{ childrenStore.children.length }} çocuk kayıtlı
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" to="/cocuklar">Yönet</v-btn>
      </v-card-actions>
    </v-card>

    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">İlaçlarım</v-card-title>
      <v-card-text class="text-body-2 text-medium-emphasis">
        {{ medicationsStore.medications.length }} ilaç kayıtlı
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" to="/ilaclar">Yönet</v-btn>
      </v-card-actions>
    </v-card>

    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">Eşini Davet Et</v-card-title>
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-2">
          Bu kodu veya linki eşinle paylaş; kayıt olurken girdiğinde aynı çocukları görüp düzenleyebilir.
        </p>
        <v-text-field
          :model-value="authStore.familyId"
          label="Davet kodu"
          readonly
          variant="outlined"
          density="comfortable"
        />
        <v-text-field :model-value="inviteLink" label="Davet linki" readonly variant="outlined" density="comfortable" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" variant="text" :append-icon="copied ? 'mdi-check' : 'mdi-content-copy'" @click="copyInvite">
          {{ copied ? 'Kopyalandı' : 'Linki Kopyala' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">Bildirimler</v-card-title>
      <v-card-text>
        <span v-if="notifStatus === 'granted'" class="text-success">Bildirimler açık</span>
        <span v-else-if="notifStatus === 'unsupported'" class="text-medium-emphasis">
          Bu tarayıcı bildirimleri desteklemiyor
        </span>
        <span v-else class="text-medium-emphasis">Doz zamanı geldiğinde hatırlatma alman için izin ver</span>
      </v-card-text>
      <v-card-actions v-if="notifStatus !== 'granted' && notifStatus !== 'unsupported'">
        <v-spacer />
        <v-btn color="primary" variant="text" @click="enableNotifications">İzin ver</v-btn>
      </v-card-actions>
    </v-card>

    <v-card v-if="activeChildName" variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1 text-error">Tehlikeli Bölge</v-card-title>
      <v-card-text>
        {{ activeChildName }} için tüm ateş ve ilaç kayıtlarını kalıcı olarak sil. Bu işlem geri alınamaz.
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="error" variant="text" @click="showClearConfirm = true">
          {{ activeChildName }} kayıtlarını sil
        </v-btn>
      </v-card-actions>
    </v-card>

    <p class="text-caption text-medium-emphasis text-center">
      Ateş Ölçer, tüm verilerini cihazında offline saklar ve bağlantı geldiğinde senkronize eder.
    </p>

    <v-dialog v-model="showClearConfirm" max-width="360">
      <v-card>
        <v-card-title class="text-h6">Emin misin?</v-card-title>
        <v-card-text>{{ activeChildName }} için tüm kayıtlar kalıcı olarak silinecek.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showClearConfirm = false">Vazgeç</v-btn>
          <v-btn color="error" variant="flat" @click="clearAll">Sil</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
