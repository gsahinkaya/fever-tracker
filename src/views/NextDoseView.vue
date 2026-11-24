<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import NextDoseCard from '@/components/NextDoseCard.vue'

const { t } = useI18n()
const store = useFeverLogStore()
const medicationsStore = useMedicationsStore()

const showDismissed = ref(false)

const activeMedications = computed(() =>
  medicationsStore.medications.filter((med) => {
    const safeAt = store.nextSafeDoseAt(med.id, med.minIntervalHours)
    if (safeAt == null) return false
    const last = store.lastDose(med.id)
    if (!last) return false
    if (med.nextDoseDismissedAt && med.nextDoseDismissedAt >= last.takenAt) {
      return false
    }
    return true
  }),
)

const dismissedMedications = computed(() =>
  medicationsStore.medications.filter((med) => {
    const safeAt = store.nextSafeDoseAt(med.id, med.minIntervalHours)
    if (safeAt == null) return false
    const last = store.lastDose(med.id)
    if (!last) return false
    return !!(med.nextDoseDismissedAt && med.nextDoseDismissedAt >= last.takenAt)
  }),
)
</script>

<template>
  <v-container style="max-width: 560px">
    <div class="d-flex align-center mb-4">
      <v-btn
        icon="mdi-arrow-left"
        variant="tonal"
        color="primary"
        :aria-label="t('common.back')"
        @click="$router.back()"
      />
      <span class="text-h6 ml-2">{{ t('home.nextSafeDose') }}</span>
    </div>

    <v-row v-if="activeMedications.length">
      <v-col v-for="med in activeMedications" :key="med.id" cols="12" sm="6">
        <NextDoseCard :medication="med" />
      </v-col>
    </v-row>
    <div v-else class="text-center text-medium-emphasis py-8">
      {{ t('nextDoseCard.noWaitingDoses') }}
    </div>

    <!-- Dismissed cards section -->
    <div v-if="dismissedMedications.length" class="mt-4">
      <v-divider class="mb-4" />
      <div class="d-flex align-center justify-space-between mb-3">
        <span class="text-caption text-medium-emphasis">
          {{ t('nextDoseCard.dismissedSectionTitle') }}
        </span>
        <v-btn
          variant="text"
          size="small"
          color="primary"
          @click="showDismissed = !showDismissed"
        >
          {{ showDismissed ? t('nextDoseCard.hideDismissed') : t('nextDoseCard.showDismissed', { count: dismissedMedications.length }) }}
        </v-btn>
      </div>
      <v-row v-if="showDismissed">
        <v-col v-for="med in dismissedMedications" :key="med.id" cols="12" sm="6">
          <NextDoseCard :medication="med" :is-dismissed="true" />
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>
