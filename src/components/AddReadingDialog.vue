<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { currentTimeString, resolveTakenAt } from '@/lib/time'

const { t } = useI18n()
const model = defineModel<boolean>({ default: false })
const store = useFeverLogStore()
const medicationsStore = useMedicationsStore()

const temperature = ref<number | null>(null)
const note = ref('')
const time = ref('')
const alsoGaveMedication = ref(false)
const medicationId = ref<string | null>(null)

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
