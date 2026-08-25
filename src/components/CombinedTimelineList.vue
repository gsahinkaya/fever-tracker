<script setup lang="ts">
import { ref } from 'vue'
import type { LogEntry, FeedingEntry } from '@/types/health'
import { useFeverLogStore } from '@/stores/feverLog'
import { useFeedingLogStore } from '@/stores/feedingLog'

type CombinedEntry = LogEntry | FeedingEntry

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
const milkTypeLabels: Record<string, string> = {
  formula: 'Mama',
  'breast-milk': 'Anne sütü',
  mixed: 'Karışık',
}
const sideLabels: Record<string, string> = {
  left: 'Sol',
  right: 'Sağ',
  both: 'İkisi',
}

function title(entry: CombinedEntry): string {
  if (entry.type === 'reading') return `${entry.temperature.toFixed(1)} °C`
  if (entry.type === 'dose') return `${entry.medicationName} verildi`
  if (entry.type === 'breastfeeding') {
    const parts = ['Emzirme']
    if (entry.durationMinutes) parts.push(`${entry.durationMinutes} dk`)
    if (entry.side) parts.push(sideLabels[entry.side] ?? entry.side)
    return parts.join(' · ')
  }
  if (entry.type === 'bottle') return `${entry.amountMl} ml · ${milkTypeLabels[entry.milkType]}`
  return entry.note ? `Katı gıda · ${entry.note}` : 'Katı gıda'
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
          aria-label="Kaydı sil"
          @click="confirmTarget = entry"
        />
      </template>
    </v-list-item>
  </v-list>
  <div v-else class="text-center text-medium-emphasis py-8">
    Henüz kayıt yok. Yukarıdaki butonlarla ilk kaydı ekle.
  </div>

  <v-dialog
    :model-value="!!confirmTarget"
    max-width="360"
    @update:model-value="(v) => !v && (confirmTarget = null)"
  >
    <v-card v-if="confirmTarget">
      <v-card-title class="text-h6">Kaydı sil</v-card-title>
      <v-card-text
        >{{ title(confirmTarget) }} · {{ timeLabel(confirmTarget.takenAt) }} kaydı silinsin
        mi?</v-card-text
      >
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="confirmTarget = null">Vazgeç</v-btn>
        <v-btn color="error" variant="flat" @click="confirmDelete">Sil</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
