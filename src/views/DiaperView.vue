<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useDiaperLogStore } from '@/stores/diaperLog'
import { useFamilyMembersStore } from '@/stores/familyMembers'
import AddDiaperDialog from '@/components/AddDiaperDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { use48hToggle } from '@/composables/use48hToggle'
import { whoNameLabel } from '@/lib/describeActivity'
import { shortDateTime as timeLabel } from '@/lib/dateFormat'

const { t } = useI18n()
const store = useDiaperLogStore()
const familyMembersStore = useFamilyMembersStore()

const showAddDialog = ref(false)
const confirmDeleteTarget = ref<{ id: string; type: string; takenAt: number } | null>(null)

const { showAll, sorted } = use48hToggle(store)

const deleteBody = computed(() =>
  confirmDeleteTarget.value
    ? t('diaper.deleteConfirmBody', {
        type: t(`diaper.types.${confirmDeleteTarget.value.type}`),
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
      <span class="text-h6 ml-2">{{ t('diaper.title') }}</span>
    </div>

    <v-btn
      block
      height="64"
      color="diaper"
      variant="flat"
      rounded="lg"
      class="mb-6"
      @click="showAddDialog = true"
    >
      <div class="d-flex align-center w-100">
        <v-icon icon="mdi-diaper-outline" size="26" class="mr-3" />
        <span class="text-body-1 font-weight-bold">{{ t('diaper.addButton') }}</span>
      </div>
    </v-btn>

    <div class="mb-2 d-flex align-center">
      <span class="text-subtitle-2 text-medium-emphasis">{{
        showAll ? t('diaper.allHistory') : t('diaper.last48h')
      }}</span>
      <v-spacer />
      <v-btn v-if="!showAll" variant="text" size="small" color="diaper" @click="showAll = true">{{
        t('diaper.viewAll')
      }}</v-btn>
    </div>

    <v-list v-if="sorted.length" lines="two">
      <v-list-item v-for="entry in sorted" :key="entry.id">
        <template #prepend>
          <v-avatar color="diaper" variant="tonal">
            <v-icon icon="mdi-diaper-outline" />
          </v-avatar>
        </template>
        <v-list-item-title
          >{{ t(`diaper.types.${entry.type}`)
          }}<span v-if="entry.note"> · {{ entry.note }}</span></v-list-item-title
        >
        <v-list-item-subtitle
          >{{ timeLabel(entry.takenAt) }} ·
          {{ whoNameLabel(familyMembersStore.members, entry.createdBy, entry.createdByEmail) }}</v-list-item-subtitle
        >
        <template #append>
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            :aria-label="t('diaper.deleteAria')"
            @click="confirmDeleteTarget = entry"
          />
        </template>
      </v-list-item>
    </v-list>
    <div v-else class="text-center text-medium-emphasis py-8">
      {{ showAll ? t('diaper.empty') : t('diaper.emptyWindow') }}
    </div>

    <AddDiaperDialog v-model="showAddDialog" />

    <ConfirmDialog
      :model-value="!!confirmDeleteTarget"
      @update:model-value="(v: boolean) => !v && (confirmDeleteTarget = null)"
      :title="t('diaper.deleteConfirmTitle')"
      :body="deleteBody"
      @confirm="confirmDelete"
    />
  </v-container>
</template>
