<script setup lang="ts">
import { computed, ref } from 'vue'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'
import { useFeverLogStore } from '@/stores/feverLog'
import { useChildrenStore } from '@/stores/children'
import { ageLabel } from '@/lib/age'
import type { FeverReading } from '@/types/health'
import TemperatureChart from '@/components/chart/TemperatureChart.vue'

const store = useFeverLogStore()
const childrenStore = useChildrenStore()

const recent = computed(() => store.recentEntries(48))
const readings = computed(() => recent.value.filter((e) => e.type === 'reading') as FeverReading[])
const activeChild = computed(
  () => childrenStore.children.find((c) => c.id === store.activeChildId) ?? null,
)
const activeChildName = computed(() => activeChild.value?.name ?? '')

const genderLabels: Record<string, string> = { female: 'Kız', male: 'Erkek' }

const childSummaryParts = computed(() => {
  const child = activeChild.value
  if (!child) return []
  const parts: string[] = []
  if (child.gender) parts.push(genderLabels[child.gender] ?? child.gender)
  if (child.birthDate) {
    const formatted = new Date(child.birthDate).toLocaleDateString('tr-TR')
    parts.push(`${formatted} (${ageLabel(child.birthDate)})`)
  }
  if (child.heightCm) parts.push(`${child.heightCm} cm`)
  if (child.weightKg) parts.push(`${child.weightKg} kg`)
  return parts
})

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

const reportContent = ref<HTMLElement | null>(null)
const generatingPdf = ref(false)

async function createPdf() {
  if (!reportContent.value) return
  generatingPdf.value = true
  try {
    const canvas = await html2canvas(reportContent.value, { scale: 2, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const margin = 24
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth - margin * 2
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Longer reports don't fit one A4 page — slice the tall captured image
    // across as many pages as needed, each showing the next vertical chunk.
    let heightLeft = imgHeight
    let position = margin
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
    heightLeft -= pageHeight - margin * 2
    while (heightLeft > 0) {
      position = margin - (imgHeight - heightLeft)
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - margin * 2
    }

    const datePart = new Date().toISOString().slice(0, 10)
    const namePart = activeChildName.value ? `-${activeChildName.value}` : ''
    pdf.save(`kido-ozet-raporu${namePart}-${datePart}.pdf`)
  } finally {
    generatingPdf.value = false
  }
}
</script>

<template>
  <v-container style="max-width: 640px">
    <div class="d-flex align-center mb-2 no-print">
      <v-btn
        icon="mdi-arrow-left"
        variant="tonal"
        color="primary"
        aria-label="Geri"
        @click="$router.back()"
      />
      <span class="text-h6 ml-2">Doktor Özet Raporu</span>
      <v-spacer />
      <v-btn
        color="primary"
        variant="tonal"
        prepend-icon="mdi-file-pdf-box"
        :loading="generatingPdf"
        @click="createPdf"
      >
        PDF Oluştur
      </v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4 no-print">
      Son 48 saatin ateş ve ilaç kayıtları. Bu ekranı doğrudan doktora gösterebilir ya da "PDF
      Oluştur" ile indirip paylaşabilirsin.
    </p>

    <div ref="reportContent">
      <v-card variant="outlined" class="mb-4 pa-4">
        <div class="text-h6">{{ activeChildName || 'Doktor Özet Raporu' }}</div>
        <div v-if="childSummaryParts.length" class="text-body-2 text-medium-emphasis">
          {{ childSummaryParts.join(' · ') }}
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
          Son 48 saat · Oluşturulma: {{ generatedAtLabel }}
        </div>
      </v-card>

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
                entry.type === 'reading'
                  ? `${entry.temperature.toFixed(1)} °C`
                  : entry.medicationName
              }}
            </td>
          </tr>
          <tr v-if="!recent.length">
            <td colspan="3" class="text-center text-medium-emphasis py-4">
              Son 48 saatte kayıt yok
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </v-container>
</template>
