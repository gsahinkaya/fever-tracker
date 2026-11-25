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
import { mediumDateTime } from '@/lib/dateFormat'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ManageReminderDialog from '@/components/ManageReminderDialog.vue'

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

const isReminderActive = computed(() => {
  if (!props.medication.reminderAt) return false
  return props.medication.reminderAt > now.value
})

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
  await medicationsStore.updateMedication(
    authStore.familyId,
    store.activeChildId,
    props.medication.id,
    {
      nextDoseDismissedAt: Date.now(),
    },
  )
  await medicationAlertsStore.removeAlertsForMedication(props.medication.name, 'nextDose')
  showDismissConfirm.value = false
}

async function restoreCard() {
  if (!authStore.familyId || !store.activeChildId) return
  await medicationsStore.updateMedication(
    authStore.familyId,
    store.activeChildId,
    props.medication.id,
    {
      nextDoseDismissedAt: deleteField(),
    },
  )
}

async function removeReminder() {
  if (!authStore.familyId || !store.activeChildId) return
  await medicationsStore.updateMedication(
    authStore.familyId,
    store.activeChildId,
    props.medication.id,
    {
      reminderAt: deleteField(),
      reminderNotified: deleteField(),
    },
  )
  await medicationAlertsStore.removeAlertsForMedication(props.medication.name, 'reminder')
}
</script>

<template>
  <v-card
    :color="
      isDismissed
        ? undefined
        : status === 'ready'
          ? 'success'
          : status === 'waiting'
            ? 'error'
            : undefined
    "
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
        <div
          class="d-flex align-center text-caption font-weight-medium"
          :class="isReminderActive ? 'text-primary' : 'text-warning'"
        >
          <v-icon
            :icon="isReminderActive ? 'mdi-bell-ring-outline' : 'mdi-bell-alert-outline'"
            size="18"
            class="mr-1"
          />
          <span>{{
            isReminderActive
              ? t('reminders.activeBadge', { time: mediumDateTime(medication.reminderAt) })
              : t('reminders.pastBadge', { time: mediumDateTime(medication.reminderAt) })
          }}</span>
        </div>
        <div class="d-flex align-center">
          <v-btn
            variant="text"
            size="x-small"
            color="primary"
            class="px-1 font-weight-medium"
            @click="showReminderDialog = true"
          >
            {{ t('reminders.rescheduleReminder') }}
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
          @click="showReminderDialog = true"
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
    <ManageReminderDialog v-model="showReminderDialog" :medication="medication" />
  </v-card>
</template>
