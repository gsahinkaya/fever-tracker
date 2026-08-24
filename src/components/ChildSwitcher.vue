<script setup lang="ts">
import { useChildrenStore } from '@/stores/children'
import { useFeverLogStore } from '@/stores/feverLog'

const childrenStore = useChildrenStore()
const feverLogStore = useFeverLogStore()
</script>

<template>
  <v-chip-group
    v-if="childrenStore.children.length > 1"
    :model-value="feverLogStore.activeChildId"
    mandatory
    color="primary"
    class="mb-2"
    @update:model-value="(id: string | null) => feverLogStore.watchChild(id)"
  >
    <v-chip v-for="child in childrenStore.children" :key="child.id" :value="child.id" filter>
      {{ child.name }}
    </v-chip>
  </v-chip-group>
</template>
