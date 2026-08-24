<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'

const model = defineModel<boolean>({ default: false })
const store = useFeverLogStore()
const medicationsStore = useMedicationsStore()

const temperature = ref<number | null>(null)
const note = ref('')
const alsoGaveMedication = ref(false)
const medicationId = ref<string | null>(null)

watch(model, (open) => {
  if (open) {
    temperature.value = null
    note.value = ''
    alsoGaveMedication.value = false
    medicationId.value = medicationsStore.medications[0]?.id ?? null
  }
})

function save() {
  if (temperature.value == null || temperature.value <= 0) return
  store.addReading(temperature.value, note.value || undefined)
  if (alsoGaveMedication.value && medicationId.value) {
    const medication = medicationsStore.medications.find((m) => m.id === medicationId.value)
    if (medication) store.addDose(medication.id, medication.name)
  }
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card>
      <v-card-title class="text-h6">Ateş Girişi</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="temperature"
          label="Vücut sıcaklığı (°C)"
          type="number"
          step="0.1"
          inputmode="decimal"
          autofocus
          variant="outlined"
          density="comfortable"
        />
        <v-text-field v-model="note" label="Not (opsiyonel)" variant="outlined" density="comfortable" />

        <template v-if="medicationsStore.medications.length">
          <v-checkbox
            v-model="alsoGaveMedication"
            label="Aynı anda ilaç da verildi"
            density="comfortable"
            hide-details
          />

          <v-radio-group v-if="alsoGaveMedication" v-model="medicationId" density="comfortable" class="mt-2">
            <v-radio
              v-for="med in medicationsStore.medications"
              :key="med.id"
              :value="med.id"
              :label="med.note ? `${med.name} (${med.note})` : med.name"
            />
          </v-radio-group>
        </template>
        <p v-else class="text-caption text-medium-emphasis mt-2">
          İlaç da kaydetmek istersen önce <RouterLink to="/ilaclar">İlaçlarım</RouterLink>'dan bir ilaç ekle.
        </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">Vazgeç</v-btn>
        <v-btn color="error" variant="flat" size="large" :disabled="!temperature" @click="save">Kaydet</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
