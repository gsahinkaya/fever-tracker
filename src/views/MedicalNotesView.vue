<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMedicalNotesStore } from '@/stores/medicalNotes'
import { useFamilyMembersStore } from '@/stores/familyMembers'
import AddMedicalNoteDialog from '@/components/AddMedicalNoteDialog.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { use48hToggle } from '@/composables/use48hToggle'
import { whoNameLabel } from '@/lib/describeActivity'
import { shortDateTime as timeLabel } from '@/lib/dateFormat'
import { MEDICAL_NOTE_CATEGORY_ICONS } from '@/lib/medicalNotes'
import type { MedicalNoteEntry } from '@/types/health'

const { t } = useI18n()
const store = useMedicalNotesStore()
const familyMembersStore = useFamilyMembersStore()

const showAddDialog = ref(false)
const noteToEdit = ref<MedicalNoteEntry | null>(null)
const confirmDeleteTarget = ref<MedicalNoteEntry | null>(null)

const { showAll, sorted } = use48hToggle(store)

function openAdd() {
  noteToEdit.value = null
  showAddDialog.value = true
}

function openEdit(entry: MedicalNoteEntry) {
  noteToEdit.value = entry
  showAddDialog.value = true
}

const deleteBody = computed(() =>
  confirmDeleteTarget.value
    ? t('medicalNotes.deleteConfirmBody', {
        title: confirmDeleteTarget.value.title || t(`medicalNotes.categories.${confirmDeleteTarget.value.category}`),
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
      <span class="text-h6 ml-2">{{ t('medicalNotes.title') }}</span>
    </div>

    <v-btn
      block
      height="64"
      color="note"
      variant="flat"
      rounded="lg"
      class="mb-6"
      @click="openAdd"
    >
      <div class="d-flex align-center w-100">
        <v-icon icon="mdi-notebook-edit-outline" size="26" class="mr-3" />
        <span class="text-body-1 font-weight-bold">{{ t('medicalNotes.addButton') }}</span>
      </div>
    </v-btn>

    <div class="mb-2 d-flex align-center">
      <span class="text-subtitle-2 text-medium-emphasis">{{
        showAll ? t('medicalNotes.allHistory') : t('medicalNotes.last48h')
      }}</span>
      <v-spacer />
      <v-btn v-if="!showAll" variant="text" size="small" color="primary" @click="showAll = true">{{
        t('medicalNotes.viewAll')
      }}</v-btn>
    </div>

    <v-list v-if="sorted.length" lines="three">
      <v-list-item v-for="entry in sorted" :key="entry.id" class="px-2">
        <template #prepend>
          <v-avatar color="note" variant="tonal">
            <v-icon :icon="MEDICAL_NOTE_CATEGORY_ICONS[entry.category] || 'mdi-note-text-outline'" />
          </v-avatar>
        </template>
        <v-list-item-title class="font-weight-medium">
          {{ t(`medicalNotes.categories.${entry.category}`) }}
          <span v-if="entry.title" class="font-weight-bold"> · {{ entry.title }}</span>
        </v-list-item-title>
        <div class="text-body-2 text-medium-emphasis mt-1">
          {{ entry.content }}
        </div>
        <v-list-item-subtitle class="mt-1">
          {{ timeLabel(entry.takenAt) }} ·
          {{ whoNameLabel(familyMembersStore.members, entry.createdBy, entry.createdByEmail) }}
        </v-list-item-subtitle>
        <template #append>
          <div class="d-flex align-center">
            <v-btn
              icon="mdi-pencil-outline"
              variant="text"
              size="small"
              :aria-label="t('medicalNotes.editAria')"
              @click="openEdit(entry)"
            />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              :aria-label="t('medicalNotes.deleteAria')"
              @click="confirmDeleteTarget = entry"
            />
          </div>
        </template>
      </v-list-item>
    </v-list>
    <div v-else class="text-center text-medium-emphasis py-8">
      {{ showAll ? t('medicalNotes.empty') : t('medicalNotes.emptyWindow') }}
    </div>

    <AddMedicalNoteDialog v-model="showAddDialog" :note-to-edit="noteToEdit" />

    <ConfirmDialog
      :model-value="!!confirmDeleteTarget"
      @update:model-value="(v: boolean) => !v && (confirmDeleteTarget = null)"
      :title="t('medicalNotes.deleteConfirmTitle')"
      :body="deleteBody"
      @confirm="confirmDelete"
    />
  </v-container>
</template>
