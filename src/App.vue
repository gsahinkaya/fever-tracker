<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChildrenStore } from '@/stores/children'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'
import { useEntryNotifications } from '@/composables/useEntryNotifications'
import type { LogEntry } from '@/types/health'

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

const incomingBannerText = computed(() => {
  const list = feverLogStore.incomingEntries
  if (!list.length) return ''
  const latest = describeIncomingEntry(list[list.length - 1]!)
  return list.length === 1 ? latest : `${latest} (+${list.length - 1} diğer)`
})

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
        <v-btn icon="mdi-cog-outline" variant="text" to="/ayarlar" aria-label="Ayarlar" />
      </template>
    </v-app-bar>

    <v-slide-y-transition>
      <v-alert
        v-if="!isAuthPage && incomingBannerText"
        type="info"
        variant="tonal"
        density="comfortable"
        icon="mdi-bell-alert"
        closable
        class="mx-3 mt-2"
        @click:close="feverLogStore.acknowledgeIncoming()"
      >
        {{ incomingBannerText }}
      </v-alert>
    </v-slide-y-transition>

    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>
