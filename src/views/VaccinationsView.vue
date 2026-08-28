<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useChildrenStore } from '@/stores/children'
import { useFeverLogStore } from '@/stores/feverLog'
import { useNow } from '@/composables/useNow'
import { VACCINATION_SCHEDULE } from '@/data/vaccinationSchedule'
import type { CustomVaccine } from '@/types/family'
import { localeTag } from '@/lib/dateFormat'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const childrenStore = useChildrenStore()
const feverLogStore = useFeverLogStore()
const now = useNow(60_000)

const activeChild = computed(
  () => childrenStore.children.find((c) => c.id === feverLogStore.activeChildId) ?? null,
)

type Status = 'done' | 'overdue' | 'upcoming'

const rows = computed(() => {
  const child = activeChild.value
  if (!child?.birthDate) return []
  const birth = new Date(child.birthDate).getTime()
  const completed = new Set(child.completedVaccineIds ?? [])
  return VACCINATION_SCHEDULE.map((item) => {
    const dueAt = birth + item.ageDays * 86_400_000
    const done = completed.has(item.id)
    const status: Status = done ? 'done' : dueAt <= now.value ? 'overdue' : 'upcoming'
    return { ...item, dueAt, done, status, custom: false as const }
  })
})

// Vaccines the parent added themselves, outside the national schedule —
// have no birthDate-derived due date, so a missing dueDate just means "no
// particular date yet" rather than overdue/upcoming.
const customRows = computed(() => {
  const child = activeChild.value
  if (!child) return []
  return (child.customVaccines ?? []).map((v) => {
    const dueAt = v.dueDate ? new Date(v.dueDate).getTime() : null
    const status: Status | null = v.done ? 'done' : dueAt != null ? (dueAt <= now.value ? 'overdue' : 'upcoming') : null
    return { ...v, dueAt, status, custom: true as const }
  })
})

const dueDateLabel = (dueAt: number) =>
  new Date(dueAt).toLocaleDateString(localeTag(), { day: '2-digit', month: '2-digit', year: 'numeric' })

async function toggle(id: string, done: boolean) {
  const child = activeChild.value
  if (!child || !authStore.familyId) return
  const current = new Set(child.completedVaccineIds ?? [])
  if (done) current.add(id)
  else current.delete(id)
  await childrenStore.updateChild(authStore.familyId, child.id, {
    completedVaccineIds: Array.from(current),
  })
}

async function toggleCustom(id: string, done: boolean) {
  const child = activeChild.value
  if (!child || !authStore.familyId) return
  const updated = (child.customVaccines ?? []).map((v) => (v.id === id ? { ...v, done } : v))
  await childrenStore.updateChild(authStore.familyId, child.id, { customVaccines: updated })
}

async function removeCustom(id: string) {
  const child = activeChild.value
  if (!child || !authStore.familyId) return
  const updated = (child.customVaccines ?? []).filter((v) => v.id !== id)
  await childrenStore.updateChild(authStore.familyId, child.id, { customVaccines: updated })
}

const statusColor: Record<Status, string> = {
  done: 'success',
  overdue: 'error',
  upcoming: 'medium-emphasis',
}

const showAddDialog = ref(false)
const newVaccineName = ref('')
const newVaccineDueDate = ref('')
const confirmDeleteTarget = ref<CustomVaccine | null>(null)
const deleteCustomBody = computed(() =>
  confirmDeleteTarget.value
    ? t('vaccinations.deleteCustomConfirmBody', { name: confirmDeleteTarget.value.name })
    : '',
)

function confirmDeleteCustom() {
  if (confirmDeleteTarget.value) removeCustom(confirmDeleteTarget.value.id)
  confirmDeleteTarget.value = null
}

watch(showAddDialog, (open) => {
  if (open) {
    newVaccineName.value = ''
    newVaccineDueDate.value = ''
  }
})

