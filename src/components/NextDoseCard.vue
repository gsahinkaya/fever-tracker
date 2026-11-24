<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { deleteField } from 'firebase/firestore'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { useMedicationAlertsStore } from '@/stores/medicationAlerts'
import { useAuthStore } from '@/stores/auth'
import type { Medication } from '@/types/health'
import { useNow } from '@/composables/useNow'
import { mediumDateTime, toDatetimeLocalString } from '@/lib/dateFormat'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const props = withDefaults(
  defineProps<{
    medication: Medication
    isDismissed?: boolean
  }>(),
  {
    isDismissed: false,
  },
)

const { t } = useI18n()
const store = useFeverLogStore()
const medicationsStore = useMedicationsStore()
const medicationAlertsStore = useMedicationAlertsStore()
const authStore = useAuthStore()
const now = useNow()

const showDismissConfirm = ref(false)
const showReminderDialog = ref(false)
const reminderDateTime = ref('')
const savingReminder = ref(false)

const last = computed(() => store.lastDose(props.medication.id))
const safeAt = computed(() =>
  store.nextSafeDoseAt(props.medication.id, props.medication.minIntervalHours),
)

const status = computed<'none' | 'ready' | 'waiting'>(() => {
  if (!last.value || !safeAt.value) return 'none'
  return safeAt.value <= now.value ? 'ready' : 'waiting'
})

const remainingLabel = computed(() => {
  if (!safeAt.value) return ''
  const diff = safeAt.value - now.value
  if (diff <= 0) return ''
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return t('common.durationHoursMinutes', { h, m: m.toString().padStart(2, '0') })
})

const lastDoseLabel = computed(() => {
  if (!last.value) return ''
  return mediumDateTime(last.value.takenAt)
})

async function dismissCard() {
  if (!authStore.familyId || !store.activeChildId) return
  await medicationsStore.updateMedication(authStore.familyId, store.activeChildId, props.medication.id, {
    nextDoseDismissedAt: Date.now(),
  })
  await medicationAlertsStore.removeAlertsForMedication(props.medication.name, 'nextDose')
  showDismissConfirm.value = false
}

async function restoreCard() {
  if (!authStore.familyId || !store.activeChildId) return
  await medicationsStore.updateMedication(authStore.familyId, store.activeChildId, props.medication.id, {
    nextDoseDismissedAt: deleteField(),
  })
}

function openReminderDialog() {
  if (props.medication.reminderAt) {
    reminderDateTime.value = toDatetimeLocalString(props.medication.reminderAt)
  } else if (safeAt.value && safeAt.value > now.value) {
    reminderDateTime.value = toDatetimeLocalString(safeAt.value)
  } else {
    reminderDateTime.value = toDatetimeLocalString(now.value + props.medication.minIntervalHours * 3_600_000)
  }
  showReminderDialog.value = true
}

function useSafeDoseShortcut() {
  if (safeAt.value) {
    reminderDateTime.value = toDatetimeLocalString(safeAt.value)
  }
}

async function saveReminder() {
  if (!reminderDateTime.value || !authStore.familyId || !store.activeChildId) return
  savingReminder.value = true
  try {
    const ts = new Date(reminderDateTime.value).getTime()
    await medicationsStore.updateMedication(authStore.familyId, store.activeChildId, props.medication.id, {
      reminderAt: ts,
      reminderNotified: false,
    })
    showReminderDialog.value = false
  } finally {
    savingReminder.value = false
  }
}

async function removeReminder() {
  if (!authStore.familyId || !store.activeChildId) return
  savingReminder.value = true
  try {
    await medicationsStore.updateMedication(authStore.familyId, store.activeChildId, props.medication.id, {
      reminderAt: deleteField(),
      reminderNotified: deleteField(),
    })
    await medicationAlertsStore.removeAlertsForMedication(props.medication.name, 'reminder')
    showReminderDialog.value = false
  } finally {
    savingReminder.value = false
  }
}
</script>

