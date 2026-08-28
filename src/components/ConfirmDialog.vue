<script setup lang="ts">
import { useI18n } from 'vue-i18n'

// The one confirm-delete dialog shape used everywhere in the app (Semptom,
// Uyku, Bez Değişimi, Büyüme, Beslenme, the combined timeline, Doktor
// Raporu, İlaçlarım, Aşılar, Çocuklarım) — title + body text + Vazgeç/Sil.
// The caller owns *what* is being deleted (the confirm target, its id) and
// just supplies the already-formatted title/body strings; this only owns
// the dialog chrome and the confirm/cancel wiring.
defineProps<{ title: string; body: string }>()
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
        <v-btn color="error" variant="flat" @click="confirm">{{ t('common.delete') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
