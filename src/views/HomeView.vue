<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import { useChildrenStore } from '@/stores/children'
import { useMedicationsStore } from '@/stores/medications'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useDoseReminders } from '@/composables/useDoseReminders'
import AddReadingDialog from '@/components/AddReadingDialog.vue'
import AddDoseDialog from '@/components/AddDoseDialog.vue'
import NextDoseCard from '@/components/NextDoseCard.vue'
import TimelineList from '@/components/TimelineList.vue'
import FeedingTimelineList from '@/components/FeedingTimelineList.vue'
import InstallPwaBanner from '@/components/InstallPwaBanner.vue'
import ChildSwitcher from '@/components/ChildSwitcher.vue'

const store = useFeverLogStore()
const childrenStore = useChildrenStore()
const medicationsStore = useMedicationsStore()
const feedingLogStore = useFeedingLogStore()
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
const recentFeedings = computed(() => feedingLogStore.recentEntries(48))
const hasChildren = computed(() => childrenStore.children.length > 0)

// Only medications that have actually been given at least once have a
// meaningful "next safe dose" to forecast — a freshly-added medication with
// no history yet would just show a confusing "no record" card here.
const medicationsWithHistory = computed(() =>
  medicationsStore.medications.filter((med) => store.lastDose(med.id)),
)
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

      <v-row dense class="mb-6">
        <v-col cols="4">
          <v-btn
            block
            size="large"
            color="error"
            variant="tonal"
            class="py-6"
            @click="showReadingDialog = true"
          >
            <div class="d-flex flex-column align-center">
              <v-icon icon="mdi-thermometer" size="28" class="mb-1" />
              <span class="text-caption">Ateş</span>
            </div>
          </v-btn>
        </v-col>
        <v-col cols="4">
          <v-btn
            block
            size="large"
            color="primary"
            variant="tonal"
            class="py-6"
            @click="showDoseDialog = true"
          >
            <div class="d-flex flex-column align-center">
              <v-icon icon="mdi-pill" size="28" class="mb-1" />
              <span class="text-caption">İlaç</span>
            </div>
          </v-btn>
        </v-col>
        <v-col cols="4">
          <v-btn block size="large" color="secondary" variant="tonal" class="py-6" to="/beslenme">
            <div class="d-flex flex-column align-center">
              <v-icon icon="mdi-baby-bottle-outline" size="28" class="mb-1" />
              <span class="text-caption">Beslenme</span>
            </div>
          </v-btn>
        </v-col>
        <v-col cols="6">
          <v-btn block size="large" color="primary" variant="tonal" class="py-6" to="/ilaclar">
            <div class="d-flex flex-column align-center">
              <v-icon icon="mdi-format-list-bulleted" size="28" class="mb-1" />
              <span class="text-caption">İlaçlar</span>
            </div>
          </v-btn>
        </v-col>
        <v-col cols="6">
          <v-btn block size="large" color="info" variant="tonal" class="py-6" to="/rapor">
            <div class="d-flex flex-column align-center">
              <v-icon icon="mdi-file-chart-outline" size="28" class="mb-1" />
              <span class="text-caption">Özet Rapor</span>
            </div>
          </v-btn>
        </v-col>
      </v-row>

      <InstallPwaBanner />

      <v-alert
        v-if="notifStatus !== 'granted'"
        type="info"
        variant="tonal"
        density="comfortable"
        class="mb-6"
      >
        Doz ve eşinin girişleri için bildirimlere izin ver.
        <template #append>
          <v-btn size="small" variant="text" @click="enableNotifications">İzin ver</v-btn>
        </template>
      </v-alert>

      <div class="mb-2">
        <span class="text-subtitle-2 text-medium-emphasis">Sonraki Güvenli Doz</span>
      </div>
      <v-row v-if="medicationsWithHistory.length" class="mb-6">
        <v-col v-for="med in medicationsWithHistory" :key="med.id" cols="12" sm="6">
          <NextDoseCard :medication="med" />
        </v-col>
      </v-row>
      <v-card
        v-else-if="medicationsStore.medications.length"
        variant="outlined"
        class="mb-6 pa-4 text-center"
      >
        <p class="text-body-2 text-medium-emphasis">
          Henüz ilaç verilmedi. İlk dozu verdiğinde burada görünecek.
        </p>
      </v-card>
      <v-card v-else variant="outlined" class="mb-6 pa-4 text-center">
        <p class="text-body-2 text-medium-emphasis mb-3">Henüz ilaç eklenmedi.</p>
        <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus" to="/ilaclar"
          >İlaç Ekle</v-btn
        >
      </v-card>

      <div class="mb-2">
        <span class="text-subtitle-2 text-medium-emphasis">Son 48 Saatte Beslenme</span>
      </div>
      <v-card variant="outlined" class="mb-6">
        <FeedingTimelineList :entries="recentFeedings" />
      </v-card>

      <div class="mb-2">
        <span class="text-subtitle-2 text-medium-emphasis">Son 48 Saat</span>
      </div>
      <v-card variant="outlined">
        <TimelineList :entries="recent" />
      </v-card>

      <AddReadingDialog v-model="showReadingDialog" />
      <AddDoseDialog v-model="showDoseDialog" />
    </template>
  </v-container>
</template>
