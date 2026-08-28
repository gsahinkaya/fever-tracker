<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDiaperLogStore } from '@/stores/diaperLog'
import { currentTimeString, resolveTakenAt } from '@/lib/time'
import type { DiaperType } from '@/types/health'

const { t } = useI18n()
const model = defineModel<boolean>({ default: false })
const store = useDiaperLogStore()

const DIAPER_TYPES: DiaperType[] = ['pee', 'poop', 'both']

const type = ref<DiaperType>('pee')
const note = ref('')
const time = ref('')

watch(model, (open) => {
  if (open) {
    type.value = 'pee'
    note.value = ''
    time.value = currentTimeString()
  }
})

function save() {
  store.addDiaper(type.value, note.value || undefined, resolveTakenAt(time.value))
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card>
      <v-card-title class="text-h6">{{ t('diaper.dialog.title') }}</v-card-title>
      <v-card-text>
        <v-radio-group v-model="type" density="comfortable">
          <v-radio
            v-for="diaperType in DIAPER_TYPES"
            :key="diaperType"
            :value="diaperType"
            :label="t(`diaper.types.${diaperType}`)"
          />
        </v-radio-group>
        <v-text-field
          v-model="note"
          :label="t('diaper.dialog.noteLabel')"
          :placeholder="t('diaper.dialog.notePlaceholder')"
          variant="outlined"
          density="comfortable"
        />
        <v-text-field
          v-model="time"
          type="time"
          :label="t('diaper.dialog.timeLabel')"
          :hint="t('diaper.dialog.timeHint')"
          persistent-hint
          variant="outlined"
          density="comfortable"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="diaper" variant="flat" size="large" @click="save">
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
