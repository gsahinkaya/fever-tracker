<script setup lang="ts">
import { ref } from 'vue'
import type { LogEntry } from '@/types/health'
import { useFeverLogStore } from '@/stores/feverLog'

defineProps<{ entries: LogEntry[] }>()
const store = useFeverLogStore()

const confirmTarget = ref<LogEntry | null>(null)

function timeLabel(ts: number) {
  return new Date(ts).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function confirmDelete() {
  if (confirmTarget.value) store.removeEntry(confirmTarget.value.id)
  confirmTarget.value = null
}
</script>

<template>
  <v-list v-if="entries.length" lines="two">
    <v-list-item v-for="entry in entries" :key="entry.id">
      <template #prepend>
        <v-avatar :color="entry.type === 'reading' ? 'error' : 'primary'" variant="tonal">
          <v-icon :icon="entry.type === 'reading' ? 'mdi-thermometer' : 'mdi-pill'" />
        </v-avatar>
      </template>
      <v-list-item-title v-if="entry.type === 'reading'">{{ entry.temperature.toFixed(1) }} °C</v-list-item-title>
      <v-list-item-title v-else>{{ entry.medicationName }} verildi</v-list-item-title>
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
    Henüz kayıt yok. Yukarıdaki butonlarla ilk ölçümü ekle.
  </div>

  <v-dialog :model-value="!!confirmTarget" max-width="360" @update:model-value="(v) => !v && (confirmTarget = null)">
    <v-card v-if="confirmTarget">
      <v-card-title class="text-h6">Kaydı sil</v-card-title>
      <v-card-text>
        {{
          confirmTarget.type === 'reading' ? `${confirmTarget.temperature.toFixed(1)} °C` : confirmTarget.medicationName
        }}
        · {{ timeLabel(confirmTarget.takenAt) }} kaydı silinsin mi?
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="confirmTarget = null">Vazgeç</v-btn>
        <v-btn color="error" variant="flat" @click="confirmDelete">Sil</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
