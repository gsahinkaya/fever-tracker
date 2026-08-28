<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GrowthEntry } from '@/types/health'
import { useGrowthLogStore } from '@/stores/growthLog'
import { shortDateTime as timeLabel } from '@/lib/dateFormat'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const { t } = useI18n()
defineProps<{ entries: GrowthEntry[] }>()
const store = useGrowthLogStore()

const confirmTarget = ref<GrowthEntry | null>(null)

function title(entry: GrowthEntry): string {
  const parts: string[] = []
  if (entry.heightCm) parts.push(`${entry.heightCm} cm`)
  if (entry.weightKg) parts.push(`${entry.weightKg} kg`)
  if (entry.headCircumferenceCm) {
    parts.push(`${entry.headCircumferenceCm} cm (${t('growth.headCircumferenceChartTitle')})`)
  }
  return parts.join(' · ')
}

const deleteBody = computed(() =>
  confirmTarget.value
    ? t('growth.deleteConfirmBody', {
        title: title(confirmTarget.value),
        time: timeLabel(confirmTarget.value.takenAt),
      })
    : '',
)

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

  <ConfirmDialog
    :model-value="!!confirmTarget"
    @update:model-value="(v: boolean) => !v && (confirmTarget = null)"
    :title="t('growth.deleteConfirmTitle')"
    :body="deleteBody"
    @confirm="confirmDelete"
  />
</template>
