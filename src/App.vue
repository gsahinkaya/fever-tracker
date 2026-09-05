<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChildrenStore } from '@/stores/children'
import { useFamilyMembersStore } from '@/stores/familyMembers'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { useFeedingLogStore } from '@/stores/feedingLog'
import { useGrowthLogStore } from '@/stores/growthLog'
import { useSymptomLogStore } from '@/stores/symptomLog'
import { useSleepLogStore } from '@/stores/sleepLog'
import { useDiaperLogStore } from '@/stores/diaperLog'
import { useCalendarEventsStore } from '@/stores/calendarEvents'
import { useMedicationAlertsStore } from '@/stores/medicationAlerts'
import { useThemeStore } from '@/stores/theme'
import { useEntryNotifications } from '@/composables/useEntryNotifications'
import { useNow } from '@/composables/useNow'
import {
  describeCalendarEvent,
  describeDiaper,
  describeEntry,
  describeFeeding,
  describeGrowth,
  describeMedication,
  describeMedicationAlert,
  describeSleep,
  describeSymptom,
} from '@/lib/describeActivity'
import AlfredMark from '@/components/AlfredMark.vue'

const { t } = useI18n()
const route = useRoute()
const authStore = useAuthStore()
const childrenStore = useChildrenStore()
const familyMembersStore = useFamilyMembersStore()
const feverLogStore = useFeverLogStore()
const medicationsStore = useMedicationsStore()
const feedingLogStore = useFeedingLogStore()
const growthLogStore = useGrowthLogStore()
const symptomLogStore = useSymptomLogStore()
const sleepLogStore = useSleepLogStore()
const diaperLogStore = useDiaperLogStore()
const calendarEventsStore = useCalendarEventsStore()
const medicationAlertsStore = useMedicationAlertsStore()
useThemeStore()

useEntryNotifications()

const isAuthPage = computed(() => route.path === '/giris' || route.path === '/kayit')

// Merge separately-tracked streams (fever entries, medications, feedings) by
// when they actually happened, oldest first, so both the banner and the
// bell menu agree on what's truly latest — not just whichever store's
// array happens to be concatenated last.
const incomingItems = computed(() =>
  [
    ...feverLogStore.incomingEntries.map((entry) => ({
      at: entry.takenAt,
      text: describeEntry(entry),
    })),
    ...medicationsStore.incomingMedications.map((medication) => ({
      at: medication.createdAt ?? 0,
      text: describeMedication(medication),
    })),
    ...feedingLogStore.incomingEntries.map((entry) => ({
      at: entry.takenAt,
      text: describeFeeding(entry),
    })),
    ...growthLogStore.incomingEntries.map((entry) => ({
      at: entry.takenAt,
      text: describeGrowth(entry),
    })),
    ...symptomLogStore.incomingEntries.map((entry) => ({
      at: entry.takenAt,
      text: describeSymptom(entry),
    })),
    ...sleepLogStore.incomingEntries.map((entry) => ({
      at: entry.takenAt,
      text: describeSleep(entry),
    })),
    ...diaperLogStore.incomingEntries.map((entry) => ({
      at: entry.takenAt,
      text: describeDiaper(entry),
    })),
    ...calendarEventsStore.incomingEvents.map((entry) => ({
      at: entry.createdAt ?? 0,
      text: describeCalendarEvent(entry),
    })),
    ...medicationAlertsStore.incomingEntries.map((entry) => ({
      at: entry.takenAt,
      text: describeMedicationAlert(entry),
    })),
  ].sort((a, b) => a.at - b.at),
)

const incomingBannerText = computed(() => {
  const items = incomingItems.value
  if (!items.length) return ''
  const latest = items[items.length - 1]!.text
  return items.length === 1
    ? latest
    : t('notifications.bannerMore', { text: latest, count: items.length - 1 })
})

// The toast-style banner and the bell badge read the same underlying data,
// but dismissing one must not silently clear the other — otherwise closing
// the banner (a one-tap reflex) would wipe the bell's "did I miss anything"
// record too, defeating the point of having a persistent fallback. So the
// banner's close button only hides *itself* (bannerDismissed); only the
// bell's "Tümünü gördüm" actually acknowledges the underlying entries. A
// fresh event un-dismisses the banner so it reappears for new activity.
const bannerDismissed = ref(false)
watch(
  () => incomingItems.value.length,
  (count, previousCount) => {
    if (count > previousCount) bannerDismissed.value = false
  },
)
const showBanner = computed(
  () => !isAuthPage.value && !!incomingBannerText.value && !bannerDismissed.value,
)

function acknowledgeIncoming() {
  feverLogStore.acknowledgeIncoming()
  medicationsStore.acknowledgeIncoming()
  feedingLogStore.acknowledgeIncoming()
  growthLogStore.acknowledgeIncoming()
  symptomLogStore.acknowledgeIncoming()
  sleepLogStore.acknowledgeIncoming()
  diaperLogStore.acknowledgeIncoming()
  medicationAlertsStore.acknowledgeIncoming()
  bannerDismissed.value = false
}

