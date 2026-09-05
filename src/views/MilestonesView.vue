<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useChildrenStore } from '@/stores/children'
import { useFeverLogStore } from '@/stores/feverLog'
import { DEVELOPMENTAL_MILESTONES, type MilestoneCategory } from '@/data/developmentalMilestones'

const { t } = useI18n()
const authStore = useAuthStore()
const childrenStore = useChildrenStore()
const feverLogStore = useFeverLogStore()

const activeChild = computed(
  () => childrenStore.children.find((c) => c.id === feverLogStore.activeChildId) ?? null,
)

// Grouped by age checkpoint (2mo, 4mo, ...) in the order the catalog is
// authored, matching how every published milestone checklist presents
// itself — a single flat list loses the "these cluster around the same
// checkup" structure that makes it scannable.
const ageGroups = computed(() => {
  const child = activeChild.value
  if (!child?.birthDate) return []
  const completed = new Set(child.completedMilestoneIds ?? [])
  const byAge = new Map<number, (typeof DEVELOPMENTAL_MILESTONES)[number][]>()
  for (const item of DEVELOPMENTAL_MILESTONES) {
    if (!byAge.has(item.ageMonths)) byAge.set(item.ageMonths, [])
    byAge.get(item.ageMonths)!.push(item)
  }
  return Array.from(byAge.entries()).map(([ageMonths, items]) => ({
    ageMonths,
    items: items.map((item) => ({ ...item, done: completed.has(item.id) })),
  }))
})

const CATEGORY_ICONS: Record<MilestoneCategory, string> = {
  motor: 'mdi-run',
  language: 'mdi-comment-text-outline',
  social: 'mdi-account-heart-outline',
  cognitive: 'mdi-lightbulb-outline',
}

async function toggle(id: string, done: boolean) {
  const child = activeChild.value
  if (!child || !authStore.familyId) return
  const current = new Set(child.completedMilestoneIds ?? [])
  if (done) current.add(id)
  else current.delete(id)
  await childrenStore.updateChild(authStore.familyId, child.id, {
    completedMilestoneIds: Array.from(current),
  })
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
      <span class="text-h6 ml-2">{{ t('milestones.title') }}</span>
    </div>

    <div v-if="!activeChild?.birthDate" class="text-center py-8">
      <v-icon icon="mdi-calendar-alert-outline" size="48" color="medium-emphasis" class="mb-4" />
      <p class="text-body-2 text-medium-emphasis mb-4">{{ t('milestones.needsBirthDate') }}</p>
      <v-btn color="primary" variant="tonal" to="/cocuklar">{{
        t('milestones.goToChildren')
      }}</v-btn>
    </div>

    <template v-else>
      <p class="text-caption text-medium-emphasis mb-4">{{ t('milestones.disclaimer') }}</p>

      <div v-for="group in ageGroups" :key="group.ageMonths" class="mb-5">
        <div class="text-subtitle-2 font-weight-bold mb-1">
          {{ t('milestones.ageGroupLabel', { months: group.ageMonths }) }}
        </div>
        <v-list lines="one" density="comfortable">
          <v-list-item v-for="item in group.items" :key="item.id">
            <template #prepend>
              <v-checkbox-btn
                :model-value="item.done"
                color="growth"
                @update:model-value="(v: boolean) => toggle(item.id, v)"
              />
            </template>
            <v-list-item-title
              :class="{ 'text-decoration-line-through text-medium-emphasis': item.done }"
            >
              <v-icon :icon="CATEGORY_ICONS[item.category]" size="16" class="mr-1" />
              {{ item.label }}
            </v-list-item-title>
            <v-list-item-subtitle>{{ t(`milestones.category.${item.category}`) }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </div>
    </template>
  </v-container>
</template>
