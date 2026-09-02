<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCalendarEventsStore } from '@/stores/calendarEvents'

const { t } = useI18n()
const model = defineModel<boolean>({ default: false })
const store = useCalendarEventsStore()

function todayString(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const title = ref('')
const date = ref('')
const note = ref('')

watch(model, (open) => {
  if (open) {
    title.value = ''
    date.value = todayString()
    note.value = ''
  }
})

function save() {
  if (!title.value.trim() || !date.value) return
  store.addEvent(title.value.trim(), date.value, note.value.trim() || undefined)
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card>
      <v-card-title class="text-h6">{{ t('calendar.dialog.title') }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model="title"
          :label="t('calendar.dialog.titleLabel')"
          :placeholder="t('calendar.dialog.titlePlaceholder')"
          variant="outlined"
          density="comfortable"
          autofocus
        />
        <v-text-field
          v-model="date"
          type="date"
          :label="t('calendar.dialog.dateLabel')"
          variant="outlined"
          density="comfortable"
        />
        <v-text-field
          v-model="note"
          :label="t('calendar.dialog.noteLabel')"
          variant="outlined"
          density="comfortable"
        />
        <p class="text-caption text-medium-emphasis">{{ t('calendar.reminderNote') }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">{{ t('common.cancel') }}</v-btn>
        <v-btn
          color="calendar"
          variant="flat"
          :disabled="!title.trim() || !date"
          @click="save"
        >
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