async function addCustomVaccine() {
  const child = activeChild.value
  if (!child || !authStore.familyId || !newVaccineName.value.trim()) return
  const entry: CustomVaccine = {
    id: crypto.randomUUID(),
    name: newVaccineName.value.trim(),
    done: false,
    ...(newVaccineDueDate.value ? { dueDate: newVaccineDueDate.value } : {}),
  }
  await childrenStore.updateChild(authStore.familyId, child.id, {
    customVaccines: [...(child.customVaccines ?? []), entry],
  })
  showAddDialog.value = false
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
      <span class="text-h6 ml-2">{{ t('vaccinations.title') }}</span>
    </div>

    <div v-if="!activeChild?.birthDate" class="text-center py-8">
      <v-icon icon="mdi-calendar-alert-outline" size="48" color="medium-emphasis" class="mb-4" />
      <p class="text-body-2 text-medium-emphasis mb-4">{{ t('vaccinations.needsBirthDate') }}</p>
      <v-btn color="primary" variant="tonal" to="/cocuklar">{{
        t('vaccinations.goToChildren')
      }}</v-btn>
    </div>

    <template v-else>
      <p class="text-caption text-medium-emphasis mb-4">{{ t('vaccinations.disclaimer') }}</p>
      <v-list lines="two">
        <v-list-item v-for="row in rows" :key="row.id">
          <template #prepend>
            <v-checkbox-btn
              :model-value="row.done"
              :color="statusColor[row.status]"
              @update:model-value="(v: boolean) => toggle(row.id, v)"
            />
          </template>
          <v-list-item-title :class="{ 'text-decoration-line-through text-medium-emphasis': row.done }">
            {{ row.name }} — {{ row.doseLabel }}
          </v-list-item-title>
          <v-list-item-subtitle>
            <span :class="`text-${statusColor[row.status]}`">{{
              row.done
                ? t('vaccinations.status.done', { date: dueDateLabel(row.dueAt) })
                : row.status === 'overdue'
                  ? t('vaccinations.status.overdue', { date: dueDateLabel(row.dueAt) })
                  : t('vaccinations.status.upcoming', { date: dueDateLabel(row.dueAt) })
            }}</span>
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
    </template>

    <v-divider v-if="activeChild" class="my-4" />

    <template v-if="activeChild">
      <div class="d-flex align-center mb-2">
        <span class="text-subtitle-2 text-medium-emphasis">{{ t('vaccinations.customTitle') }}</span>
        <v-spacer />
        <v-btn variant="text" size="small" color="primary" @click="showAddDialog = true">{{
          t('vaccinations.addCustom')
        }}</v-btn>
      </div>

      <v-list v-if="customRows.length" lines="two">
        <v-list-item v-for="row in customRows" :key="row.id">
          <template #prepend>
            <v-checkbox-btn
              :model-value="row.done"
              :color="row.status ? statusColor[row.status] : 'medium-emphasis'"
              @update:model-value="(v: boolean) => toggleCustom(row.id, v)"
            />
          </template>
          <v-list-item-title :class="{ 'text-decoration-line-through text-medium-emphasis': row.done }">
            {{ row.name }}
          </v-list-item-title>
          <v-list-item-subtitle>
            <span v-if="row.status" :class="`text-${statusColor[row.status]}`">{{
              row.done
                ? t('vaccinations.status.done', { date: dueDateLabel(row.dueAt!) })
                : row.status === 'overdue'
                  ? t('vaccinations.status.overdue', { date: dueDateLabel(row.dueAt!) })
                  : t('vaccinations.status.upcoming', { date: dueDateLabel(row.dueAt!) })
            }}</span>
            <span v-else>{{ t('vaccinations.noDueDate') }}</span>
          </v-list-item-subtitle>
          <template #append>
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              size="small"
              :aria-label="t('vaccinations.deleteCustomAria')"
              @click="confirmDeleteTarget = row"
            />
          </template>
        </v-list-item>
      </v-list>
      <p v-else class="text-body-2 text-medium-emphasis">{{ t('vaccinations.customEmpty') }}</p>
    </template>

    <v-dialog v-model="showAddDialog" max-width="420">
      <v-card>
        <v-card-title class="text-h6">{{ t('vaccinations.dialog.title') }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="newVaccineName"
            :label="t('vaccinations.dialog.nameLabel')"
            :placeholder="t('vaccinations.dialog.namePlaceholder')"
            variant="outlined"
            density="comfortable"
            autofocus
          />
          <v-text-field
            v-model="newVaccineDueDate"
            type="date"
            :label="t('vaccinations.dialog.dueDateLabel')"
            :hint="t('vaccinations.dialog.dueDateHint')"
            persistent-hint
            variant="outlined"
            density="comfortable"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showAddDialog = false">{{ t('common.cancel') }}</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!newVaccineName.trim()"
            @click="addCustomVaccine"
          >
            {{ t('common.save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog
      :model-value="!!confirmDeleteTarget"
      @update:model-value="(v: boolean) => !v && (confirmDeleteTarget = null)"
      :title="t('vaccinations.deleteCustomConfirmTitle')"
      :body="deleteCustomBody"
      @confirm="confirmDeleteCustom"
    />
  </v-container>
</template>
