<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { currentTimeString, todayAt } from '@/lib/time'
import type { BottleEntry } from '@/types/health'

const model = defineModel<boolean>({ default: false })
const store = useFeedingLogStore()

const amountMl = ref<number | null>(null)
const milkType = ref<BottleEntry['milkType']>('formula')
const time = ref('')

watch(model, (open) => {
  if (open) {
    amountMl.value = null
    milkType.value = 'formula'
    time.value = currentTimeString()
  }
})

function save() {
  if (amountMl.value == null || amountMl.value <= 0) return
  store.addBottle(amountMl.value, milkType.value, todayAt(time.value))
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card>
      <v-card-title class="text-h6">Biberon</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="amountMl"
          label="Miktar (ml)"
          type="number"
          inputmode="numeric"
          autofocus
          variant="outlined"
          density="comfortable"
        />
        <v-radio-group v-model="milkType" density="comfortable" hide-details>
          <v-radio label="Mama" value="formula" />
          <v-radio label="Anne sütü" value="breast-milk" />
          <v-radio label="Karışık" value="mixed" />
        </v-radio-group>
        <v-text-field
          v-model="time"
          type="time"
          label="Saat"
          hint="Önceden verildiyse saati değiştirebilirsin"
          persistent-hint
          variant="outlined"
          density="comfortable"
          class="mt-2"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">Vazgeç</v-btn>
        <v-btn color="primary" variant="flat" size="large" :disabled="!amountMl" @click="save"
          >Kaydet</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
