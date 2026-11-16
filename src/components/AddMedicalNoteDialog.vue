<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMedicalNotesStore } from '@/stores/medicalNotes'
import { currentTimeString, resolveTakenAtOn, toTimeInputString } from '@/lib/time'
import { toDateInputString, todayDateString } from '@/lib/dateFormat'
import { MEDICAL_NOTE_CATEGORIES } from '@/lib/medicalNotes'
import type { MedicalNoteCategory, MedicalNoteEntry } from '@/types/health'

const { t } = useI18n()
const model = defineModel<boolean>({ default: false })
const props = withDefaults(
  defineProps<{
    noteToEdit?: MedicalNoteEntry | null
  }>(),
  {
    noteToEdit: null,
  },
)

const store = useMedicalNotesStore()

const isEditing = computed(() => !!props.noteToEdit)

const category = ref<MedicalNoteCategory>('hospital')
const title = ref('')
const content = ref('')
const date = ref('')
const time = ref('')
const saving = ref(false)

watch(model, (open) => {
  if (open) {
    if (props.noteToEdit) {
      category.value = props.noteToEdit.category
      title.value = props.noteToEdit.title ?? ''
      content.value = props.noteToEdit.content
      date.value = toDateInputString(props.noteToEdit.takenAt)
      time.value = toTimeInputString(props.noteToEdit.takenAt)
    } else {
      category.value = 'hospital'
      title.value = ''
      content.value = ''
      date.value = todayDateString()
      time.value = currentTimeString()
    }
  }
})

async function save() {
  if (!content.value.trim()) return
  saving.value = true
  try {
    const takenAt = resolveTakenAtOn(date.value, time.value)
    if (props.noteToEdit) {
      await store.updateNote(
        props.noteToEdit.id,
        category.value,
        content.value.trim(),
        title.value.trim() || undefined,
        takenAt,
      )
    } else {
      await store.addNote(
        category.value,
        content.value.trim(),
        title.value.trim() || undefined,
        takenAt,
      )
    }
    model.value = false
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-dialog v-model="model" max-width="480">
    <v-card>
      <v-card-title class="text-h6 pt-4 px-4 d-flex align-center justify-space-between">
        <span>{{ isEditing ? t('medicalNotes.dialog.editTitle') : t('medicalNotes.dialog.title') }}</span>
        <v-btn
          v-if="!isEditing"
          variant="text"
          size="small"
          color="note"
          to="/notes"
          @click="model = false"
        >
          {{ t('medicalNotes.viewAll') }}
        </v-btn>
      </v-card-title>
      <v-card-text class="px-4 pt-2">
        <label class="text-caption text-medium-emphasis mb-1 d-block">
          {{ t('medicalNotes.dialog.categoryLabel') }}
        </label>
        <v-chip-group
          v-model="category"
          selected-class="text-note font-weight-bold"
          mandatory
          class="mb-3"
        >
          <v-chip
            v-for="cat in MEDICAL_NOTE_CATEGORIES"
            :key="cat.value"
            :value="cat.value"
            filter
            variant="tonal"
            size="small"
          >
            <v-icon start :icon="cat.icon" size="18" />
            {{ t(`medicalNotes.categories.${cat.value}`) }}
          </v-chip>
        </v-chip-group>

        <v-text-field
          v-model="title"
          :label="t('medicalNotes.dialog.titleLabel')"
          :placeholder="t('medicalNotes.dialog.titlePlaceholder')"
          variant="outlined"
          density="comfortable"
          class="mb-1"
        />

        <v-textarea
          v-model="content"
          :label="t('medicalNotes.dialog.contentLabel')"
          :placeholder="t('medicalNotes.dialog.contentPlaceholder')"
          variant="outlined"
          density="comfortable"
          rows="3"
          auto-grow
          required
          class="mb-1"
        />

        <div class="d-flex" style="gap: 12px">
          <v-text-field
            v-model="date"
            type="date"
            :label="t('medicalNotes.dialog.dateLabel')"
            variant="outlined"
            density="comfortable"
          />
          <v-text-field
            v-model="time"
            type="time"
            :label="t('medicalNotes.dialog.timeLabel')"
            variant="outlined"
            density="comfortable"
          />
        </div>
      </v-card-text>
      <v-card-actions class="px-4 pb-4 pt-0">
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="model = false">
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          color="note"
          variant="flat"
          size="large"
          :loading="saving"
          :disabled="!content.trim()"
          @click="save"
        >
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
