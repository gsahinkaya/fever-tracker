<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GrowthEntry } from '@/types/health'
import { useGrowthLogStore } from '@/stores/growthLog'

const { t } = useI18n()
defineProps<{ entries: GrowthEntry[] }>()
const store = useGrowthLogStore()

const confirmTarget = ref<GrowthEntry | null>(null)

function title(entry: GrowthEntry): string {
  const parts: string[] = []
  if (entry.heightCm) parts.push(`${entry.heightCm} cm`)
  if (entry.weightKg) parts.push(`${entry.weightKg} kg`)
  if (entry.headCircumferenceCm) parts.push(`${entry.headCircumferenceCm} cm (baş çevresi)`)
  return parts.join(' · ')
}

function timeLabel(ts: number) {
  return new Date(ts).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function confirmDelete() {
  if (confirmTarget.value) store.removeEntry(confirmTarget.value.id)
  confirmTarget.value = null
}
</script>

<template>
  <v-list v-if="entries.length" lines="two">
    <v-list-item v-for="entry in entries" :key="entry.id">
      <template #prepend>
        <v-avatar color="growth" variant="tonal">
          <v-icon icon="mdi-human-male-height" />
        </v-avatar>
      </template>
      <v-list-item-title>{{ title(entry) }}</v-list-item-title>
      <v-list-item-subtitle>{{ timeLabel(entry.takenAt) }}</v-list-item-subtitle>
      <template #append>
        <v-btn
          icon="mdi-delete-outline"
          variant="text"
          size="small"
          :aria-label="t('growth.deleteAria')"
          @click="confirmTarget = entry"
        />
      </template>
    </v-list-item>
  </v-list>
  <div v-else class="text-center text-medium-emphasis py-8">
    {{ t('growth.empty') }}
  </div>

  <v-dialog
    :model-value="!!confirmTarget"
    max-width="360"
    @update:model-value="(v) => !v && (confirmTarget = null)"
  >
    <v-card v-if="confirmTarget">
      <v-card-title class="text-h6">{{ t('growth.deleteConfirmTitle') }}</v-card-title>
      <v-card-text>{{
        t('growth.deleteConfirmBody', {
          title: title(confirmTarget),
          time: timeLabel(confirmTarget.takenAt),
        })
      }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="confirmTarget = null">{{ t('common.cancel') }}</v-btn>
        <v-btn color="error" variant="flat" @click="confirmDelete">{{ t('common.delete') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
