<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LogEntry, FeedingEntry, SymptomEntry, SleepEntry, DiaperEntry } from '@/types/health'
import { useFeverLogStore } from '@/stores/feverLog'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useSymptomLogStore } from '@/stores/symptomLog'
import { useSleepLogStore } from '@/stores/sleepLog'
import { useDiaperLogStore } from '@/stores/diaperLog'
import { useFamilyMembersStore } from '@/stores/familyMembers'
import { feedingEntryTitle } from '@/lib/entryTitles'
import { formatDuration, whoNameLabel } from '@/lib/describeActivity'
import { shortDateTime as timeLabel } from '@/lib/dateFormat'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

type CombinedEntry = LogEntry | FeedingEntry | SymptomEntry | SleepEntry | DiaperEntry

const { t } = useI18n()
defineProps<{ entries: CombinedEntry[] }>()
const feverLogStore = useFeverLogStore()
const feedingLogStore = useFeedingLogStore()
const symptomLogStore = useSymptomLogStore()
const sleepLogStore = useSleepLogStore()
const diaperLogStore = useDiaperLogStore()
const familyMembersStore = useFamilyMembersStore()

const confirmTarget = ref<CombinedEntry | null>(null)

const SYMPTOM_TYPES = new Set(['cough', 'vomiting', 'diarrhea', 'rash', 'runnyNose', 'other'])
function isSymptom(entry: CombinedEntry): entry is SymptomEntry {
  return 'type' in entry && SYMPTOM_TYPES.has(entry.type)
}
const DIAPER_TYPES = new Set(['pee', 'poop', 'both'])
function isDiaper(entry: CombinedEntry): entry is DiaperEntry {
  return 'type' in entry && DIAPER_TYPES.has(entry.type)
}
function isFeeding(entry: CombinedEntry): entry is FeedingEntry {
  return 'type' in entry && (entry.type === 'breastfeeding' || entry.type === 'bottle' || entry.type === 'solid')
}
// Only SleepEntry lacks a `type` discriminant among this union's members —
// it's the odd one out because it goes through useWatermarkedFeed like every
// other entry but was never given a `type` field (see types/health.ts).
function isSleep(entry: CombinedEntry): entry is SleepEntry {
  return !('type' in entry)
}

const icons: Record<string, string> = {
  reading: 'mdi-thermometer',
  dose: 'mdi-pill',
  breastfeeding: 'mdi-mother-nurse',
  bottle: 'mdi-baby-bottle-outline',
  solid: 'mdi-food-apple-outline',
}
const colors: Record<string, string> = {
  reading: 'error',
  dose: 'primary',
  breastfeeding: 'secondary',
  bottle: 'primary',
  solid: 'success',
}

function iconFor(entry: CombinedEntry): string {
  if (isSymptom(entry)) return 'mdi-emoticon-sick-outline'
  if (isDiaper(entry)) return 'mdi-diaper-outline'
  if (isSleep(entry)) return 'mdi-sleep'
  return icons[entry.type]!
}
function colorFor(entry: CombinedEntry): string {
  if (isSymptom(entry)) return 'symptom'
  if (isDiaper(entry)) return 'diaper'
  if (isSleep(entry)) return 'sleep'
  return colors[entry.type]!
}

function title(entry: CombinedEntry): string {
  if (isSymptom(entry)) {
    return t(`symptoms.types.${entry.type}`) + (entry.note ? ` · ${entry.note}` : '')
  }
  if (isDiaper(entry)) {
    return t(`diaper.types.${entry.type}`) + (entry.note ? ` · ${entry.note}` : '')
  }
  if (isSleep(entry)) {
    return entry.endedAt == null
      ? t('sleep.ongoing')
      : t('sleep.duration', { duration: formatDuration(Math.round((entry.endedAt - entry.takenAt) / 60_000)) })
  }
  if (entry.type === 'reading') return `${entry.temperature.toFixed(1)} °C`
  if (entry.type === 'dose') return t('timeline.doseTitle', { name: entry.medicationName })
  return feedingEntryTitle(entry as FeedingEntry)
}

const deleteBody = computed(() =>
  confirmTarget.value
    ? t('timeline.deleteConfirmBody', {
        title: title(confirmTarget.value),
        time: timeLabel(confirmTarget.value.takenAt),
      })
    : '',
)

function confirmDelete() {
  if (!confirmTarget.value) return
  if (isSymptom(confirmTarget.value)) {
    symptomLogStore.removeEntry(confirmTarget.value.id)
  } else if (isDiaper(confirmTarget.value)) {
    diaperLogStore.removeEntry(confirmTarget.value.id)
  } else if (isSleep(confirmTarget.value)) {
    sleepLogStore.removeEntry(confirmTarget.value.id)
  } else if (isFeeding(confirmTarget.value)) {
    feedingLogStore.removeEntry(confirmTarget.value.id)
  } else {
    feverLogStore.removeEntry(confirmTarget.value.id)
  }
  confirmTarget.value = null
}
</script>

<template>
  <v-list v-if="entries.length" lines="two">
    <v-list-item v-for="entry in entries" :key="entry.id">
      <template #prepend>
        <v-avatar :color="colorFor(entry)" variant="tonal">
          <v-icon :icon="iconFor(entry)" />
        </v-avatar>
      </template>
      <v-list-item-title>{{ title(entry) }}</v-list-item-title>
      <v-list-item-subtitle
        >{{ timeLabel(entry.takenAt) }} ·
        {{ whoNameLabel(familyMembersStore.members, entry.createdBy, entry.createdByEmail) }}</v-list-item-subtitle
      >
      <template #append>
        <v-btn
          icon="mdi-delete-outline"
          variant="text"
          size="small"
          :aria-label="t('timeline.deleteAria')"
          @click="confirmTarget = entry"
        />
      </template>
    </v-list-item>
  </v-list>
  <div v-else class="text-center text-medium-emphasis py-8">
    {{ t('timeline.empty') }}
  </div>

  <ConfirmDialog
    :model-value="!!confirmTarget"
    @update:model-value="(v: boolean) => !v && (confirmTarget = null)"
    :title="t('timeline.deleteConfirmTitle')"
    :body="deleteBody"
    @confirm="confirmDelete"
  />
</template>