<template>
  <v-card
    :color="isDismissed ? undefined : status === 'ready' ? 'success' : status === 'waiting' ? 'error' : undefined"
    :variant="isDismissed || status === 'none' ? 'outlined' : 'tonal'"
  >
    <v-card-item>
      <div class="d-flex align-center justify-space-between w-100">
        <div>
          <v-card-title class="text-subtitle-1">{{ medication.name }}</v-card-title>
          <v-card-subtitle v-if="medication.note">{{ medication.note }}</v-card-subtitle>
        </div>
        <div>
          <v-btn
            v-if="!isDismissed"
            icon="mdi-close"
            variant="text"
            size="small"
            density="comfortable"
            :aria-label="t('nextDoseCard.dismissAria')"
            @click="showDismissConfirm = true"
          />
          <v-btn
            v-else
            variant="tonal"
            size="small"
            color="primary"
            prepend-icon="mdi-restore"
            @click="restoreCard"
          >
            {{ t('nextDoseCard.restoreCard') }}
          </v-btn>
        </div>
      </div>
    </v-card-item>

    <v-card-text>
      <span v-if="status === 'none'" class="text-medium-emphasis">{{
        t('nextDoseCard.noRecord')
      }}</span>
      <template v-else-if="status === 'ready'">
        <div class="text-h6 font-weight-bold text-success d-flex align-center">
          <v-icon icon="mdi-check-circle" size="20" class="mr-1" />
          {{ t('nextDoseCard.readyNow') }}
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
          {{ t('nextDoseCard.lastDose', { time: lastDoseLabel }) }}
        </div>
      </template>
      <template v-else>
        <div class="text-h5 font-weight-bold text-error d-flex align-center">
          <v-icon icon="mdi-clock-alert-outline" size="22" class="mr-1" />
          {{ t('nextDoseCard.remaining', { time: remainingLabel }) }}
        </div>
        <div class="text-caption text-medium-emphasis mt-1">
          {{ t('nextDoseCard.lastDoseInline', { time: lastDoseLabel }) }}
        </div>
      </template>

      <!-- Reminder Section -->
      <div
        v-if="medication.reminderAt"
        class="d-flex align-center justify-space-between mt-3 pt-2"
        style="border-top: 1px dashed rgba(var(--v-border-color), 0.25)"
      >
        <div class="d-flex align-center text-caption font-weight-medium text-primary">
          <v-icon icon="mdi-bell-ring-outline" size="18" class="mr-1" />
          <span>{{ t('nextDoseCard.reminderBadge', { time: mediumDateTime(medication.reminderAt) }) }}</span>
        </div>
        <div class="d-flex align-center">
          <v-btn
            variant="text"
            size="x-small"
            color="primary"
            class="px-1"
            @click="openReminderDialog"
          >
            {{ t('nextDoseCard.changeReminder') }}
          </v-btn>
          <v-btn
            icon="mdi-bell-off-outline"
            variant="text"
            size="x-small"
            color="error"
            :aria-label="t('nextDoseCard.removeReminderAria')"
            @click="removeReminder"
          />
        </div>
      </div>
      <div
        v-else-if="!isDismissed"
        class="mt-3 pt-2"
        style="border-top: 1px dashed rgba(var(--v-border-color), 0.25)"
      >
        <v-btn
          variant="text"
          size="small"
          density="comfortable"
          prepend-icon="mdi-bell-plus-outline"
          color="primary"
          class="px-0 text-caption font-weight-medium"
          @click="openReminderDialog"
        >
          {{ t('nextDoseCard.setReminder') }}
        </v-btn>
      </div>
    </v-card-text>

    <!-- Dismiss Confirmation Dialog -->
    <ConfirmDialog
      v-model="showDismissConfirm"
      :title="t('nextDoseCard.dismissConfirmTitle')"
      :body="t('nextDoseCard.dismissConfirmBody', { name: medication.name })"
      :confirm-label="t('nextDoseCard.dismissAction')"
      confirm-color="error"
      @confirm="dismissCard"
    />

    <!-- Set / Edit Reminder Dialog -->
    <v-dialog v-model="showReminderDialog" max-width="400">
      <v-card>
        <v-card-title class="text-h6 pt-4 px-4">
          {{ t('nextDoseCard.reminderDialogTitle') }}
        </v-card-title>
        <v-card-subtitle class="px-4">
          {{ medication.name }}
        </v-card-subtitle>
        <v-card-text class="px-4 pt-2">
          <p class="text-caption text-medium-emphasis mb-3">
            {{ t('nextDoseCard.reminderDialogHint', { name: medication.name }) }}
          </p>

          <v-btn
            v-if="safeAt && safeAt > now"
            variant="tonal"
            size="small"
            color="primary"
            prepend-icon="mdi-clock-check-outline"
            class="mb-3 w-100"
            @click="useSafeDoseShortcut"
          >
            {{ t('nextDoseCard.useSafeDoseTime', { time: mediumDateTime(safeAt) }) }}
          </v-btn>

          <v-text-field
            v-model="reminderDateTime"
            type="datetime-local"
            :label="t('nextDoseCard.reminderSectionTitle')"
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-btn
            v-if="medication.reminderAt"
            variant="text"
            color="error"
            :disabled="savingReminder"
            @click="removeReminder"
          >
            {{ t('nextDoseCard.removeReminder') }}
          </v-btn>
          <v-spacer />
          <v-btn
            variant="text"
            :disabled="savingReminder"
            @click="showReminderDialog = false"
          >
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!reminderDateTime"
            :loading="savingReminder"
            @click="saveReminder"
          >
            {{ t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>
