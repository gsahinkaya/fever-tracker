<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeverLogStore } from '@/stores/feverLog'
import { useChildrenStore } from '@/stores/children'
import { useMedicationsStore } from '@/stores/medications'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useAuthStore } from '@/stores/auth'
import { useDoseReminders } from '@/composables/useDoseReminders'
import { registerDeviceForPush } from '@/composables/usePushNotifications'
import { useNow } from '@/composables/useNow'
import AddReadingDialog from '@/components/AddReadingDialog.vue'
import AddDoseDialog from '@/components/AddDoseDialog.vue'
import NextDoseCard from '@/components/NextDoseCard.vue'
import CombinedTimelineList from '@/components/CombinedTimelineList.vue'
import OnboardingWizard from '@/components/OnboardingWizard.vue'

const { t } = useI18n()
const store = useFeverLogStore()
const childrenStore = useChildrenStore()
const medicationsStore = useMedicationsStore()
const feedingLogStore = useFeedingLogStore()
const authStore = useAuthStore()
const { requestPermission } = useDoseReminders()
const now = useNow()

const showReadingDialog = ref(false)
const showDoseDialog = ref(false)
const showOnboarding = computed({
  get: () => !!authStore.profile && !authStore.profile.hasSeenOnboarding,
  set: (value) => {
    if (!value) authStore.markOnboardingSeen()
  },
})

// Ask once automatically instead of nagging the user with an in-app
// banner — the browser's own native prompt is enough, and after this
// the choice is remembered so it never asks again.
onMounted(async () => {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    await requestPermission()
  }
  if (Notification.permission === 'granted') {
    registerDeviceForPush()
  }
})

// Fever/dose entries and feedings live in separate stores/collections, so
// merge and re-sort by time to get one true "everything that happened"
// timeline instead of whichever store's array got concatenated last.
const recentActivity = computed(() =>
  [...store.recentEntries(48), ...feedingLogStore.recentEntries(48)].sort(
    (a, b) => b.takenAt - a.takenAt,
  ),
)
const hasChildren = computed(() => childrenStore.children.length > 0)

// Only medications that (a) have actually been given at least once, so
// there's a meaningful "next safe dose" to forecast, and (b) are still
// within their waiting window — once it's already safe to give again,
// the card has nothing left to tell the parent, so it drops off the list
// instead of lingering with a "safe now" message no one needs anymore.
const medicationsWithHistory = computed(() =>
  medicationsStore.medications.filter((med) => {
    const safeAt = store.nextSafeDoseAt(med.id, med.minIntervalHours)
    return safeAt != null && safeAt > now.value
  }),
)
</script>

<template>
  <v-container class="py-4" style="max-width: 560px">
    <template v-if="childrenStore.loading">
      <div class="text-center py-8">
        <v-progress-circular indeterminate color="primary" />
      </div>
    </template>

    <template v-else-if="!hasChildren">
      <div class="text-center py-8">
        <v-icon icon="mdi-baby-face-outline" size="56" color="primary" class="mb-4" />
        <h2 class="text-h6 mb-2">{{ t('home.addChildTitle') }}</h2>
        <p class="text-body-2 text-medium-emphasis mb-6">
          {{ t('home.addChildBody') }}
        </p>
        <v-btn color="primary" size="large" prepend-icon="mdi-plus" to="/cocuklar">{{
          t('home.addChildButton')
        }}</v-btn>
      </div>
    </template>

    <template v-else>
      <div class="d-flex flex-column mb-6" style="gap: 12px">
        <v-btn
          block
          height="64"
          color="error"
          variant="flat"
          rounded="lg"
          @click="showReadingDialog = true"
        >
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-thermometer" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.fever') }}</span>
          </div>
        </v-btn>
        <v-btn
          block
          height="64"
          color="medication"
          variant="flat"
          rounded="lg"
          @click="showDoseDialog = true"
        >
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-pill" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.medication') }}</span>
          </div>
        </v-btn>
        <v-btn block height="64" color="secondary" variant="flat" rounded="lg" to="/beslenme">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-baby-bottle-outline" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.feeding') }}</span>
          </div>
        </v-btn>
        <v-btn block height="64" color="vaccine" variant="flat" rounded="lg" to="/asilar">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-needle" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.vaccinations') }}</span>
          </div>
        </v-btn>
        <v-btn block height="64" color="growth" variant="flat" rounded="lg" to="/buyume">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-human-male-height" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.growth') }}</span>
          </div>
        </v-btn>
        <v-btn block height="64" color="info" variant="flat" rounded="lg" to="/rapor">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-file-chart-outline" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.report') }}</span>
          </div>
        </v-btn>
        <v-btn block height="64" color="success" variant="flat" rounded="lg" to="/sor">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-chat-question-outline" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.askKido') }}</span>
          </div>
        </v-btn>
        <v-btn block height="64" color="pharmacy" variant="flat" rounded="lg" to="/nobetci-eczane">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-mortar-pestle" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.dutyPharmacy') }}</span>
          </div>
        </v-btn>
        <v-btn block height="64" color="activity" variant="flat" rounded="lg" to="/etkinlikler">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-drama-masks" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.nearbyActivities') }}</span>
          </div>
        </v-btn>
      </div>

      <template v-if="medicationsWithHistory.length">
        <div class="mb-2">
          <span class="text-subtitle-2 text-medium-emphasis">{{ t('home.nextSafeDose') }}</span>
        </div>
        <v-row class="mb-6">
          <v-col v-for="med in medicationsWithHistory" :key="med.id" cols="12" sm="6">
            <NextDoseCard :medication="med" />
          </v-col>
        </v-row>
      </template>

      <div class="mb-2 d-flex align-center">
        <span class="text-subtitle-2 text-medium-emphasis">{{ t('home.last48h') }}</span>
        <v-spacer />
        <v-btn variant="text" size="small" color="primary" to="/gecmis">{{
          t('home.viewAllHistory')
        }}</v-btn>
      </div>
      <v-card variant="outlined">
        <CombinedTimelineList :entries="recentActivity" />
      </v-card>

      <AddReadingDialog v-model="showReadingDialog" />
      <AddDoseDialog v-model="showDoseDialog" />
      <OnboardingWizard v-model="showOnboarding" />
    </template>
  </v-container>
</template>
