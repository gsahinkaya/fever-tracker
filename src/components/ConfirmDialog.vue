<script setup lang="ts">
import { useI18n } from 'vue-i18n'

withDefaults(
  defineProps<{
    title: string
    body: string
    confirmLabel?: string
    confirmColor?: string
  }>(),
  {
    confirmLabel: undefined,
    confirmColor: 'error',
  },
)
const model = defineModel<boolean>({ default: false })
const emit = defineEmits<{ confirm: [] }>()

const { t } = useI18n()

function confirm() {
  emit('confirm')
  model.value = false
}
</script>

<template>
  <v-dialog v-model="model" max-width="360">
    <v-card>
      <v-card-title class="text-h6">{{ title }}</v-card-title>
      <v-card-text>{{ body }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="model = false">{{ t('common.cancel') }}</v-btn>
        <v-btn :color="confirmColor" variant="flat" @click="confirm">
          {{ confirmLabel || t('common.delete') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
