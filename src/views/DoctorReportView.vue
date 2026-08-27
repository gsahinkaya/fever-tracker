<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas-pro'
import { useFeverLogStore } from '@/stores/feverLog'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useGrowthLogStore } from '@/stores/growthLog'
import { useMedicationsStore } from '@/stores/medications'
import { useChildrenStore } from '@/stores/children'
import { ageLabel } from '@/lib/age'
import { feedingEntryTitle } from '@/lib/entryTitles'
import {
  headCircBoys,
  headCircGirls,
  heightBoys,
  heightGirls,
  weightBoys,
  weightGirls,
} from '@/data/whoGrowthStandards'
import { percentileForMeasurement } from '@/lib/growthPercentile'
import { VACCINATION_SCHEDULE } from '@/data/vaccinationSchedule'
import type { FeverReading, FeedingEntry } from '@/types/health'
import TemperatureChart from '@/components/chart/TemperatureChart.vue'

const { t } = useI18n()
const store = useFeverLogStore()
const feedingLogStore = useFeedingLogStore()
const growthLogStore = useGrowthLogStore()
const medicationsStore = useMedicationsStore()
const childrenStore = useChildrenStore()

// A single ER/urgent-care visit or short illness rarely fits in 48h — a
// week gives the doctor the actual shape of the illness (when the fever
// started, how doses were spaced) without the report becoming unbounded.
const WINDOW_HOURS = 24 * 7

const recent = computed(() => store.recentEntries(WINDOW_HOURS))
const readings = computed(() => recent.value.filter((e) => e.type === 'reading') as FeverReading[])
const recentFeedings = computed(() => feedingLogStore.recentEntries(WINDOW_HOURS))
type CombinedRow = (typeof recent.value)[number] | FeedingEntry
const combinedRecent = computed<CombinedRow[]>(() =>
  [...recent.value, ...recentFeedings.value].sort((a, b) => b.takenAt - a.takenAt),
)

const activeChild = computed(
  () => childrenStore.children.find((c) => c.id === store.activeChildId) ?? null,
)
const activeChildName = computed(() => activeChild.value?.name ?? '')

const ageMonthsNow = computed(() => {
  if (!activeChild.value?.birthDate) return null
  return (Date.now() - new Date(activeChild.value.birthDate).getTime()) / (30.436875 * 86_400_000)
})

// Latest growth reading, not the child profile's own fields — those are
// kept in sync with it (see AddGrowthDialog) but the entry carries the date.
const latestGrowth = computed(
  () => [...growthLogStore.entries].sort((a, b) => b.takenAt - a.takenAt)[0] ?? null,
)
const canShowGrowthPercentiles = computed(
  () => !!activeChild.value?.gender && ageMonthsNow.value != null,
)
function growthPercentileLabel(
  value: number | undefined,
  table: { L: number; M: number; S: number }[],
): string | null {
  if (value == null || !canShowGrowthPercentiles.value) return null
  return `${percentileForMeasurement(table, ageMonthsNow.value!, value)}.`
}
const heightTable = computed(() => (activeChild.value?.gender === 'female' ? heightGirls : heightBoys))
const weightTable = computed(() => (activeChild.value?.gender === 'female' ? weightGirls : weightBoys))
const headCircTable = computed(() =>
  activeChild.value?.gender === 'female' ? headCircGirls : headCircBoys,
)

const vaccineSummary = computed(() => {
  if (!activeChild.value?.birthDate) return null
  const birth = new Date(activeChild.value.birthDate).getTime()
  const completed = new Set(activeChild.value.completedVaccineIds ?? [])
  const now = Date.now()
  let done = 0
  let overdue = 0
  for (const item of VACCINATION_SCHEDULE) {
    if (completed.has(item.id)) {
      done++
    } else if (birth + item.ageDays * 86_400_000 < now) {
      overdue++
    }
  }
  return { done, overdue, total: VACCINATION_SCHEDULE.length }
})

function feedingRowLabel(entry: FeedingEntry): string {
  return feedingEntryTitle(entry)
}

function genderLabel(gender: string): string {
  return gender === 'female' || gender === 'male' ? t(`doctorReport.gender.${gender}`) : gender
}

