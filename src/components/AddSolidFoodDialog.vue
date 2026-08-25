<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFeedingLogStore } from '@/stores/feedingLog'

const model = defineModel<boolean>({ default: false })
const store = useFeedingLogStore()

const note = ref('')

watch(model, (open) => {
  if (open) note.value = ''
})

function save() {
  store.addSolidFood(note.value.trim() || undefined)
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
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">Vazgeç</v-btn>
        <v-btn color="primary" variant="flat" size="large" @click="save">Kaydet</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
