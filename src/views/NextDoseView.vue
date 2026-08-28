<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import NextDoseCard from '@/components/NextDoseCard.vue'

const { t } = useI18n()
const store = useFeverLogStore()
const medicationsStore = useMedicationsStore()

// Only medications actually given at least once, so there's a meaningful
// dose to report on — but unlike Home's old inline version, this dedicated
// page keeps showing a medication once it's safe again too (NextDoseCard's
// "ready" state), since a parent opening this page specifically wants to
// know "can I give this now?", not just "how long until I can".
const medicationsWithHistory = computed(() =>
  medicationsStore.medications.filter(
    (med) => store.nextSafeDoseAt(med.id, med.minIntervalHours) != null,
  ),
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

    <v-row v-if="medicationsWithHistory.length">
      <v-col v-for="med in medicationsWithHistory" :key="med.id" cols="12" sm="6">
        <NextDoseCard :medication="med" />
      </v-col>
    </v-row>
    <div v-else class="text-center text-medium-emphasis py-8">
      {{ t('nextDoseCard.noWaitingDoses') }}
    </div>
  </v-container>
</template>
