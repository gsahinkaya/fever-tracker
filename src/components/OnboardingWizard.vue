<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const model = defineModel<boolean>({ default: false })
const emit = defineEmits<{ finish: [] }>()

const { tm } = useI18n()

// Icon/color per step aren't translatable content, so they live here rather
// than in the locale file — kept in the same order as onboarding.steps.
const stepMeta = [
  { icon: 'mdi-hand-wave-outline', color: 'primary' },
  { icon: 'mdi-thermometer', color: 'error' },
  { icon: 'mdi-emoticon-sick-outline', color: 'symptom' },
  { icon: 'mdi-pill', color: 'medication' },
  { icon: 'mdi-baby-bottle-outline', color: 'secondary' },
  { icon: 'mdi-sleep', color: 'sleep' },
  { icon: 'mdi-needle', color: 'vaccine' },
  { icon: 'mdi-human-male-height', color: 'growth' },
  { icon: 'mdi-file-chart-outline', color: 'info' },
  { icon: 'mdi-chat-question-outline', color: 'success' },
  { icon: 'mdi-mortar-pestle', color: 'pharmacy' },
  { icon: 'mdi-drama-masks', color: 'activity' },
  { icon: 'mdi-bell-alert', color: 'primary' },
  { icon: 'mdi-account-multiple-plus-outline', color: 'primary' },
]

const steps = computed(() => tm('onboarding.steps') as unknown as { title: string; body: string }[])

const current = ref(0)
const isLast = computed(() => current.value === steps.value.length - 1)
const isFirst = computed(() => current.value === 0)

function next() {
  if (isLast.value) {
    finish()
  } else {
    current.value++
  }
}

function back() {
  if (!isFirst.value) current.value--
}

function finish() {
  model.value = false
  current.value = 0
  emit('finish')
}
</script>

<template>
  <v-dialog v-model="model" max-width="420" persistent>
    <v-card v-if="steps[current]">
      <v-card-text class="text-center pt-8 pb-4">
        <v-avatar :color="stepMeta[current]?.color" size="72" class="mb-4">
          <v-icon :icon="stepMeta[current]?.icon" size="36" color="white" />
        </v-avatar>
        <div class="text-h6 mb-2">{{ steps[current]!.title }}</div>
        <p class="text-body-2 text-medium-emphasis">{{ steps[current]!.body }}</p>
      </v-card-text>

      <div class="d-flex justify-center ga-1 mb-4">
        <div
          v-for="(_, i) in steps"
          :key="i"
          class="onboarding-dot"
          :class="{ 'onboarding-dot--active': i === current }"
        />
      </div>

      <v-card-actions class="pb-4 px-4">
        <v-btn v-if="!isFirst" variant="text" @click="back">{{ $t('onboarding.back') }}</v-btn>
        <v-btn v-else variant="text" @click="finish">{{ $t('onboarding.skip') }}</v-btn>
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="next">
          {{ isLast ? $t('onboarding.finish') : $t('onboarding.next') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.onboarding-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.2);
  transition: background 0.2s;
}
.onboarding-dot--active {
  background: rgb(var(--v-theme-primary));
}
</style>
