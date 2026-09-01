<script setup lang="ts">
import AlfredMark from './AlfredMark.vue'

const props = withDefaults(defineProps<{ height?: number }>(), { height: 40 })
</script>

<template>
  <span class="alfred-logo d-inline-flex align-center" :style="{ gap: props.height * 0.25 + 'px' }">
    <AlfredMark :size="height * 1.15" />
    <span class="d-flex flex-column">
      <span class="alfred-logo__text" :style="{ fontSize: props.height * 0.75 + 'px' }">Alfred</span>
      <span class="alfred-logo__tagline" :style="{ fontSize: props.height * 0.26 + 'px' }"
        >çocuklu hayatın asistanı</span
      >
    </span>
  </span>
</template>

<style scoped>
.alfred-logo__text {
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #5f07ef;
  line-height: 1.05;
}

.alfred-logo__tagline {
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
  font-weight: 500;
  color: #5f07ef;
  line-height: 1.2;
}
</style>
