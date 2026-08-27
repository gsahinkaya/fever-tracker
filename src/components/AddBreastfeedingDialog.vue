<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { currentTimeString, resolveTakenAt } from '@/lib/time'
import type { BreastfeedingEntry } from '@/types/health'

const { t } = useI18n()
const model = defineModel<boolean>({ default: false })
const store = useFeedingLogStore()

const durationMinutes = ref<number | null>(null)
const side = ref<BreastfeedingEntry['side'] | null>(null)
const time = ref('')

watch(model, (open) => {
  if (open) {
    durationMinutes.value = null
    side.value = null
    time.value = currentTimeString()
  }
})

function save() {
  store.addBreastfeeding(
    durationMinutes.value ?? undefined,
    side.value ?? undefined,
    resolveTakenAt(time.value),
  )
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card>
      <v-card-title class="text-h6">{{ t('dialogs.addBreastfeeding.title') }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="durationMinutes"
          :label="t('dialogs.addBreastfeeding.durationLabel')"
          type="number"
          inputmode="numeric"
          autofocus
          variant="outlined"
          density="comfortable"
        />
        <v-radio-group v-model="side" density="comfortable" hide-details>
          <template #label>
            <span class="text-body-2">{{ t('dialogs.addBreastfeeding.sideLabel') }}</span>
          </template>
          <v-radio :label="t('dialogs.addBreastfeeding.left')" value="left" />
          <v-radio :label="t('dialogs.addBreastfeeding.right')" value="right" />
          <v-radio :label="t('dialogs.addBreastfeeding.both')" value="both" />
        </v-radio-group>
        <v-text-field
          v-model="time"
          type="time"
          :label="t('dialogs.addBreastfeeding.timeLabel')"
          :hint="t('dialogs.addBreastfeeding.timeHint')"
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