// Bell icon in the app bar: a persistent, always-visible fallback in case a
// banner was missed or the tab wasn't open when the toast would've shown.
const now = useNow(60_000)
function relativeTime(at: number): string {
  const minutes = Math.floor((now.value - at) / 60_000)
  if (minutes < 1) return t('notifications.relativeTime.justNow')
  if (minutes < 60) return t('notifications.relativeTime.minutesAgo', { n: minutes })
  return t('notifications.relativeTime.hoursAgo', { n: Math.floor(minutes / 60) })
}

const activeChild = computed(
  () => childrenStore.children.find((c) => c.id === feverLogStore.activeChildId) ?? null,
)
const hasMultipleChildren = computed(() => childrenStore.children.length > 1)

watch(
  () => authStore.familyId,
  (familyId) => childrenStore.watchFamily(familyId),
  { immediate: true },
)

watch(() => authStore.familyId, familyMembersStore.load, { immediate: true })

watch(
  () => childrenStore.children,
  (children) => {
    const stillExists = children.some((c) => c.id === feverLogStore.activeChildId)
    if (stillExists) return
    const storageKey = authStore.familyId ? `ates-olcer:active-child:${authStore.familyId}` : null
    const remembered = storageKey ? localStorage.getItem(storageKey) : null
    const fallback = children.find((c) => c.id === remembered) ?? children[0] ?? null
    feverLogStore.watchChild(fallback?.id ?? null)
  },
  { deep: true },
)

watch(
  () => feverLogStore.activeChildId,
  (childId) => {
    medicationsStore.watchChild(childId)
    feedingLogStore.watchChild(childId)
    growthLogStore.watchChild(childId)
    symptomLogStore.watchChild(childId)
    sleepLogStore.watchChild(childId)
    diaperLogStore.watchChild(childId)
    calendarEventsStore.watchChild(childId)
    medicationAlertsStore.watchChild(childId)
    if (childId && authStore.familyId) {
      localStorage.setItem(`ates-olcer:active-child:${authStore.familyId}`, childId)
    }
  },
)
</script>

<template>
  <v-app>
    <v-app-bar v-if="!isAuthPage" color="primary" elevation="2" height="72">
      <template #prepend>
        <RouterLink to="/" class="ml-2 d-flex" style="text-decoration: none">
          <v-avatar color="white" size="56">
            <AlfredMark :height="42" />
          </v-avatar>
        </RouterLink>
      </template>
      <v-app-bar-title>
        <RouterLink to="/" class="d-block" style="text-decoration: none; color: inherit">
          <span class="text-subtitle-1 font-weight-bold">{{ t('common.appName') }}</span>
        </RouterLink>
      </v-app-bar-title>
      <template #append>
        <v-menu v-if="incomingItems.length" location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-badge :content="incomingItems.length" color="error" offset-x="6" offset-y="6">
              <v-btn
                icon="mdi-bell-alert"
                variant="text"
                :aria-label="t('common.notifications')"
                v-bind="menuProps"
              />
            </v-badge>
          </template>
          <v-card min-width="280" max-width="360">
            <v-list density="comfortable">
              <v-list-item v-for="(item, i) in [...incomingItems].reverse()" :key="i" class="py-2">
                <v-list-item-title
                  class="text-body-2"
                  style="white-space: normal; overflow-wrap: break-word"
                  >{{ item.text }}</v-list-item-title
                >
                <v-list-item-subtitle>{{ relativeTime(item.at) }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <v-card-actions>
              <v-spacer />
              <v-btn size="small" variant="text" @click="acknowledgeIncoming()">{{
                t('notifications.markAllSeen')
              }}</v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
        <v-btn
          icon="mdi-cog-outline"
          variant="text"
          to="/ayarlar"
          :aria-label="t('common.settings')"
        />
      </template>
    </v-app-bar>

    <v-main>
      <v-sheet
        v-if="!isAuthPage && activeChild"
        color="surface"
        class="d-flex align-center px-4 py-2 no-print"
        style="border-bottom: 1px solid rgba(128, 128, 128, 0.16)"
      >
        <v-icon icon="mdi-baby-face-outline" size="20" class="mr-1 text-medium-emphasis" />
        <v-menu v-if="hasMultipleChildren" location="bottom">
          <template #activator="{ props: menuProps }">
            <div class="d-flex align-center" style="cursor: pointer" v-bind="menuProps">
              <span class="text-body-1 font-weight-bold">{{ activeChild.name }}</span>
              <v-icon icon="mdi-chevron-down" size="16" class="ml-1" />
            </div>
          </template>
          <v-list density="comfortable">
            <v-list-item
              v-for="child in childrenStore.children"
              :key="child.id"
              :active="child.id === activeChild?.id"
              @click="feverLogStore.watchChild(child.id)"
            >
              <v-list-item-title>{{ child.name }}</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
        <span v-else class="text-body-1 font-weight-bold">{{ activeChild.name }}</span>
      </v-sheet>

      <v-slide-y-transition>
        <v-alert
          v-if="showBanner"
          type="info"
          variant="tonal"
          density="comfortable"
          icon="mdi-bell-alert"
          closable
          class="mx-3 mt-2 no-print"
          @click:close="bannerDismissed = true"
        >
          {{ incomingBannerText }}
        </v-alert>
      </v-slide-y-transition>

      <RouterView />
    </v-main>
  </v-app>
</template>
