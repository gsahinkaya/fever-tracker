<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeverLogStore } from '@/stores/feverLog'
import { useFeedingLogStore } from '@/stores/feedingLog'
import CombinedTimelineList from '@/components/CombinedTimelineList.vue'

const { t } = useI18n()
const feverLogStore = useFeverLogStore()
const feedingLogStore = useFeedingLogStore()

const showAll = ref(false)

// The two stores' Firestore listeners have no time filter (see
// feverLog.ts/feedingLog.ts recentEntries), so "tümünü göster" needs no
// extra query — everything is already in memory, only the client-side
// window changes.
const activity = computed(() => {
  const fever = showAll.value ? feverLogStore.entries : feverLogStore.recentEntries(48)
  const feeding = showAll.value ? feedingLogStore.entries : feedingLogStore.recentEntries(48)
  return [...fever, ...feeding].sort((a, b) => b.takenAt - a.takenAt)
})
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
      <span class="text-h6 ml-2">{{ showAll ? t('history.title') : t('history.last48h') }}</span>
      <v-spacer />
      <v-btn v-if="!showAll" variant="text" size="small" color="primary" @click="showAll = true">{{
        t('history.viewAll')
      }}</v-btn>
    </div>

    <v-card variant="outlined">
      <CombinedTimelineList :entries="activity" />
    </v-card>
  </v-container>
</template>
