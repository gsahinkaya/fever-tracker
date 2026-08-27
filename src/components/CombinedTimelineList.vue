<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LogEntry, FeedingEntry } from '@/types/health'
import { useFeverLogStore } from '@/stores/feverLog'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { feedingEntryTitle } from '@/lib/entryTitles'

type CombinedEntry = LogEntry | FeedingEntry

const { t } = useI18n()
defineProps<{ entries: CombinedEntry[] }>()
const feverLogStore = useFeverLogStore()
const feedingLogStore = useFeedingLogStore()

const confirmTarget = ref<CombinedEntry | null>(null)

const icons: Record<CombinedEntry['type'], string> = {
  reading: 'mdi-thermometer',
  dose: 'mdi-pill',
  breastfeeding: 'mdi-mother-nurse',
  bottle: 'mdi-baby-bottle-outline',
  solid: 'mdi-food-apple-outline',
}
const colors: Record<CombinedEntry['type'], string> = {
  reading: 'error',
  dose: 'primary',
  breastfeeding: 'secondary',
  bottle: 'primary',
  solid: 'success',
}

function title(entry: CombinedEntry): string {
  if (entry.type === 'reading') return `${entry.temperature.toFixed(1)} °C`
  if (entry.type === 'dose') return t('timeline.doseTitle', { name: entry.medicationName })
  return feedingEntryTitle(entry)
}

function timeLabel(ts: number) {
  return new Date(ts).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isFeeding(entry: CombinedEntry): entry is FeedingEntry {
  return entry.type === 'breastfeeding' || entry.type === 'bottle' || entry.type === 'solid'
}

function confirmDelete() {
  if (!confirmTarget.value) return
  if (isFeeding(confirmTarget.value)) {
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
        <v-avatar :color="colors[entry.type]" variant="tonal">
          <v-icon :icon="icons[entry.type]" />
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
