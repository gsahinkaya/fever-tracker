<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { currentTimeString, resolveTakenAt } from '@/lib/time'

const { t } = useI18n()
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
  store.addSolidFood(note.value.trim() || undefined, resolveTakenAt(time.value))
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card>
      <v-card-title class="text-h6">{{ t('dialogs.addSolidFood.title') }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="note"
          :label="t('dialogs.addSolidFood.noteLabel')"
          :placeholder="t('dialogs.addSolidFood.notePlaceholder')"
          autofocus
          variant="outlined"
          density="comfortable"
        />
        <v-text-field
          v-model="time"
          type="time"
          :label="t('dialogs.addSolidFood.timeLabel')"
          :hint="t('dialogs.addSolidFood.timeHint')"
          persistent-hint
          variant="outlined"
          density="comfortable"
          class="mt-2"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" size="large" @click="save">{{
          t('common.save')
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
