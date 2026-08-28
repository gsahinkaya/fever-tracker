<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { useNow } from '@/composables/useNow'
import { currentTimeString, resolveTakenAt } from '@/lib/time'
import { localeTag } from '@/lib/dateFormat'

const { t } = useI18n()
const model = defineModel<boolean>({ default: false })
const store = useFeverLogStore()
const medicationsStore = useMedicationsStore()
const now = useNow()

const medicationId = ref<string | null>(null)
const time = ref('')

watch(model, (open) => {
  if (open) {
    medicationId.value = medicationsStore.medications[0]?.id ?? null
    time.value = currentTimeString()
  }
})

const selectedMedication = computed(
  () => medicationsStore.medications.find((m) => m.id === medicationId.value) ?? null,
)

const safeAt = computed(() =>
  selectedMedication.value
    ? store.nextSafeDoseAt(selectedMedication.value.id, selectedMedication.value.minIntervalHours)
    : null,
)
const isTooEarly = computed(() => !!safeAt.value && safeAt.value > now.value)
const remainingLabel = computed(() => {
  if (!safeAt.value) return ''
  const diff = safeAt.value - now.value
  if (diff <= 0) return ''
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return t('common.durationHoursMinutes', { h, m })
})

const tooEarlyMessage = computed(() =>
  t('dialogs.addDose.tooEarly', { remaining: remainingLabel.value }),
)

function dateTimeLabel(ts: number): string {
  return new Date(ts).toLocaleString(localeTag(), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// The time field only ever picks a moment on *today* (see resolveTakenAt),
// so this catches the real mismatch case: logging a course medication's
// dose today when its course hasn't started yet, or has already ended —
// not a full backdating check across arbitrary past dates.
const doseTakenAt = computed(() => resolveTakenAt(time.value).getTime())
const courseWarning = computed(() => {
  const med = selectedMedication.value
  if (!med) return null
  const takenAt = doseTakenAt.value
  if (med.courseStartAt && takenAt < med.courseStartAt) {
    return t('dialogs.addDose.beforeCourseStart', { date: dateTimeLabel(med.courseStartAt) })
  }
  if (med.courseEndAt && takenAt > med.courseEndAt) {
    return t('dialogs.addDose.afterCourseEnd', { date: dateTimeLabel(med.courseEndAt) })
  }
  return null
})

function confirm() {
  if (!selectedMedication.value) return
  store.addDose(
    selectedMedication.value.id,
    selectedMedication.value.name,
    resolveTakenAt(time.value),
  )
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card v-if="medicationsStore.medications.length">
      <v-card-title class="text-h6">{{ t('dialogs.addDose.title') }}</v-card-title>
      <v-card-text>
        <v-radio-group v-model="medicationId" density="comfortable">
          <v-radio
            v-for="med in medicationsStore.medications"
            :key="med.id"
            :value="med.id"
            :label="med.note ? `${med.name} (${med.note})` : med.name"
          />
        </v-radio-group>

        <v-alert
          v-if="isTooEarly"
          type="warning"
          variant="tonal"
          density="comfortable"
          class="mb-4"
        >
          {{ tooEarlyMessage }}
        </v-alert>

        <v-alert
          v-if="courseWarning"
          type="warning"
          variant="tonal"
          density="comfortable"
          class="mb-4"
        >
          {{ courseWarning }}
        </v-alert>

        <v-text-field
          v-model="time"
          type="time"
          :label="t('dialogs.addDose.timeLabel')"
          :hint="t('dialogs.addDose.timeHint')"
          persistent-hint
          variant="outlined"
          density="comfortable"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">{{ t('common.cancel') }}</v-btn>
        <v-btn
          :color="isTooEarly || courseWarning ? 'warning' : 'primary'"
          variant="flat"
          size="large"
          @click="confirm"
        >
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-card v-else>
      <v-card-title class="text-h6">{{ t('dialogs.addDose.noMedTitle') }}</v-card-title>
      <v-card-text>
        {{ t('dialogs.addDose.noMedBody') }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" to="/ilaclar" @click="model = false">{{
          t('dialogs.addDose.addMedButton')
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
