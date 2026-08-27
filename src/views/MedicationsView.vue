<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useChildrenStore } from '@/stores/children'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import type { Medication } from '@/types/health'

const { t } = useI18n()
const authStore = useAuthStore()
const childrenStore = useChildrenStore()
const feverLogStore = useFeverLogStore()
const medicationsStore = useMedicationsStore()

const activeChild = computed(
  () => childrenStore.children.find((c) => c.id === feverLogStore.activeChildId) ?? null,
)

const showDialog = ref(false)
const editingMedication = ref<Medication | null>(null)
const name = ref('')
const minIntervalHours = ref<number | null>(null)
const note = ref('')
const confirmDeleteTarget = ref<Medication | null>(null)

function openAdd() {
  editingMedication.value = null
  name.value = ''
  minIntervalHours.value = null
  note.value = ''
  showDialog.value = true
}

function openEdit(medication: Medication) {
  editingMedication.value = medication
  name.value = medication.name
  minIntervalHours.value = medication.minIntervalHours
  note.value = medication.note ?? ''
  showDialog.value = true
}

async function save() {
  if (!name.value.trim() || !minIntervalHours.value || minIntervalHours.value <= 0) return
  if (!authStore.familyId || !feverLogStore.activeChildId) return

  const data = {
    name: name.value.trim(),
    minIntervalHours: minIntervalHours.value,
    ...(note.value.trim() ? { note: note.value.trim() } : {}),
  }

  if (editingMedication.value) {
    await medicationsStore.updateMedication(
      authStore.familyId,
      feverLogStore.activeChildId,
      editingMedication.value.id,
      data,
    )
  } else {
    await medicationsStore.addMedication(authStore.familyId, feverLogStore.activeChildId, data)
  }
  showDialog.value = false
}

async function confirmDelete() {
  if (confirmDeleteTarget.value && authStore.familyId && feverLogStore.activeChildId) {
    await medicationsStore.removeMedication(
      authStore.familyId,
      feverLogStore.activeChildId,
      confirmDeleteTarget.value.id,
    )
  }
  confirmDeleteTarget.value = null
}
</script>

<template>
  <v-container style="max-width: 560px">
    <div class="d-flex align-center mb-2">
      <v-btn
        icon="mdi-arrow-left"
        variant="tonal"
        color="primary"
        :aria-label="t('common.back')"
        @click="$router.back()"
      />
      <span class="text-h6 ml-2">{{ t('medications.title') }}</span>
    </div>
    <p v-if="activeChild" class="text-body-2 text-medium-emphasis mb-4">
      {{ t('medications.description', { name: activeChild.name }) }}
    </p>

    <v-list v-if="medicationsStore.medications.length" lines="two" class="mb-4">
      <v-list-item v-for="med in medicationsStore.medications" :key="med.id" @click="openEdit(med)">
        <template #prepend>
          <v-avatar color="primary" variant="tonal">
            <v-icon icon="mdi-pill" />
          </v-avatar>
        </template>
        <v-list-item-title>{{ med.name }}</v-list-item-title>
        <v-list-item-subtitle>
          {{ t('medications.perSafe', { hours: med.minIntervalHours })
          }}<span v-if="med.note"> · {{ med.note }}</span>
        </v-list-item-subtitle>
        <template #append>
          <v-btn
            icon="mdi-delete-outline"
            variant="text"
            size="small"
            :aria-label="t('medications.deleteAria')"
            @click.stop="confirmDeleteTarget = med"
          />
        </template>
      </v-list-item>
    </v-list>
    <div v-else class="text-center text-medium-emphasis py-8">{{ t('medications.empty') }}</div>

    <v-btn
      block
      size="large"
      color="primary"
      variant="tonal"
      prepend-icon="mdi-plus"
      @click="openAdd"
    >
      {{ t('medications.addButton') }}
    </v-btn>

    <v-dialog v-model="showDialog" max-width="420">
      <v-card>
        <v-card-title class="text-h6">{{
          editingMedication ? t('medications.dialog.editTitle') : t('medications.dialog.addTitle')
        }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="name"
            :label="t('medications.dialog.nameLabel')"
            :placeholder="t('medications.dialog.namePlaceholder')"
            variant="outlined"
            density="comfortable"
            autofocus
          />
          <v-text-field
            v-model.number="minIntervalHours"
            type="number"
            :label="t('medications.dialog.intervalLabel')"
            :placeholder="t('medications.dialog.intervalPlaceholder')"
            variant="outlined"
            density="comfortable"
          />
          <v-text-field
            v-model="note"
            :label="t('medications.dialog.noteLabel')"
            :placeholder="t('medications.dialog.notePlaceholder')"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!name.trim() || !minIntervalHours"
            @click="save"
          >
            {{ t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog
      :model-value="!!confirmDeleteTarget"
      max-width="360"
      @update:model-value="(v: boolean) => !v && (confirmDeleteTarget = null)"
    >
      <v-card v-if="confirmDeleteTarget">
        <v-card-title class="text-h6">{{ t('medications.deleteConfirm.title') }}</v-card-title>
        <v-card-text>
          {{ t('medications.deleteConfirm.body', { name: confirmDeleteTarget.name }) }}
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
