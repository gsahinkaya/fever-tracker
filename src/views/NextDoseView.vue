<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { useNow } from '@/composables/useNow'
import NextDoseCard from '@/components/NextDoseCard.vue'

const { t } = useI18n()
const store = useFeverLogStore()
const medicationsStore = useMedicationsStore()
const now = useNow()

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
