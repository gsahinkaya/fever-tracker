<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { currentTimeString, todayAt } from '@/lib/time'

const model = defineModel<boolean>({ default: false })
const store = useFeedingLogStore()

const note = ref('')
const time = ref('')

watch(model, (open) => {
  if (open) {
    note.value = ''
    time.value = currentTimeString()
  }
})

function save() {
  store.addSolidFood(note.value.trim() || undefined, todayAt(time.value))
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card>
      <v-card-title class="text-h6">Katı Gıda</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="note"
          label="Ne yedi? (opsiyonel)"
          placeholder="Örn. elma püresi"
          autofocus
          variant="outlined"
          density="comfortable"
        />
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
        <v-btn color="primary" variant="flat" size="large" @click="save">Kaydet</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
