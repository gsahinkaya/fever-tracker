<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFeverLogStore } from '@/stores/feverLog'
import { useChildrenStore } from '@/stores/children'
import { useMedicationsStore } from '@/stores/medications'
import { useDoseReminders } from '@/composables/useDoseReminders'
import AddReadingDialog from '@/components/AddReadingDialog.vue'
import AddDoseDialog from '@/components/AddDoseDialog.vue'
import NextDoseCard from '@/components/NextDoseCard.vue'
import TimelineList from '@/components/TimelineList.vue'
import InstallPwaBanner from '@/components/InstallPwaBanner.vue'
import ChildSwitcher from '@/components/ChildSwitcher.vue'

const store = useFeverLogStore()
const childrenStore = useChildrenStore()
const medicationsStore = useMedicationsStore()
const router = useRouter()
const { requestPermission } = useDoseReminders()

const showReadingDialog = ref(false)
const showDoseDialog = ref(false)
const notifStatus = ref<NotificationPermission | 'unsupported'>('default')

onMounted(() => {
  notifStatus.value = 'Notification' in window ? Notification.permission : 'unsupported'
})

async function enableNotifications() {
  notifStatus.value = await requestPermission()
}

const recent = computed(() => store.recentEntries(48))
const hasChildren = computed(() => childrenStore.children.length > 0)
</script>

<template>
  <v-container class="py-4" style="max-width: 560px">
    <template v-if="!hasChildren">
      <div class="text-center py-8">
        <v-icon icon="mdi-baby-face-outline" size="56" color="primary" class="mb-4" />
        <h2 class="text-h6 mb-2">Önce bir çocuk ekle</h2>
        <p class="text-body-2 text-medium-emphasis mb-6">
          Ateş ve ilaç takibi yapabilmek için önce çocuğunun bilgilerini ekle.
        </p>
        <v-btn color="primary" size="large" prepend-icon="mdi-plus" to="/cocuklar"
          >Çocuk Ekle</v-btn
        >
      </div>
    </template>

    <template v-else>
      <ChildSwitcher />

      <v-btn
        block
        size="x-large"
        color="error"
        class="text-h6 py-8 mb-4"
        elevation="4"
        @click="showReadingDialog = true"
      >
        <v-icon start icon="mdi-thermometer" size="32" />
        Ateş Girişi
      </v-btn>

      <v-btn
        block
        size="large"
        color="primary"
        variant="tonal"
        class="mb-4"
        @click="showDoseDialog = true"
      >
        <v-icon start icon="mdi-pill" />
        İlaç Verildi
      </v-btn>

      <v-btn block size="large" color="secondary" variant="tonal" class="mb-6" to="/beslenme">
        <v-icon start icon="mdi-baby-bottle-outline" />
        Beslenme
      </v-btn>

      <InstallPwaBanner />

      <v-alert
        v-if="notifStatus !== 'granted'"
        type="info"
        variant="tonal"
        density="comfortable"
        class="mb-6"
      >
        Doz zamanı geldiğinde hatırlatma alman için bildirimlere izin ver.
        <template #append>
          <v-btn size="small" variant="text" @click="enableNotifications">İzin ver</v-btn>
        </template>
      </v-alert>

      <div class="d-flex align-center justify-space-between mb-2">
        <span class="text-subtitle-2 text-medium-emphasis">Sonraki Güvenli Doz</span>
        <v-btn variant="text" size="small" append-icon="mdi-arrow-right" to="/ilaclar"
          >İlaçlarım</v-btn
        >
      </div>
      <v-row v-if="medicationsStore.medications.length" class="mb-6">
        <v-col v-for="med in medicationsStore.medications" :key="med.id" cols="12" sm="6">
          <NextDoseCard :medication="med" />
        </v-col>
      </v-row>
      <v-card v-else variant="outlined" class="mb-6 pa-4 text-center">
        <p class="text-body-2 text-medium-emphasis mb-3">Henüz ilaç eklenmedi.</p>
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" to="/ilaclar"
          >İlaç Ekle</v-btn
        >
      </v-card>

      <div class="d-flex align-center justify-space-between mb-2">
        <span class="text-subtitle-2 text-medium-emphasis">Son 48 Saat</span>
        <v-btn
          variant="text"
          size="small"
          append-icon="mdi-arrow-right"
          @click="router.push('/rapor')"
        >
          Doktor Özet Raporu
        </v-btn>
      </div>
      <v-card variant="outlined">
        <TimelineList :entries="recent" />
      </v-card>

      <AddReadingDialog v-model="showReadingDialog" />
      <AddDoseDialog v-model="showDoseDialog" />
    </template>
  </v-container>
</template>
