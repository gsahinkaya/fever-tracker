<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChildrenStore } from '@/stores/children'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { useEntryNotifications } from '@/composables/useEntryNotifications'
import { useNow } from '@/composables/useNow'
import type { LogEntry, Medication } from '@/types/health'

const route = useRoute()
const authStore = useAuthStore()
const childrenStore = useChildrenStore()
const feverLogStore = useFeverLogStore()
const medicationsStore = useMedicationsStore()

useEntryNotifications()

const isAuthPage = computed(() => route.path === '/giris' || route.path === '/kayit')

function describeIncomingEntry(entry: LogEntry): string {
  const who = entry.createdByEmail?.split('@')[0] ?? 'Diğer ebeveyn'
  const what =
    entry.type === 'reading'
      ? `${entry.temperature}° ölçüm ekledi`
      : `${entry.medicationName} verdi`
  return `${who} ${what}`
}

function describeIncomingMedication(medication: Medication): string {
  const who = medication.createdByEmail?.split('@')[0] ?? 'Diğer ebeveyn'
  return `${who} ${medication.name} ilacını ekledi`
}

// Merge two separately-tracked streams (fever entries and medications) by
// actual arrival time, oldest first, so both the banner and the bell menu
// agree on what really happened last — not just whichever store's array
// happens to be concatenated second.
const incomingItems = computed(() =>
  [
    ...feverLogStore.incomingEntries.map((i) => ({
      receivedAt: i.receivedAt,
      text: describeIncomingEntry(i.entry),
    })),
    ...medicationsStore.incomingMedications.map((i) => ({
      receivedAt: i.receivedAt,
      text: describeIncomingMedication(i.medication),
    })),
  ].sort((a, b) => a.receivedAt - b.receivedAt),
)

const incomingBannerText = computed(() => {
  const items = incomingItems.value
  if (!items.length) return ''
  const latest = items[items.length - 1]!.text
  return items.length === 1 ? latest : `${latest} (+${items.length - 1} diğer)`
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
const showBanner = computed(() => !isAuthPage.value && !!incomingBannerText.value && !bannerDismissed.value)

function acknowledgeIncoming() {
  feverLogStore.acknowledgeIncoming()
  medicationsStore.acknowledgeIncoming()
  bannerDismissed.value = false
}

// Bell icon in the app bar: a persistent, always-visible fallback in case a
// banner was missed or the tab wasn't open when the toast would've shown.
const now = useNow(60_000)
function relativeTime(receivedAt: number): string {
  const minutes = Math.floor((now.value - receivedAt) / 60_000)
  if (minutes < 1) return 'az önce'
  if (minutes < 60) return `${minutes} dk önce`
  return `${Math.floor(minutes / 60)} sa önce`
}

const activeChild = computed(
  () => childrenStore.children.find((c) => c.id === feverLogStore.activeChildId) ?? null,
)
const title = computed(() =>
  activeChild.value ? `${activeChild.value.name} · Ateş Ölçer` : 'Ateş Ölçer',
)

watch(
  () => authStore.familyId,
  (familyId) => childrenStore.watchFamily(familyId),
  { immediate: true },
)

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
    medicationsStore.watchChild(authStore.familyId, childId)
    if (childId && authStore.familyId) {
      localStorage.setItem(`ates-olcer:active-child:${authStore.familyId}`, childId)
    }
  },
)
</script>

<template>
  <v-app>
    <v-app-bar v-if="!isAuthPage" color="surface" class="border-b">
      <template #prepend>
        <v-icon icon="mdi-thermometer" color="error" class="ml-2" />
      </template>
      <v-app-bar-title class="font-weight-bold">{{ title }}</v-app-bar-title>
      <template #append>
        <v-menu v-if="incomingItems.length" location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-badge :content="incomingItems.length" color="error" offset-x="6" offset-y="6">
              <v-btn
                icon="mdi-bell-alert"
                variant="text"
                aria-label="Bildirimler"
                v-bind="menuProps"
              />
            </v-badge>
          </template>
          <v-card min-width="280" max-width="360">
            <v-list density="comfortable">
              <v-list-item v-for="(item, i) in [...incomingItems].reverse()" :key="i">
                <v-list-item-title class="text-body-2">{{ item.text }}</v-list-item-title>
                <v-list-item-subtitle>{{ relativeTime(item.receivedAt) }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
            <v-card-actions>
              <v-spacer />
              <v-btn size="small" variant="text" @click="acknowledgeIncoming()"
                >Tümünü gördüm</v-btn
              >
            </v-card-actions>
          </v-card>
        </v-menu>
        <v-btn v-else icon="mdi-bell-outline" variant="text" disabled aria-label="Bildirim yok" />
        <v-btn icon="mdi-cog-outline" variant="text" to="/ayarlar" aria-label="Ayarlar" />
      </template>
    </v-app-bar>

    <v-main>
      <v-slide-y-transition>
        <v-alert
          v-if="showBanner"
          type="info"
          variant="tonal"
          density="comfortable"
          icon="mdi-bell-alert"
          closable
          class="mx-3 mt-2"
          @click:close="bannerDismissed = true"
        >
          {{ incomingBannerText }}
        </v-alert>
      </v-slide-y-transition>

      <RouterView />
    </v-main>
  </v-app>
</template>
