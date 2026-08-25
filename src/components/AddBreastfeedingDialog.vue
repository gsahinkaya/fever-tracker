<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFeedingLogStore } from '@/stores/feedingLog'
import type { BreastfeedingEntry } from '@/types/health'

const model = defineModel<boolean>({ default: false })
const store = useFeedingLogStore()

const durationMinutes = ref<number | null>(null)
const side = ref<BreastfeedingEntry['side'] | null>(null)

watch(model, (open) => {
  if (open) {
    durationMinutes.value = null
    side.value = null
  }
})

function save() {
  store.addBreastfeeding(durationMinutes.value ?? undefined, side.value ?? undefined)
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card>
      <v-card-title class="text-h6">Emzirme</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="durationMinutes"
          label="Süre (dakika, opsiyonel)"
          type="number"
          inputmode="numeric"
          autofocus
          variant="outlined"
          density="comfortable"
        />
        <v-radio-group v-model="side" density="comfortable" hide-details>
          <template #label>
            <span class="text-body-2">Taraf (opsiyonel)</span>
          </template>
          <v-radio label="Sol" value="left" />
          <v-radio label="Sağ" value="right" />
          <v-radio label="İkisi" value="both" />
        </v-radio-group>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">Vazgeç</v-btn>
        <v-btn color="primary" variant="flat" size="large" @click="save">Kaydet</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
