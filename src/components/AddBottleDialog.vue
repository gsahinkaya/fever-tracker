<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { currentTimeString, resolveTakenAt } from '@/lib/time'
import type { BottleEntry } from '@/types/health'

const { t } = useI18n()
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
  store.addBottle(amountMl.value, milkType.value, resolveTakenAt(time.value))
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="420">
    <v-card>
      <v-card-title class="text-h6">{{ t('dialogs.addBottle.title') }}</v-card-title>
      <v-card-text>
        <v-text-field
          v-model.number="amountMl"
          :label="t('dialogs.addBottle.amountLabel')"
          type="number"
          inputmode="numeric"
          autofocus
          variant="outlined"
          density="comfortable"
        />
        <v-radio-group v-model="milkType" density="comfortable" hide-details>
          <v-radio :label="t('dialogs.addBottle.formula')" value="formula" />
          <v-radio :label="t('dialogs.addBottle.breastMilk')" value="breast-milk" />
          <v-radio :label="t('dialogs.addBottle.mixed')" value="mixed" />
        </v-radio-group>
        <v-text-field
          v-model="time"
          type="time"
          :label="t('dialogs.addBottle.timeLabel')"
          :hint="t('dialogs.addBottle.timeHint')"
          persistent-hint
          variant="outlined"
          density="comfortable"
          class="mt-2"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">{{ t('common.cancel') }}</v-btn>
        <v-btn color="primary" variant="flat" size="large" :disabled="!amountMl" @click="save">{{
          t('common.save')
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
