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
const openedAt = ref('')
const expiryDate = ref('')
const shelfLifeDaysAfterOpening = ref<number | null>(null)
const courseStartDate = ref('')
const courseEndDate = ref('')
const confirmDeleteTarget = ref<Medication | null>(null)

const DEFAULT_SHELF_LIFE_DAYS = 90

function openAdd() {
  editingMedication.value = null
  name.value = ''
  minIntervalHours.value = null
  note.value = ''
  openedAt.value = ''
  expiryDate.value = ''
  shelfLifeDaysAfterOpening.value = null
  courseStartDate.value = ''
  courseEndDate.value = ''
  showDialog.value = true
}

function openEdit(medication: Medication) {
  editingMedication.value = medication
  name.value = medication.name
  minIntervalHours.value = medication.minIntervalHours
  note.value = medication.note ?? ''
  openedAt.value = medication.openedAt
    ? new Date(medication.openedAt).toISOString().slice(0, 10)
    : ''
  expiryDate.value = medication.expiryDate ?? ''
  shelfLifeDaysAfterOpening.value = medication.shelfLifeDaysAfterOpening ?? null
  courseStartDate.value = medication.courseStartDate ?? ''
  courseEndDate.value = medication.courseEndDate ?? ''
  showDialog.value = true
}

async function save() {
  if (!name.value.trim() || !minIntervalHours.value || minIntervalHours.value <= 0) return
  if (!authStore.familyId || !feverLogStore.activeChildId) return

  const data = {
    name: name.value.trim(),
    minIntervalHours: minIntervalHours.value,
    ...(note.value.trim() ? { note: note.value.trim() } : {}),
    ...(openedAt.value ? { openedAt: new Date(openedAt.value).getTime() } : {}),
    ...(expiryDate.value ? { expiryDate: expiryDate.value } : {}),
    ...(shelfLifeDaysAfterOpening.value ? { shelfLifeDaysAfterOpening: shelfLifeDaysAfterOpening.value } : {}),
    ...(courseStartDate.value ? { courseStartDate: courseStartDate.value } : {}),
    ...(courseEndDate.value ? { courseEndDate: courseEndDate.value } : {}),
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

const WARN_AHEAD_DAYS = 7

interface InventoryWarning {
  text: string
  severity: 'warning' | 'error'
}

// Two independent expiry signals: the box's own printed expiry date, and a
// syrup's much shorter shelf life once opened (typically far sooner than
// the printed date — a pharmacist rule of thumb, defaulted to 90 days when
// the parent hasn't entered the box's specific value). Each fires an
// earlier heads-up (WARN_AHEAD_DAYS out) before escalating once the date
// actually passes, rather than staying silent right up to the deadline.
function inventoryWarning(med: Medication): InventoryWarning | null {
  const now = Date.now()
  if (med.expiryDate) {
    const expiresAt = new Date(med.expiryDate).getTime()
    const daysLeft = Math.ceil((expiresAt - now) / 86_400_000)
    if (daysLeft < 0) {
      return {
        severity: 'error',
        text: t('medications.warnings.expired', {
          date: new Date(med.expiryDate).toLocaleDateString('tr-TR'),
        }),
      }
    }
    if (daysLeft <= WARN_AHEAD_DAYS) {
      return {
        severity: 'warning',
        text: t('medications.warnings.expiringSoon', { days: daysLeft }),
      }
    }
  }
  if (med.openedAt) {
    const shelfLifeDays = med.shelfLifeDaysAfterOpening ?? DEFAULT_SHELF_LIFE_DAYS
    const openSinceDays = Math.floor((now - med.openedAt) / 86_400_000)
    const daysLeft = shelfLifeDays - openSinceDays
    if (daysLeft < 0) {
      return {
        severity: 'error',
        text: t('medications.warnings.openedTooLong', { months: Math.floor(openSinceDays / 30) }),
      }
    }
    if (daysLeft <= WARN_AHEAD_DAYS) {
      return {
        severity: 'warning',
        text: t('medications.warnings.openedExpiringSoon', { days: daysLeft }),
      }
    }
  }
  return null
}

function dateLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

// A course medication (antibiotics being the classic case) only has one of
// three states worth surfacing: hasn't started, actively running (this is
// the state the dose-interval reminder above needs to still be firing in),
// or done — each phrased so the parent knows whether to keep going.
function courseLabel(med: Medication): string | null {
  if (!med.courseStartDate && !med.courseEndDate) return null
  const now = Date.now()
  if (med.courseStartDate && now < new Date(med.courseStartDate).getTime()) {
    return t('medications.course.upcoming', { date: dateLabel(med.courseStartDate) })
  }
  if (med.courseEndDate && now > new Date(med.courseEndDate).getTime() + 86_400_000) {
    return t('medications.course.finished', { date: dateLabel(med.courseEndDate) })
  }
  if (med.courseStartDate && med.courseEndDate) {
    return t('medications.course.active', {
      start: dateLabel(med.courseStartDate),
      end: dateLabel(med.courseEndDate),
    })
  }
  if (med.courseEndDate) return t('medications.course.activeUntil', { date: dateLabel(med.courseEndDate) })
  return t('medications.course.activeSince', { date: dateLabel(med.courseStartDate!) })
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
          <div v-if="courseLabel(med)" class="text-medium-emphasis mt-1">
            {{ courseLabel(med) }}
          </div>
          <div
            v-if="inventoryWarning(med)"
            class="font-weight-medium mt-1"
            :class="inventoryWarning(med)!.severity === 'error' ? 'text-error' : 'text-warning'"
          >
            {{ inventoryWarning(med)!.text }}
          </div>
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
          <v-divider class="mb-4" />
          <p class="text-caption text-medium-emphasis mb-2">
            {{ t('medications.dialog.inventorySectionHint') }}
          </p>
          <v-text-field
            v-model="openedAt"
            type="date"
            :label="t('medications.dialog.openedAtLabel')"
            variant="outlined"
            density="comfortable"
          />
          <div class="d-flex ga-2">
            <v-text-field
              v-model="expiryDate"
              type="date"
              :label="t('medications.dialog.expiryDateLabel')"
              variant="outlined"
              density="comfortable"
            />
            <v-text-field
              v-model.number="shelfLifeDaysAfterOpening"
              type="number"
              :label="t('medications.dialog.shelfLifeLabel')"
              :placeholder="String(DEFAULT_SHELF_LIFE_DAYS)"
              variant="outlined"
              density="comfortable"
            />
          </div>
          <v-divider class="mb-4" />
          <p class="text-caption text-medium-emphasis mb-2">
            {{ t('medications.dialog.courseSectionHint') }}
          </p>
          <div class="d-flex ga-2">
            <v-text-field
              v-model="courseStartDate"
              type="date"
              :label="t('medications.dialog.courseStartLabel')"
              variant="outlined"
              density="comfortable"
            />
            <v-text-field
              v-model="courseEndDate"
              type="date"
              :label="t('medications.dialog.courseEndLabel')"
              variant="outlined"
              density="comfortable"
            />
          </div>
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
