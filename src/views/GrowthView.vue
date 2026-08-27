<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGrowthLogStore } from '@/stores/growthLog'
import { useChildrenStore } from '@/stores/children'
import AddGrowthDialog from '@/components/AddGrowthDialog.vue'
import GrowthTimelineList from '@/components/GrowthTimelineList.vue'
import MeasurementChart from '@/components/chart/MeasurementChart.vue'
import PercentileChart from '@/components/chart/PercentileChart.vue'
import {
  headCircBoys,
  headCircGirls,
  heightBoys,
  heightGirls,
  weightBoys,
  weightGirls,
} from '@/data/whoGrowthStandards'

const { t } = useI18n()
const store = useGrowthLogStore()
const childrenStore = useChildrenStore()

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
const headCircumferencePoints = computed(() =>
  store.entries
    .filter((e) => e.headCircumferenceCm != null)
    .map((e) => ({ id: e.id, takenAt: e.takenAt, value: e.headCircumferenceCm! })),
)

const activeChild = computed(
  () => childrenStore.children.find((c) => c.id === store.activeChildId) ?? null,
)

// WHO's reference curves only make sense plotted against age, which needs
// both a birth date (to compute it) and a sex (WHO publishes separate
// boys/girls tables) — without either, fall back to the plain trend chart.
const canShowPercentiles = computed(() => !!activeChild.value?.birthDate && !!activeChild.value?.gender)

const ageMonthsAt = (takenAt: number) => {
  const birth = new Date(activeChild.value!.birthDate!).getTime()
  return (takenAt - birth) / (30.436875 * 86_400_000)
}

const heightAgePoints = computed(() =>
  canShowPercentiles.value
    ? heightPoints.value.map((p) => ({ id: p.id, ageMonths: ageMonthsAt(p.takenAt), value: p.value }))
    : [],
)
const weightAgePoints = computed(() =>
  canShowPercentiles.value
    ? weightPoints.value.map((p) => ({ id: p.id, ageMonths: ageMonthsAt(p.takenAt), value: p.value }))
    : [],
)
const headCircumferenceAgePoints = computed(() =>
  canShowPercentiles.value
    ? headCircumferencePoints.value.map((p) => ({
        id: p.id,
        ageMonths: ageMonthsAt(p.takenAt),
        value: p.value,
      }))
    : [],
)
const heightTable = computed(() => (activeChild.value?.gender === 'female' ? heightGirls : heightBoys))
const weightTable = computed(() => (activeChild.value?.gender === 'female' ? weightGirls : weightBoys))
const headCircumferenceTable = computed(() =>
  activeChild.value?.gender === 'female' ? headCircGirls : headCircBoys,
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

    <template v-if="heightPoints.length || weightPoints.length || headCircumferencePoints.length">
      <p v-if="!canShowPercentiles" class="text-caption text-medium-emphasis mb-4">
        {{ t('growth.percentileHint') }}
      </p>

      <div class="mb-2">
        <span class="text-subtitle-2 text-medium-emphasis">{{ t('growth.heightChartTitle') }}</span>
      </div>
      <v-card variant="outlined" class="mb-6 pa-2">
        <PercentileChart
          v-if="canShowPercentiles"
          :points="heightAgePoints"
          :table="heightTable"
          unit="cm"
          :label="t('growth.heightChartTitle')"
          :empty-text="t('growth.emptyChart')"
        />
        <MeasurementChart
          v-else
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
        <PercentileChart
          v-if="canShowPercentiles"
          :points="weightAgePoints"
          :table="weightTable"
          unit="kg"
          :decimals="2"
          :label="t('growth.weightChartTitle')"
          :empty-text="t('growth.emptyChart')"
        />
        <MeasurementChart
          v-else
          :points="weightPoints"
          unit="kg"
          :decimals="2"
          :label="t('growth.weightChartTitle')"
          :empty-text="t('growth.emptyChart')"
        />
      </v-card>

      <div class="mb-2">
        <span class="text-subtitle-2 text-medium-emphasis">{{
          t('growth.headCircumferenceChartTitle')
        }}</span>
      </div>
      <v-card variant="outlined" class="mb-6 pa-2">
        <PercentileChart
          v-if="canShowPercentiles"
          :points="headCircumferenceAgePoints"
          :table="headCircumferenceTable"
          unit="cm"
          :label="t('growth.headCircumferenceChartTitle')"
          :empty-text="t('growth.emptyChart')"
        />
        <MeasurementChart
          v-else
          :points="headCircumferencePoints"
          unit="cm"
          :label="t('growth.headCircumferenceChartTitle')"
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
