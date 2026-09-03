<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChildrenStore } from '@/stores/children'
import { useAuthStore } from '@/stores/auth'
import { useDoseReminders } from '@/composables/useDoseReminders'
import { registerDeviceForPush } from '@/composables/usePushNotifications'
import AddReadingDialog from '@/components/AddReadingDialog.vue'
import AddDoseDialog from '@/components/AddDoseDialog.vue'
import OnboardingWizard from '@/components/OnboardingWizard.vue'

const { t } = useI18n()
const childrenStore = useChildrenStore()
const authStore = useAuthStore()
const { requestPermission } = useDoseReminders()

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

const hasChildren = computed(() => childrenStore.children.length > 0)
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
        <v-btn block height="64" color="primary" variant="flat" rounded="lg" to="/gecmis">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-history" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.last48h') }}</span>
          </div>
        </v-btn>
        <v-btn block height="64" color="nextdose" variant="flat" rounded="lg" to="/sonraki-doz">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-clock-check-outline" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.nextSafeDose') }}</span>
          </div>
        </v-btn>
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
        <v-btn block height="64" color="symptom" variant="flat" rounded="lg" to="/semptomlar">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-emoticon-sick-outline" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.symptoms') }}</span>
          </div>
        </v-btn>
        <v-btn block height="64" color="sleep" variant="flat" rounded="lg" to="/uyku">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-sleep" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.sleep') }}</span>
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
        <v-btn block height="64" color="diaper" variant="flat" rounded="lg" to="/bez-degisimi">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-diaper-outline" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.diaper') }}</span>
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
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.askAlfred') }}</span>
          </div>
        </v-btn>
        <v-btn block height="64" color="pharmacy" variant="flat" rounded="lg" to="/nobetci-eczane">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-mortar-pestle" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.dutyPharmacy') }}</span>
          </div>
        </v-btn>
        <v-btn block height="64" color="hospital" variant="flat" rounded="lg" to="/hastaneler">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-hospital-building" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.nearbyHospitals') }}</span>
          </div>
        </v-btn>
        <v-btn block height="64" color="activity" variant="flat" rounded="lg" to="/etkinlikler">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-drama-masks" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.nearbyActivities') }}</span>
          </div>
        </v-btn>
        <v-btn block height="64" color="calendar" variant="flat" rounded="lg" to="/takvim">
          <div class="d-flex align-center w-100">
            <v-icon icon="mdi-calendar-heart" size="26" class="mr-3" />
            <span class="text-body-1 font-weight-bold">{{ t('home.tiles.calendar') }}</span>
          </div>
        </v-btn>
      </div>

      <AddReadingDialog v-model="showReadingDialog" />
      <AddDoseDialog v-model="showDoseDialog" />
      <OnboardingWizard v-model="showOnboarding" />
    </template>
  </v-container>
</template>
