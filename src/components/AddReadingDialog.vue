<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { useChildrenStore } from '@/stores/children'
import { useNow } from '@/composables/useNow'
import { currentTimeString, resolveTakenAt } from '@/lib/time'
import { assessFeverTriage } from '@/lib/feverTriage'
import { ageInMonths } from '@/lib/age'

const { t } = useI18n()
const model = defineModel<boolean>({ default: false })
const store = useFeverLogStore()
const medicationsStore = useMedicationsStore()
const childrenStore = useChildrenStore()
const now = useNow()

const temperature = ref<number | null>(null)
const note = ref('')
const time = ref('')
const alsoGaveMedication = ref(false)
const medicationId = ref<string | null>(null)

const selectedMedication = computed(
  () => medicationsStore.medications.find((m) => m.id === medicationId.value) ?? null,
)
const safeAt = computed(() =>
  selectedMedication.value
    ? store.nextSafeDoseAt(selectedMedication.value.id, selectedMedication.value.minIntervalHours)
    : null,
)
const isTooEarly = computed(
  () => alsoGaveMedication.value && !!safeAt.value && safeAt.value > now.value,
)
const remainingLabel = computed(() => {
  if (!safeAt.value) return ''
  const diff = safeAt.value - now.value
  if (diff <= 0) return ''
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return `${h} sa ${m} dk`
})
const tooEarlyMessage = computed(() =>
  t('dialogs.addDose.tooEarly', { remaining: remainingLabel.value }),
)

const activeChildBirthDate = computed(
  () => childrenStore.children.find((c) => c.id === store.activeChildId)?.birthDate,
)
const ageMonths = computed(() =>
  activeChildBirthDate.value ? ageInMonths(activeChildBirthDate.value) : null,
)
const triage = computed(() =>
  temperature.value != null && temperature.value > 0
    ? assessFeverTriage(temperature.value, ageMonths.value)
    : null,
)
const triageColor = computed(() => {
  if (triage.value?.level === 'emergency') return 'error'
  if (triage.value?.level === 'doctor') return 'warning'
  return 'success'
})

watch(model, (open) => {
  if (open) {
    temperature.value = null
    note.value = ''
    time.value = currentTimeString()
    alsoGaveMedication.value = false
    medicationId.value = medicationsStore.medications[0]?.id ?? null
  }
})

function save() {
  if (temperature.value == null || temperature.value <= 0) return
  const takenAt = resolveTakenAt(time.value)
  store.addReading(temperature.value, note.value || undefined, takenAt)
  if (alsoGaveMedication.value && medicationId.value) {
    const medication = medicationsStore.medications.find((m) => m.id === medicationId.value)
    if (medication) store.addDose(medication.id, medication.name, takenAt)
  }
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card>
      <v-card-title class="text-h6">{{ t('dialogs.addReading.title') }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="temperature"
          :label="t('dialogs.addReading.tempLabel')"
          type="number"
          step="0.1"
          inputmode="decimal"
          autofocus
          variant="outlined"
          density="comfortable"
        />
        <v-alert
          v-if="triage"
          :type="triageColor"
          variant="tonal"
          density="comfortable"
          class="mb-3"
        >
          <div>{{ triage.message }}</div>
          <div class="text-caption mt-1" style="opacity: 0.85">
            {{ t('feverTriage.disclaimer') }}
          </div>
        </v-alert>

        <v-text-field
          v-model="note"
          :label="t('dialogs.addReading.noteLabel')"
          variant="outlined"
          density="comfortable"
        />
        <v-text-field
          v-model="time"
          type="time"
          :label="t('dialogs.addReading.timeLabel')"
          :hint="t('dialogs.addReading.timeHint')"
          persistent-hint
          variant="outlined"
          density="comfortable"
        />

        <template v-if="medicationsStore.medications.length">
          <v-checkbox
            v-model="alsoGaveMedication"
            :label="t('dialogs.addReading.alsoGaveMedication')"
            density="comfortable"
            hide-details
          />

          <v-radio-group
            v-if="alsoGaveMedication"
            v-model="medicationId"
            density="comfortable"
            class="mt-2"
          >
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
            class="mt-2"
          >
            {{ tooEarlyMessage }}
          </v-alert>
        </template>
        <p v-else class="text-caption text-medium-emphasis mt-2">
          {{ t('dialogs.addReading.addMedicationHintPrefix') }}
          <RouterLink to="/ilaclar">{{ t('dialogs.addReading.addMedicationHintLink') }}</RouterLink
          >{{ t('dialogs.addReading.addMedicationHintSuffix') }}
        </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="error" variant="flat" size="large" :disabled="!temperature" @click="save">{{
          t('common.save')
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
