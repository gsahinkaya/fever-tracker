<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChildrenStore } from '@/stores/children'
import { useFeverLogStore } from '@/stores/feverLog'
import { useMedicationsStore } from '@/stores/medications'

const route = useRoute()
const authStore = useAuthStore()
const childrenStore = useChildrenStore()
const feverLogStore = useFeverLogStore()
const medicationsStore = useMedicationsStore()

const isAuthPage = computed(() => route.path === '/giris' || route.path === '/kayit')

const activeChild = computed(
  () => childrenStore.children.find((c) => c.id === feverLogStore.activeChildId) ?? null,
)
const title = computed(() => (activeChild.value ? `${activeChild.value.name} · Ateş Ölçer` : 'Ateş Ölçer'))

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

    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>
