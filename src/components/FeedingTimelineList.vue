<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FeedingEntry } from '@/types/health'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { feedingEntryTitle } from '@/lib/entryTitles'
import { whoLabel } from '@/lib/describeActivity'
import { shortDateTime as timeLabel } from '@/lib/dateFormat'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const { t } = useI18n()
defineProps<{ entries: FeedingEntry[] }>()
const store = useFeedingLogStore()

const confirmTarget = ref<FeedingEntry | null>(null)

const icons: Record<FeedingEntry['type'], string> = {
  breastfeeding: 'mdi-mother-nurse',
  bottle: 'mdi-baby-bottle-outline',
  solid: 'mdi-food-apple-outline',
}
const colors: Record<FeedingEntry['type'], string> = {
  breastfeeding: 'secondary',
  bottle: 'primary',
  solid: 'success',
}

const title = feedingEntryTitle

const deleteBody = computed(() =>
  confirmTarget.value
    ? t('timeline.deleteConfirmBody', {
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
        <v-avatar :color="colors[entry.type]" variant="tonal">
          <v-icon :icon="icons[entry.type]" />
        </v-avatar>
      </template>
      <v-list-item-title>{{ title(entry) }}</v-list-item-title>
      <v-list-item-subtitle
        >{{ timeLabel(entry.takenAt) }} · {{ whoLabel(entry.createdByEmail) }}</v-list-item-subtitle
      >
      <template #append>
        <v-btn
          icon="mdi-delete-outline"
          variant="text"
          size="small"
          :aria-label="t('timeline.deleteAria')"
          @click="confirmTarget = entry"
        />
      </template>
    </v-list-item>
  </v-list>
  <div v-else class="text-center text-medium-emphasis py-8">
    {{ t('timeline.feedingEmpty') }}
  </div>

  <ConfirmDialog
    :model-value="!!confirmTarget"
    @update:model-value="(v: boolean) => !v && (confirmTarget = null)"
    :title="t('timeline.deleteConfirmTitle')"
    :body="deleteBody"
    @confirm="confirmDelete"
  />
</template>
