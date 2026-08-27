<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGrowthLogStore } from '@/stores/growthLog'
import { currentTimeString, resolveTakenAt } from '@/lib/time'

const { t } = useI18n()
const model = defineModel<boolean>({ default: false })
const store = useGrowthLogStore()

const heightCm = ref<number | null>(null)
const weightKg = ref<number | null>(null)
const headCircumferenceCm = ref<number | null>(null)
const time = ref('')

watch(model, (open) => {
  if (open) {
    heightCm.value = null
    weightKg.value = null
    headCircumferenceCm.value = null
    time.value = currentTimeString()
  }
})

function save() {
  if (!heightCm.value && !weightKg.value && !headCircumferenceCm.value) return
  store.addGrowthEntry(
    heightCm.value ?? undefined,
    weightKg.value ?? undefined,
    resolveTakenAt(time.value),
    headCircumferenceCm.value ?? undefined,
  )
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card>
      <v-card-title class="text-h6">{{ t('growth.dialog.title') }}</v-card-title>
      <v-card-text>
        <div class="d-flex ga-2">
          <v-text-field
            v-model.number="heightCm"
            type="number"
            step="0.1"
            :label="t('growth.dialog.heightLabel')"
            autofocus
            variant="outlined"
            density="comfortable"
          />
          <v-text-field
            v-model.number="weightKg"
            type="number"
            step="0.01"
            :label="t('growth.dialog.weightLabel')"
            variant="outlined"
            density="comfortable"
          />
        </div>
        <v-text-field
          v-model.number="headCircumferenceCm"
          type="number"
          step="0.1"
          :label="t('growth.dialog.headCircumferenceLabel')"
          variant="outlined"
          density="comfortable"
        />
        <p class="text-caption text-medium-emphasis mt-n2 mb-2">{{ t('growth.dialog.hint') }}</p>
        <v-text-field
          v-model="time"
          type="time"
          :label="t('growth.dialog.timeLabel')"
          :hint="t('growth.dialog.timeHint')"
          persistent-hint
          variant="outlined"
          density="comfortable"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">{{ t('common.cancel') }}</v-btn>
        <v-btn
          color="growth"
          variant="flat"
          size="large"
          :disabled="!heightCm && !weightKg && !headCircumferenceCm"
          @click="save"
        >
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
