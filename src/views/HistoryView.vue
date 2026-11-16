<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeverLogStore } from '@/stores/feverLog'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useSymptomLogStore } from '@/stores/symptomLog'
import { useSleepLogStore } from '@/stores/sleepLog'
import { useDiaperLogStore } from '@/stores/diaperLog'
import { useMedicalNotesStore } from '@/stores/medicalNotes'
import CombinedTimelineList from '@/components/CombinedTimelineList.vue'

const { t } = useI18n()
const feverLogStore = useFeverLogStore()
const feedingLogStore = useFeedingLogStore()
const symptomLogStore = useSymptomLogStore()
const sleepLogStore = useSleepLogStore()
const diaperLogStore = useDiaperLogStore()
const medicalNotesStore = useMedicalNotesStore()

const showAll = ref(false)

type FilterType = 'all' | 'reading' | 'dose' | 'feeding' | 'symptom' | 'sleep' | 'diaper' | 'note'
const selectedFilter = ref<FilterType>('all')

const SYMPTOM_TYPES = new Set(['cough', 'vomiting', 'diarrhea', 'rash', 'runnyNose', 'other'])
function isSymptom(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'type' in e &&
    SYMPTOM_TYPES.has((e as { type: string }).type)
  )
}
const DIAPER_TYPES = new Set(['pee', 'poop', 'both'])
function isDiaper(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'type' in e &&
    DIAPER_TYPES.has((e as { type: string }).type)
  )
}
function isFeeding(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'type' in e &&
    ((e as { type: string }).type === 'breastfeeding' ||
      (e as { type: string }).type === 'bottle' ||
      (e as { type: string }).type === 'solid')
  )
}
function isSleep(e: unknown): boolean {
  return typeof e === 'object' && e !== null && !('type' in e) && !('category' in e)
}
function isNote(e: unknown): boolean {
  return typeof e === 'object' && e !== null && 'category' in e && 'content' in e
}

// The stores' Firestore listeners have no time filter (see each store's
// recentEntries), so "tümünü göster" needs no extra query — everything is
// already in memory, only the client-side window changes.
const activity = computed(() => {
  const fever = showAll.value ? feverLogStore.entries : feverLogStore.recentEntries(48)
  const feeding = showAll.value ? feedingLogStore.entries : feedingLogStore.recentEntries(48)
  const symptoms = showAll.value ? symptomLogStore.entries : symptomLogStore.recentEntries(48)
  // Only completed sleep sessions — the ongoing one (no endedAt) is
  // surfaced on the Uyku screen itself, not in this general timeline.
  const sleep = (showAll.value ? sleepLogStore.entries : sleepLogStore.recentEntries(48)).filter(
    (e) => e.endedAt != null,
  )
  const diapers = showAll.value ? diaperLogStore.entries : diaperLogStore.recentEntries(48)
  const notes = showAll.value ? medicalNotesStore.entries : medicalNotesStore.recentEntries(48)
  return [...fever, ...feeding, ...symptoms, ...sleep, ...diapers, ...notes].sort(
    (a, b) => b.takenAt - a.takenAt,
  )
})

const counts = computed(() => {
  const c = {
    all: activity.value.length,
    reading: 0,
    dose: 0,
    feeding: 0,
    symptom: 0,
    sleep: 0,
    diaper: 0,
    note: 0,
  }
  for (const e of activity.value) {
    if (isNote(e)) c.note++
    else if (isSymptom(e)) c.symptom++
    else if (isDiaper(e)) c.diaper++
    else if (isSleep(e)) c.sleep++
    else if (isFeeding(e)) c.feeding++
    else if ('type' in e && (e as { type: string }).type === 'reading') c.reading++
    else if ('type' in e && (e as { type: string }).type === 'dose') c.dose++
  }
  return c
})

const filterOptions = computed(() => [
  {
    value: 'all' as const,
    label: t('history.filter.all'),
    icon: 'mdi-view-headline',
    count: counts.value.all,
  },
  {
    value: 'reading' as const,
    label: t('history.filter.fever'),
    icon: 'mdi-thermometer',
    count: counts.value.reading,
  },
  {
    value: 'dose' as const,
    label: t('history.filter.medication'),
    icon: 'mdi-pill',
    count: counts.value.dose,
  },
  {
    value: 'note' as const,
    label: t('history.filter.note'),
    icon: 'mdi-notebook-edit-outline',
    count: counts.value.note,
  },
  {
    value: 'symptom' as const,
    label: t('history.filter.symptom'),
    icon: 'mdi-emoticon-sick-outline',
    count: counts.value.symptom,
  },
  {
    value: 'feeding' as const,
    label: t('history.filter.feeding'),
    icon: 'mdi-baby-bottle-outline',
    count: counts.value.feeding,
  },
  {
    value: 'sleep' as const,
    label: t('history.filter.sleep'),
    icon: 'mdi-sleep',
    count: counts.value.sleep,
  },
  {
    value: 'diaper' as const,
    label: t('history.filter.diaper'),
    icon: 'mdi-diaper-outline',
    count: counts.value.diaper,
  },
])

const filteredActivity = computed(() => {
  if (selectedFilter.value === 'all') return activity.value
  return activity.value.filter((e) => {
    if (selectedFilter.value === 'reading')
      return 'type' in e && (e as { type: string }).type === 'reading'
    if (selectedFilter.value === 'dose')
      return 'type' in e && (e as { type: string }).type === 'dose'
    if (selectedFilter.value === 'feeding') return isFeeding(e)
    if (selectedFilter.value === 'symptom') return isSymptom(e)
    if (selectedFilter.value === 'sleep') return isSleep(e)
    if (selectedFilter.value === 'diaper') return isDiaper(e)
    if (selectedFilter.value === 'note') return isNote(e)
    return true
  })
})
</script>

<template>
  <v-container style="max-width: 560px">
    <div class="d-flex align-center mb-3">
      <v-btn
        icon="mdi-arrow-left"
        variant="tonal"
        color="primary"
        :aria-label="t('common.back')"
        @click="$router.back()"
      />
      <span class="text-h6 ml-2">{{ showAll ? t('history.title') : t('history.last48h') }}</span>
      <v-spacer />
      <v-btn v-if="!showAll" variant="text" size="small" color="primary" @click="showAll = true">{{
        t('history.viewAll')
      }}</v-btn>
    </div>

    <!-- Filter chips -->
    <div class="mb-3">
      <v-chip-group
        v-model="selectedFilter"
        selected-class="text-primary font-weight-bold"
        mandatory
      >
        <v-chip
          v-for="opt in filterOptions"
          :key="opt.value"
          :value="opt.value"
          filter
          variant="tonal"
          size="small"
        >
          <v-icon start :icon="opt.icon" size="18" />
          {{ opt.label }}
          <span v-if="opt.count > 0" class="ml-1 text-caption font-weight-bold opacity-80">
            ({{ opt.count }})
          </span>
        </v-chip>
      </v-chip-group>
    </div>

    <CombinedTimelineList v-if="filteredActivity.length" :entries="filteredActivity" />
    <div v-else class="text-center text-medium-emphasis py-8 px-4">
      {{ t('history.noFilteredRecords') }}
    </div>
  </v-container>
</template>
