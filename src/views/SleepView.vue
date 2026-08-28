<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSleepLogStore } from '@/stores/sleepLog'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { formatDuration } from '@/lib/describeActivity'
import { useNow } from '@/composables/useNow'
import { use48hToggle } from '@/composables/use48hToggle'
import { shortDateTime as timeLabel } from '@/lib/dateFormat'

const { t } = useI18n()
const store = useSleepLogStore()
const now = useNow(30_000)

const confirmDeleteTarget = ref<{ id: string; takenAt: number; endedAt?: number } | null>(null)

const { showAll, sorted: sortedAll } = use48hToggle(store)
// The still-ongoing sleep session (no endedAt yet) is excluded from the
// list since it's already shown by the start/stop card above.
const sorted = computed(() => sortedAll.value.filter((e) => e.endedAt != null))

const ongoingSince = computed(() => {
  if (!store.activeSleep) return ''
  return timeLabel(store.activeSleep.takenAt)
})
// Recomputes every 30s (via `now`) so the "since" duration ticks forward
// while a sleep session is in progress, rather than freezing at the value
// it had when the page loaded.
const ongoingDuration = computed(() => {
  if (!store.activeSleep) return ''
  return formatDuration(Math.round((now.value - store.activeSleep.takenAt) / 60_000))
})

const deleteBody = computed(() =>
  confirmDeleteTarget.value
    ? t('sleep.deleteConfirmBody', {
        duration: formatDuration(
          Math.round((confirmDeleteTarget.value.endedAt! - confirmDeleteTarget.value.takenAt) / 60_000),
        ),
        time: timeLabel(confirmDeleteTarget.value.takenAt),
      })
    : '',
)

function confirmDelete() {
  if (confirmDeleteTarget.value) store.removeEntry(confirmDeleteTarget.value.id)
  confirmDeleteTarget.value = null
}
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
      <span class="text-h6 ml-2">{{ t('sleep.title') }}</span>
    </div>

    <v-card
      v-if="store.activeSleep"
      variant="tonal"
      color="sleep"
      rounded="lg"
      class="mb-6 pa-4 text-center"
    >
      <v-icon icon="mdi-sleep" size="32" class="mb-2" />
      <div class="text-body-1 font-weight-bold">
        {{ t('sleep.ongoingSince', { time: ongoingSince }) }}
      </div>
      <div class="text-body-2 text-medium-emphasis mb-3">{{ ongoingDuration }}</div>
      <v-btn color="sleep" variant="flat" rounded="pill" @click="store.endSleep()">{{
        t('sleep.stop')
      }}</v-btn>
    </v-card>
    <v-btn
      v-else
      block
      height="64"
      color="sleep"
      variant="flat"
      rounded="lg"
      class="mb-6"
      @click="store.startSleep()"
    >
      <div class="d-flex align-center w-100">
        <v-icon icon="mdi-sleep" size="26" class="mr-3" />
        <span class="text-body-1 font-weight-bold">{{ t('sleep.start') }}</span>
      </div>
    </v-btn>

    <div class="mb-2 d-flex align-center">
      <span class="text-subtitle-2 text-medium-emphasis">{{
        showAll ? t('sleep.allHistory') : t('sleep.last48h')
      }}</span>
      <v-spacer />
      <v-btn v-if="!showAll" variant="text" size="small" color="sleep" @click="showAll = true">{{
        t('sleep.viewAll')
      }}</v-btn>
    </div>

    <v-list v-if="sorted.length" lines="two">
      <v-list-item v-for="entry in sorted" :key="entry.id">
        <template #prepend>
          <v-avatar color="sleep" variant="tonal">
            <v-icon icon="mdi-sleep" />
          </v-avatar>
        </template>
        <v-list-item-title>{{
          t('sleep.duration', { duration: formatDuration(Math.round((entry.endedAt! - entry.takenAt) / 60_000)) })
        }}</v-list-item-title>
        <v-list-item-subtitle>{{ timeLabel(entry.takenAt) }}</v-list-item-subtitle>
        <template #append>
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            :aria-label="t('sleep.deleteAria')"
            @click="confirmDeleteTarget = entry"
          />
        </template>
      </v-list-item>
    </v-list>
    <div v-else class="text-center text-medium-emphasis py-8">
      {{ showAll ? t('sleep.empty') : t('sleep.emptyWindow') }}
    </div>

    <ConfirmDialog
      :model-value="!!confirmDeleteTarget"
      @update:model-value="(v: boolean) => !v && (confirmDeleteTarget = null)"
      :title="t('sleep.deleteConfirmTitle')"
      :body="deleteBody"
      @confirm="confirmDelete"
    />
  </v-container>
</template>
