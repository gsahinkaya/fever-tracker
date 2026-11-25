<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { deleteField } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { useMedicationAlertsStore } from '@/stores/medicationAlerts'
import type { Medication } from '@/types/health'
import { mediumDateTime, toDatetimeLocalString } from '@/lib/dateFormat'
import { useNow } from '@/composables/useNow'

const props = defineProps<{
  modelValue: boolean
  medication: Medication | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', medication: Medication): void
  (e: 'removed', medication: Medication): void
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const feverLogStore = useFeverLogStore()
const medicationsStore = useMedicationsStore()
const medicationAlertsStore = useMedicationAlertsStore()
const now = useNow()

const reminderDateTime = ref('')
const isSaving = ref(false)

const safeAt = computed(() => {
  if (!props.medication) return null
  return feverLogStore.nextSafeDoseAt(props.medication.id, props.medication.minIntervalHours)
})

const isReminderActive = computed(() => {
  if (!props.medication?.reminderAt) return false
  return props.medication.reminderAt > now.value
})

const isReminderPast = computed(() => {
  if (!props.medication?.reminderAt) return false
  return props.medication.reminderAt <= now.value
})

function init() {
  if (!props.medication) {
    reminderDateTime.value = ''
    return
  }

  if (props.medication.reminderAt && props.medication.reminderAt > now.value) {
    reminderDateTime.value = toDatetimeLocalString(props.medication.reminderAt)
  } else if (safeAt.value && safeAt.value > now.value) {
    reminderDateTime.value = toDatetimeLocalString(safeAt.value)
  } else {
    const offsetHours = props.medication.minIntervalHours || 4
    reminderDateTime.value = toDatetimeLocalString(now.value + offsetHours * 3_600_000)
  }
}

watch(
  () => [props.modelValue, props.medication],
  ([visible]) => {
    if (visible) {
      init()
    }
  },
  { immediate: true },
)

function setOffset(hours: number) {
  reminderDateTime.value = toDatetimeLocalString(now.value + hours * 3_600_000)
}

function setSafeDose() {
  if (safeAt.value && safeAt.value > now.value) {
    reminderDateTime.value = toDatetimeLocalString(safeAt.value)
  }
}

async function save() {
  if (
    !props.medication ||
    !reminderDateTime.value ||
    !authStore.familyId ||
    !feverLogStore.activeChildId
  )
    return
  isSaving.value = true
  try {
    const ts = new Date(reminderDateTime.value).getTime()
    await medicationsStore.updateMedication(
      authStore.familyId,
      feverLogStore.activeChildId,
      props.medication.id,
      {
        reminderAt: ts,
        reminderNotified: false,
      },
    )
    await medicationAlertsStore.removeAlertsForMedication(props.medication.name, 'reminder')
    emit('saved', props.medication)
    emit('update:modelValue', false)
  } finally {
    isSaving.value = false
  }
}

async function remove() {
  if (!props.medication || !authStore.familyId || !feverLogStore.activeChildId) return
  isSaving.value = true
  try {
    await medicationsStore.updateMedication(
      authStore.familyId,
      feverLogStore.activeChildId,
      props.medication.id,
      {
        reminderAt: deleteField(),
        reminderNotified: deleteField(),
      },
    )
    await medicationAlertsStore.removeAlertsForMedication(props.medication.name, 'reminder')
    emit('removed', props.medication)
    emit('update:modelValue', false)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="440"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card v-if="medication">
      <v-card-title class="text-h6 pt-4 px-4 d-flex align-center">
        <v-icon icon="mdi-bell-ring-outline" color="primary" class="mr-2" />
        {{ t('reminders.manageTitle') }}
      </v-card-title>
      <v-card-subtitle class="px-4">
        {{ medication.name }}
      </v-card-subtitle>

      <v-card-text class="px-4 pt-3">
        <!-- Current reminder status badge -->
        <div v-if="medication.reminderAt" class="mb-4">
          <v-chip
            v-if="isReminderActive"
            color="primary"
            variant="tonal"
            size="small"
            prepend-icon="mdi-clock-outline"
          >
            {{ t('reminders.activeBadge', { time: mediumDateTime(medication.reminderAt) }) }}
          </v-chip>
          <v-chip
            v-else-if="isReminderPast"
            color="warning"
            variant="tonal"
            size="small"
            prepend-icon="mdi-bell-alert"
          >
            {{ t('reminders.pastBadge', { time: mediumDateTime(medication.reminderAt) }) }}
          </v-chip>
        </div>
        <p v-else class="text-caption text-medium-emphasis mb-3">
          {{ t('reminders.noActiveReminder') }}
        </p>

        <!-- Quick preset shortcuts -->
        <div class="mb-3">
          <div class="text-caption font-weight-medium text-medium-emphasis mb-1">
            {{ t('reminders.quickPresets') }}
          </div>
          <div class="d-flex flex-wrap" style="gap: 6px">
            <v-chip
              v-if="safeAt && safeAt > now"
              color="primary"
              variant="outlined"
              size="small"
              prepend-icon="mdi-clock-check-outline"
              @click="setSafeDose"
            >
              {{ t('reminders.nextSafeDoseTime', { time: mediumDateTime(safeAt) }) }}
            </v-chip>
            <v-chip
              v-for="hours in [1, 2, 4, 6, 8]"
              :key="hours"
              variant="outlined"
              size="small"
              @click="setOffset(hours)"
            >
              {{ t('reminders.inHours', { hours }) }}
            </v-chip>
          </div>
        </div>

        <v-text-field
          v-model="reminderDateTime"
          type="datetime-local"
          :label="t('reminders.customTime')"
          variant="outlined"
          density="comfortable"
          hide-details
        />
      </v-card-text>

      <v-card-actions class="px-4 pb-4">
        <v-btn
          v-if="medication.reminderAt"
          variant="text"
          color="error"
          :disabled="isSaving"
          @click="remove"
        >
          {{ t('reminders.removeReminder') }}
        </v-btn>
        <v-spacer />
        <v-btn variant="text" :disabled="isSaving" @click="emit('update:modelValue', false)">
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!reminderDateTime"
          :loading="isSaving"
          @click="save"
        >
          {{ t('reminders.saveReminder') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
