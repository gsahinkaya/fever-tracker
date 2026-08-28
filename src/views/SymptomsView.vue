<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSymptomLogStore } from '@/stores/symptomLog'
import AddSymptomDialog from '@/components/AddSymptomDialog.vue'
import { localeTag } from '@/lib/dateFormat'

const { t } = useI18n()
const store = useSymptomLogStore()

const showAddDialog = ref(false)
const showAll = ref(false)
const confirmDeleteTarget = ref<{ id: string; type: string; takenAt: number } | null>(null)

// Same 48h-default-with-a-"tümünü gör"-escape-hatch as Ana Sayfa/Geçmiş,
// for consistency across the app's log-style screens.
const sorted = computed(() => {
  const entries = showAll.value ? store.entries : store.recentEntries(48)
  return [...entries].sort((a, b) => b.takenAt - a.takenAt)
})

function timeLabel(ts: number) {
  return new Date(ts).toLocaleString(localeTag(), {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

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
      <span class="text-h6 ml-2">{{ t('symptoms.title') }}</span>
    </div>

    <v-btn
      block
      height="64"
      color="symptom"
      variant="flat"
      rounded="lg"
      class="mb-6"
      @click="showAddDialog = true"
    >
      <div class="d-flex align-center w-100">
        <v-icon icon="mdi-emoticon-sick-outline" size="26" class="mr-3" />
        <span class="text-body-1 font-weight-bold">{{ t('symptoms.addButton') }}</span>
      </div>
    </v-btn>

    <div class="mb-2 d-flex align-center">
      <span class="text-subtitle-2 text-medium-emphasis">{{
        showAll ? t('symptoms.allHistory') : t('symptoms.last48h')
      }}</span>
      <v-spacer />
      <v-btn v-if="!showAll" variant="text" size="small" color="symptom" @click="showAll = true">{{
        t('symptoms.viewAll')
      }}</v-btn>
    </div>

    <v-list v-if="sorted.length" lines="two">
      <v-list-item v-for="entry in sorted" :key="entry.id">
        <template #prepend>
          <v-avatar color="symptom" variant="tonal">
            <v-icon icon="mdi-emoticon-sick-outline" />
          </v-avatar>
        </template>
        <v-list-item-title
          >{{ t(`symptoms.types.${entry.type}`)
          }}<span v-if="entry.note"> · {{ entry.note }}</span></v-list-item-title
        >
        <v-list-item-subtitle>{{ timeLabel(entry.takenAt) }}</v-list-item-subtitle>
        <template #append>
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            :aria-label="t('symptoms.deleteAria')"
            @click="confirmDeleteTarget = entry"
          />
        </template>
      </v-list-item>
    </v-list>
    <div v-else class="text-center text-medium-emphasis py-8">
      {{ showAll ? t('symptoms.empty') : t('symptoms.emptyWindow') }}
    </div>

    <AddSymptomDialog v-model="showAddDialog" />

    <v-dialog
      :model-value="!!confirmDeleteTarget"
      max-width="360"
      @update:model-value="(v: boolean) => !v && (confirmDeleteTarget = null)"
    >
      <v-card v-if="confirmDeleteTarget">
        <v-card-title class="text-h6">{{ t('symptoms.deleteConfirmTitle') }}</v-card-title>
        <v-card-text>
          {{
            t('symptoms.deleteConfirmBody', {
              type: t(`symptoms.types.${confirmDeleteTarget.type}`),
              time: timeLabel(confirmDeleteTarget.takenAt),
            })
          }}
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="confirmDeleteTarget = null">{{ t('common.cancel') }}</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDelete">{{
            t('common.delete')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
