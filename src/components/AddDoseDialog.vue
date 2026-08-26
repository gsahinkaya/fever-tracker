<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { useNow } from '@/composables/useNow'
import { currentTimeString, todayAt } from '@/lib/time'

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
  return `${h} sa ${m} dk`
})

function confirm() {
  if (!selectedMedication.value) return
  store.addDose(selectedMedication.value.id, selectedMedication.value.name, todayAt(time.value))
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card v-if="medicationsStore.medications.length">
      <v-card-title class="text-h6">İlaç Verildi</v-card-title>
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
          Son dozdan bu yana yeterli süre geçmedi. Güvenli zamana {{ remainingLabel }} kaldı. Yine
          de kaydedebilirsin, ama doktor/eczacına danış.
        </v-alert>

        <v-text-field
          v-model="time"
          type="time"
          label="Saat"
          hint="Önceden verildiyse saati değiştirebilirsin"
          persistent-hint
          variant="outlined"
          density="comfortable"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">Vazgeç</v-btn>
        <v-btn
          :color="isTooEarly ? 'warning' : 'primary'"
          variant="flat"
          size="large"
          @click="confirm"
        >
          Kaydet
        </v-btn>
      </v-card-actions>
    </v-card>

    <v-card v-else>
      <v-card-title class="text-h6">Henüz ilaç eklenmedi</v-card-title>
      <v-card-text>
        İlaç kaydı yapabilmek için önce takip etmek istediğin ilacı ve güvenli doz aralığını ekle.
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">Vazgeç</v-btn>
        <v-btn color="primary" variant="flat" to="/ilaclar" @click="model = false">İlaç Ekle</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
