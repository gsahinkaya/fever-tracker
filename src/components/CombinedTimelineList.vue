<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LogEntry, FeedingEntry, SymptomEntry, SleepEntry } from '@/types/health'
import { useFeverLogStore } from '@/stores/feverLog'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useSymptomLogStore } from '@/stores/symptomLog'
import { useSleepLogStore } from '@/stores/sleepLog'
import { feedingEntryTitle } from '@/lib/entryTitles'
import { formatDuration } from '@/lib/describeActivity'

type CombinedEntry = LogEntry | FeedingEntry | SymptomEntry | SleepEntry

const { t } = useI18n()
defineProps<{ entries: CombinedEntry[] }>()
const feverLogStore = useFeverLogStore()
const feedingLogStore = useFeedingLogStore()
const symptomLogStore = useSymptomLogStore()
const sleepLogStore = useSleepLogStore()

const confirmTarget = ref<CombinedEntry | null>(null)

const SYMPTOM_TYPES = new Set(['cough', 'vomiting', 'diarrhea', 'rash', 'runnyNose', 'other'])
function isSymptom(entry: CombinedEntry): entry is SymptomEntry {
  return 'type' in entry && SYMPTOM_TYPES.has(entry.type)
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
  if (isSleep(entry)) return 'mdi-sleep'
  return icons[entry.type]!
}
function colorFor(entry: CombinedEntry): string {
  if (isSymptom(entry)) return 'symptom'
  if (isSleep(entry)) return 'sleep'
  return colors[entry.type]!
}

function title(entry: CombinedEntry): string {
  if (isSymptom(entry)) {
    return t(`symptoms.types.${entry.type}`) + (entry.note ? ` · ${entry.note}` : '')
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

function timeLabel(ts: number) {
  return new Date(ts).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function confirmDelete() {
  if (!confirmTarget.value) return
  if (isSymptom(confirmTarget.value)) {
    symptomLogStore.removeEntry(confirmTarget.value.id)
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
      <v-list-item-subtitle>{{ timeLabel(entry.takenAt) }}</v-list-item-subtitle>
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

  <v-dialog
    :model-value="!!confirmTarget"
    max-width="360"
    @update:model-value="(v) => !v && (confirmTarget = null)"
  >
    <v-card v-if="confirmTarget">
      <v-card-title class="text-h6">{{ t('timeline.deleteConfirmTitle') }}</v-card-title>
      <v-card-text>{{
        t('timeline.deleteConfirmBody', {
          title: title(confirmTarget),
          time: timeLabel(confirmTarget.takenAt),
        })
      }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="confirmTarget = null">{{ t('common.cancel') }}</v-btn>
        <v-btn color="error" variant="flat" @click="confirmDelete">{{ t('common.delete') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