const childSummaryParts = computed(() => {
  const child = activeChild.value
  if (!child) return []
  const parts: string[] = []
  if (child.gender) parts.push(genderLabel(child.gender))
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
        :aria-label="t('common.back')"
        @click="$router.back()"
      />
      <span class="text-h6 ml-2">{{ t('doctorReport.title') }}</span>
      <v-spacer />
      <v-btn
        color="primary"
        variant="tonal"
        prepend-icon="mdi-file-pdf-box"
        :loading="generatingPdf"
        @click="createPdf"
      >
        {{ t('doctorReport.createPdf') }}
      </v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-4 no-print">
      {{ t('doctorReport.description') }}
    </p>

    <div ref="reportContent">
      <v-card variant="outlined" class="mb-4 pa-4">
        <div class="text-h6">{{ activeChildName || t('doctorReport.title') }}</div>
        <div v-if="childSummaryParts.length" class="text-body-2 text-medium-emphasis">
          {{ childSummaryParts.join(' · ') }}
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
          {{ t('doctorReport.generatedAt', { date: generatedAtLabel }) }}
        </div>
      </v-card>

      <v-card
        v-if="latestGrowth || vaccineSummary"
        variant="outlined"
        class="mb-4 pa-4"
      >
        <div class="text-subtitle-2 mb-2">{{ t('doctorReport.healthSummaryTitle') }}</div>
        <div v-if="latestGrowth" class="text-body-2 mb-1">
          {{ t('doctorReport.growthSummaryLabel', { date: timeLabel(latestGrowth.takenAt) }) }}
          <span v-if="latestGrowth.heightCm">
            · {{ latestGrowth.heightCm }} cm<template v-if="growthPercentileLabel(latestGrowth.heightCm, heightTable)">
              ({{ growthPercentileLabel(latestGrowth.heightCm, heightTable) }} p)</template
            >
          </span>
          <span v-if="latestGrowth.weightKg">
            · {{ latestGrowth.weightKg }} kg<template v-if="growthPercentileLabel(latestGrowth.weightKg, weightTable)">
              ({{ growthPercentileLabel(latestGrowth.weightKg, weightTable) }} p)</template
            >
          </span>
          <span v-if="latestGrowth.headCircumferenceCm">
            · {{ latestGrowth.headCircumferenceCm }} cm baş çevresi<template
              v-if="growthPercentileLabel(latestGrowth.headCircumferenceCm, headCircTable)"
            >
              ({{ growthPercentileLabel(latestGrowth.headCircumferenceCm, headCircTable) }}
              p)</template
            >
          </span>
        </div>
        <div v-if="vaccineSummary" class="text-body-2">
          {{ t('doctorReport.vaccineSummaryLabel', { done: vaccineSummary.done, total: vaccineSummary.total }) }}
          <span v-if="vaccineSummary.overdue" class="text-error">
            · {{ t('doctorReport.vaccineOverdueLabel', { overdue: vaccineSummary.overdue }) }}
          </span>
        </div>
      </v-card>

      <v-card v-if="medicationsStore.medications.length" variant="outlined" class="mb-4 pa-4">
        <div class="text-subtitle-2 mb-2">{{ t('doctorReport.medicationsTitle') }}</div>
        <div
          v-for="med in medicationsStore.medications"
          :key="med.id"
          class="text-body-2 text-medium-emphasis"
        >
          {{ med.name }} — {{ t('medications.perSafe', { hours: med.minIntervalHours })
          }}<span v-if="med.note"> ({{ med.note }})</span>
        </div>
      </v-card>

      <v-card variant="outlined" class="mb-6 pa-2">
        <TemperatureChart :readings="readings" />
      </v-card>

      <v-table density="comfortable">
        <thead>
          <tr>
            <th>{{ t('doctorReport.columns.time') }}</th>
            <th>{{ t('doctorReport.columns.type') }}</th>
            <th>{{ t('doctorReport.columns.value') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in combinedRecent" :key="entry.id">
            <td>{{ timeLabel(entry.takenAt) }}</td>
            <td>
              {{
                entry.type === 'reading'
                  ? t('doctorReport.typeFever')
                  : entry.type === 'dose'
                    ? t('doctorReport.typeMedication')
                    : t('doctorReport.typeFeeding')
              }}
            </td>
            <td>
              {{
                entry.type === 'reading'
                  ? `${entry.temperature.toFixed(1)} °C`
                  : entry.type === 'dose'
                    ? entry.medicationName
                    : feedingRowLabel(entry)
              }}
            </td>
          </tr>
          <tr v-if="!combinedRecent.length">
            <td colspan="3" class="text-center text-medium-emphasis py-4">
              {{ t('doctorReport.noRecords') }}
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </v-container>
</template>
