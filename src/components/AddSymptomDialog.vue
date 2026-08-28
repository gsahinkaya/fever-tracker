<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSymptomLogStore } from '@/stores/symptomLog'
import { currentTimeString, resolveTakenAt } from '@/lib/time'
import type { SymptomType } from '@/types/health'

const { t } = useI18n()
const model = defineModel<boolean>({ default: false })
const store = useSymptomLogStore()

const SYMPTOM_TYPES: SymptomType[] = ['cough', 'vomiting', 'diarrhea', 'rash', 'runnyNose', 'other']

const type = ref<SymptomType>('cough')
const note = ref('')
const time = ref('')

watch(model, (open) => {
  if (open) {
    type.value = 'cough'
    note.value = ''
    time.value = currentTimeString()
  }
})

function save() {
  store.addSymptom(type.value, note.value || undefined, resolveTakenAt(time.value))
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card>
      <v-card-title class="text-h6">{{ t('symptoms.dialog.title') }}</v-card-title>
      <v-card-text>
        <v-radio-group v-model="type" density="comfortable">
          <v-radio
            v-for="symptomType in SYMPTOM_TYPES"
            :key="symptomType"
            :value="symptomType"
            :label="t(`symptoms.types.${symptomType}`)"
          />
        </v-radio-group>
        <v-text-field
          v-model="note"
          :label="t('symptoms.dialog.noteLabel')"
          :placeholder="t('symptoms.dialog.notePlaceholder')"
          variant="outlined"
          density="comfortable"
        />
        <v-text-field
          v-model="time"
          type="time"
          :label="t('symptoms.dialog.timeLabel')"
          :hint="t('symptoms.dialog.timeHint')"
          persistent-hint
          variant="outlined"
          density="comfortable"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="symptom" variant="flat" size="large" @click="save">
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
