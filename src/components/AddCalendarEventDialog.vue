<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCalendarEventsStore } from '@/stores/calendarEvents'
import { todayDateString } from '@/lib/dateFormat'
import type { CalendarEvent } from '@/types/health'

const { t } = useI18n()
const model = defineModel<boolean>({ default: false })
const store = useCalendarEventsStore()

const title = ref('')
const date = ref('')
const time = ref('')
const note = ref('')
const repeat = ref<CalendarEvent['repeat']>(undefined)

const repeatOptions = [
  { value: undefined, title: t('calendar.repeat.none') },
  { value: 'weekly' as const, title: t('calendar.repeat.weekly') },
  { value: 'monthly' as const, title: t('calendar.repeat.monthly') },
]

watch(model, (open) => {
  if (open) {
    title.value = ''
    date.value = todayDateString()
    // Left blank by default (unlike the "log it now" dialogs elsewhere,
    // which default to the current time) — most calendar events are
    // all-day (a birthday, a "special day"), so a time is opt-in.
    time.value = ''
    note.value = ''
    repeat.value = undefined
  }
})

function save() {
  if (!title.value.trim() || !date.value) return
  store.addEvent(
    title.value.trim(),
    date.value,
    time.value || undefined,
    note.value.trim() || undefined,
    repeat.value,
  )
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
        <div class="d-flex ga-2">
          <v-text-field
            v-model="date"
            type="date"
            :label="t('calendar.dialog.dateLabel')"
            variant="outlined"
            density="comfortable"
          />
          <v-text-field
            v-model="time"
            type="time"
            :label="t('calendar.dialog.timeLabel')"
            :hint="t('calendar.dialog.timeHint')"
            persistent-hint
            variant="outlined"
            density="comfortable"
          />
        </div>
        <v-text-field
          v-model="note"
          :label="t('calendar.dialog.noteLabel')"
          variant="outlined"
          density="comfortable"
        />
        <v-select
          v-model="repeat"
          :items="repeatOptions"
          item-title="title"
          item-value="value"
          :label="t('calendar.dialog.repeatLabel')"
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
