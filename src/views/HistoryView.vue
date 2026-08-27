<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeverLogStore } from '@/stores/feverLog'
import { useFeedingLogStore } from '@/stores/feedingLog'
import CombinedTimelineList from '@/components/CombinedTimelineList.vue'

const { t } = useI18n()
const feverLogStore = useFeverLogStore()
const feedingLogStore = useFeedingLogStore()

// Unlike Home's 48h window, this shows everything the two stores already
// hold in memory (their Firestore listeners have no time filter — see
// feverLog.ts/feedingLog.ts recentEntries) so no extra query is needed.
const allActivity = computed(() =>
  [...feverLogStore.entries, ...feedingLogStore.entries].sort((a, b) => b.takenAt - a.takenAt),
)
</script>

<template>
  <v-container style="max-width: 560px">
    <div class="d-flex align-center mb-4">
      <v-btn
        icon="mdi-arrow-left"
        variant="tonal"
        color="primary"
        :aria-label="t('common.back')"
        @click="$router.back()"
      />
      <span class="text-h6 ml-2">{{ t('history.title') }}</span>
    </div>

    <v-card variant="outlined">
      <CombinedTimelineList :entries="allActivity" />
    </v-card>
  </v-container>
</template>
