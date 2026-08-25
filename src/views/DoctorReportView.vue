<script setup lang="ts">
import { computed } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import { useChildrenStore } from '@/stores/children'
import type { FeverReading } from '@/types/health'
import TemperatureChart from '@/components/chart/TemperatureChart.vue'

const store = useFeverLogStore()
const childrenStore = useChildrenStore()

const recent = computed(() => store.recentEntries(48))
const readings = computed(() => recent.value.filter((e) => e.type === 'reading') as FeverReading[])
const activeChildName = computed(
  () => childrenStore.children.find((c) => c.id === store.activeChildId)?.name ?? '',
)

function timeLabel(ts: number) {
  return new Date(ts).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const generatedAtLabel = new Date().toLocaleString('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function createPdf() {
  window.print()
}
</script>

<template>
  <v-container style="max-width: 640px">
    <div class="d-flex align-center mb-2 no-print">
      <v-btn icon="mdi-arrow-left" variant="tonal" color="primary" to="/" aria-label="Geri" />
      <span class="text-h6 ml-2">Doktor Özet Raporu</span>
      <v-spacer />
      <v-btn color="primary" variant="tonal" prepend-icon="mdi-file-pdf-box" @click="createPdf">
        PDF Oluştur
      </v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4 no-print">
      Son 48 saatin ateş ve ilaç kayıtları. Bu ekranı doğrudan doktora gösterebilir ya da "PDF
      Oluştur" ile kaydedip paylaşabilirsin.
    </p>

    <div class="print-only mb-4">
      <h2 class="text-h6">
        Doktor Özet Raporu{{ activeChildName ? ` · ${activeChildName}` : '' }}
      </h2>
      <p class="text-body-2">Son 48 saat · Oluşturulma: {{ generatedAtLabel }}</p>
    </div>

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
            {{
              entry.type === 'reading' ? `${entry.temperature.toFixed(1)} °C` : entry.medicationName
            }}
          </td>
        </tr>
        <tr v-if="!recent.length">
          <td colspan="3" class="text-center text-medium-emphasis py-4">Son 48 saatte kayıt yok</td>
        </tr>
      </tbody>
    </v-table>
  </v-container>
</template>
