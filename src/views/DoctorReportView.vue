<script setup lang="ts">
import { computed } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import type { FeverReading } from '@/types/health'
import TemperatureChart from '@/components/chart/TemperatureChart.vue'

const store = useFeverLogStore()

const recent = computed(() => store.recentEntries(48))
const readings = computed(() => recent.value.filter((e) => e.type === 'reading') as FeverReading[])

function timeLabel(ts: number) {
  return new Date(ts).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <v-container style="max-width: 640px">
    <div class="d-flex align-center mb-2">
      <v-btn icon="mdi-arrow-left" variant="tonal" color="primary" to="/" aria-label="Geri" />
      <span class="text-h6 ml-2">Doktor Özet Raporu</span>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Son 48 saatin ateş ve ilaç kayıtları. Bu ekranı doğrudan doktora gösterebilirsin.
    </p>

    <v-card variant="outlined" class="mb-6 pa-2">
      <TemperatureChart :readings="readings" />
    </v-card>

    <v-table density="comfortable">
      <thead>
        <tr>
          <th>Saat</th>
          <th>Tür</th>
          <th>Değer</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in recent" :key="entry.id">
          <td>{{ timeLabel(entry.takenAt) }}</td>
          <td>{{ entry.type === 'reading' ? 'Ateş' : 'İlaç' }}</td>
          <td>
            {{ entry.type === 'reading' ? `${entry.temperature.toFixed(1)} °C` : entry.medicationName }}
          </td>
        </tr>
        <tr v-if="!recent.length">
          <td colspan="3" class="text-center text-medium-emphasis py-4">Son 48 saatte kayıt yok</td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>
