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
import CombinedTimelineList from '@/components/CombinedTimelineList.vue'
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

// Fever/dose entries and feedings live in separate stores/collections, so
// merge and re-sort by time to get one true "everything that happened"
// timeline instead of whichever store's array got concatenated last.
const recentActivity = computed(() =>
  [...store.recentEntries(48), ...feedingLogStore.recentEntries(48)].sort(
    (a, b) => b.takenAt - a.takenAt,
  ),
)
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

      <v-row class="mb-6" justify="center">
        <v-col cols="4">
          <v-btn
            block
            color="error"
            variant="flat"
            style="aspect-ratio: 1 / 1; height: auto"
            @click="showReadingDialog = true"
          >
            <div class="d-flex flex-column align-center">
              <v-icon icon="mdi-thermometer" size="34" class="mb-2" />
              <span class="text-body-2 font-weight-bold">Ateş</span>
            </div>
          </v-btn>
        </v-col>
        <v-col cols="4">
          <v-btn
            block
            color="primary"
            variant="flat"
            style="aspect-ratio: 1 / 1; height: auto"
            @click="showDoseDialog = true"
          >
            <div class="d-flex flex-column align-center">
              <v-icon icon="mdi-pill" size="34" class="mb-2" />
              <span class="text-body-2 font-weight-bold">İlaç</span>
            </div>
          </v-btn>
        </v-col>
        <v-col cols="4">
          <v-btn
            block
            color="secondary"
            variant="flat"
            style="aspect-ratio: 1 / 1; height: auto"
            to="/beslenme"
          >
            <div class="d-flex flex-column align-center">
              <v-icon icon="mdi-baby-bottle-outline" size="34" class="mb-2" />
              <span class="text-body-2 font-weight-bold">Beslenme</span>
            </div>
          </v-btn>
        </v-col>
        <v-col cols="4">
          <v-btn
            block
            color="info"
            variant="flat"
            style="aspect-ratio: 1 / 1; height: auto"
            to="/rapor"
          >
            <div class="d-flex flex-column align-center">
              <v-icon icon="mdi-file-chart-outline" size="34" class="mb-2" />
              <span class="text-body-2 font-weight-bold">Özet Rapor</span>
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
        Doz ve aile üyelerinin girişleri için bildirimlere izin ver.
        <template #append>
          <v-btn size="small" variant="text" @click="enableNotifications">İzin ver</v-btn>
        </template>
      </v-alert>

      <template v-if="medicationsWithHistory.length">
        <div class="mb-2">
          <span class="text-subtitle-2 text-medium-emphasis">Sonraki Güvenli Doz</span>
        </div>
        <v-row class="mb-6">
          <v-col v-for="med in medicationsWithHistory" :key="med.id" cols="12" sm="6">
            <NextDoseCard :medication="med" />
          </v-col>
        </v-row>
      </template>

      <template v-if="recentActivity.length">
        <div class="mb-2">
          <span class="text-subtitle-2 text-medium-emphasis">Son 48 Saat</span>
        </div>
        <v-card variant="outlined">
          <CombinedTimelineList :entries="recentActivity" />
        </v-card>
      </template>

      <AddReadingDialog v-model="showReadingDialog" />
      <AddDoseDialog v-model="showDoseDialog" />
    </template>
  </v-container>
</template>
