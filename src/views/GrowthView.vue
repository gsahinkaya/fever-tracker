<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGrowthLogStore } from '@/stores/growthLog'
import AddGrowthDialog from '@/components/AddGrowthDialog.vue'
import GrowthTimelineList from '@/components/GrowthTimelineList.vue'
import MeasurementChart from '@/components/chart/MeasurementChart.vue'

const { t } = useI18n()
const store = useGrowthLogStore()

const showAddDialog = ref(false)

// Growth entries are sparse (a handful a year), unlike fever/feeding — show
// the full history rather than windowing to the last 48 hours.
const sorted = computed(() => [...store.entries].sort((a, b) => b.takenAt - a.takenAt))

const heightPoints = computed(() =>
  store.entries
    .filter((e) => e.heightCm != null)
    .map((e) => ({ id: e.id, takenAt: e.takenAt, value: e.heightCm! })),
)
const weightPoints = computed(() =>
  store.entries
    .filter((e) => e.weightKg != null)
    .map((e) => ({ id: e.id, takenAt: e.takenAt, value: e.weightKg! })),
)
</script>

<template>
  <v-container class="py-4" style="max-width: 560px">
    <div class="d-flex align-center mb-4">
      <v-btn
        icon="mdi-arrow-left"
        variant="tonal"
        color="primary"
        :aria-label="t('common.back')"
        @click="$router.back()"
      />
      <span class="text-h6 ml-2">{{ t('growth.title') }}</span>
    </div>

    <v-btn
      block
      height="64"
      color="growth"
      variant="flat"
      rounded="lg"
      class="mb-6"
      @click="showAddDialog = true"
    >
      <div class="d-flex align-center w-100">
        <v-icon icon="mdi-human-male-height" size="26" class="mr-3" />
        <span class="text-body-1 font-weight-bold">{{ t('growth.addButton') }}</span>
      </div>
    </v-btn>

    <template v-if="heightPoints.length || weightPoints.length">
      <div class="mb-2">
        <span class="text-subtitle-2 text-medium-emphasis">{{ t('growth.heightChartTitle') }}</span>
      </div>
      <v-card variant="outlined" class="mb-6 pa-2">
        <MeasurementChart
          :points="heightPoints"
          unit="cm"
          :label="t('growth.heightChartTitle')"
          :empty-text="t('growth.emptyChart')"
        />
      </v-card>

      <div class="mb-2">
        <span class="text-subtitle-2 text-medium-emphasis">{{ t('growth.weightChartTitle') }}</span>
      </div>
      <v-card variant="outlined" class="mb-6 pa-2">
        <MeasurementChart
          :points="weightPoints"
          unit="kg"
          :decimals="2"
          :label="t('growth.weightChartTitle')"
          :empty-text="t('growth.emptyChart')"
        />
      </v-card>
    </template>

    <div class="mb-2">
      <span class="text-subtitle-2 text-medium-emphasis">{{ t('growth.history') }}</span>
    </div>
    <v-card variant="outlined">
      <GrowthTimelineList :entries="sorted" />
    </v-card>

    <AddGrowthDialog v-model="showAddDialog" />
  </v-container>
</template>
