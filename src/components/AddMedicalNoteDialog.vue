<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMedicalNotesStore } from '@/stores/medicalNotes'
import { currentTimeString, resolveTakenAtOn } from '@/lib/time'
import { todayDateString } from '@/lib/dateFormat'
import type { MedicalNoteCategory } from '@/types/health'

const { t } = useI18n()
const model = defineModel<boolean>({ default: false })
const store = useMedicalNotesStore()

interface CategoryOption {
  value: MedicalNoteCategory
  icon: string
}

const CATEGORIES: CategoryOption[] = [
  { value: 'hospital', icon: 'mdi-hospital-box-outline' },
  { value: 'test', icon: 'mdi-flask-outline' },
  { value: 'medication', icon: 'mdi-pill' },
  { value: 'examination', icon: 'mdi-doctor' },
  { value: 'other', icon: 'mdi-note-text-outline' },
]

const category = ref<MedicalNoteCategory>('hospital')
const title = ref('')
const content = ref('')
const date = ref('')
const time = ref('')
const saving = ref(false)

watch(model, (open) => {
  if (open) {
    category.value = 'hospital'
    title.value = ''
    content.value = ''
    date.value = todayDateString()
    time.value = currentTimeString()
  }
})

async function save() {
  if (!content.value.trim()) return
  saving.value = true
  try {
    await store.addNote(
      category.value,
      content.value.trim(),
      title.value.trim() || undefined,
      resolveTakenAtOn(date.value, time.value),
    )
    model.value = false
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <v-dialog v-model="model" max-width="480">
    <v-card>
      <v-card-title class="text-h6 pt-4 px-4">{{ t('medicalNotes.dialog.title') }}</v-card-title>
      <v-card-text class="px-4 pt-2">
        <label class="text-caption text-medium-emphasis mb-1 d-block">
          {{ t('medicalNotes.dialog.categoryLabel') }}
        </label>
        <v-chip-group
          v-model="category"
          selected-class="text-primary font-weight-bold"
          mandatory
          class="mb-3"
        >
          <v-chip
            v-for="cat in CATEGORIES"
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
          color="primary"
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
