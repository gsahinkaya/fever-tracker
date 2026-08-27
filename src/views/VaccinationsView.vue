<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useChildrenStore } from '@/stores/children'
import { useFeverLogStore } from '@/stores/feverLog'
import { useNow } from '@/composables/useNow'
import { VACCINATION_SCHEDULE } from '@/data/vaccinationSchedule'

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
    return { ...item, dueAt, done, status }
  })
})

const dueDateLabel = (dueAt: number) =>
  new Date(dueAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })

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

const statusColor: Record<Status, string> = {
  done: 'success',
  overdue: 'error',
  upcoming: 'medium-emphasis',
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
  </v-container>
</template>
