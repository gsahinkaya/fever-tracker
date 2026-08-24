<script setup lang="ts">
import { computed } from 'vue'
import { useFeverLogStore } from '@/stores/feverLog'
import type { Medication } from '@/types/health'
import { useNow } from '@/composables/useNow'

const props = defineProps<{ medication: Medication }>()

const store = useFeverLogStore()
const now = useNow()

const last = computed(() => store.lastDose(props.medication.id))
const safeAt = computed(() => store.nextSafeDoseAt(props.medication.id, props.medication.minIntervalHours))

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
  return `${h} sa ${m.toString().padStart(2, '0')} dk`
})

const lastDoseLabel = computed(() => {
  if (!last.value) return ''
  return new Date(last.value.takenAt).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })
})
</script>

<template>
  <v-card :color="status === 'ready' ? 'error' : undefined" :variant="status === 'ready' ? 'tonal' : 'outlined'">
    <v-card-item>
      <v-card-title class="text-subtitle-1">{{ medication.name }}</v-card-title>
      <v-card-subtitle v-if="medication.note">{{ medication.note }}</v-card-subtitle>
    </v-card-item>
    <v-card-text>
      <span v-if="status === 'none'" class="text-medium-emphasis">Henüz kayıt yok</span>
      <template v-else-if="status === 'ready'">
        <div class="text-h6 text-error">Şimdi verilebilir</div>
        <div class="text-caption text-medium-emphasis">Son doz: {{ lastDoseLabel }}</div>
      </template>
      <template v-else>
        <div class="text-h5 font-weight-bold">{{ remainingLabel }}</div>
        <div class="text-caption text-medium-emphasis">sonra güvenli · son doz {{ lastDoseLabel }}</div>
      </template>
    </v-card-text>
  </v-card>
</template>
