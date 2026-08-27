<script setup lang="ts">
import KidoMark from './KidoMark.vue'

const props = withDefaults(defineProps<{ height?: number }>(), { height: 40 })
</script>

<template>
  <span class="kido-logo d-inline-flex align-center" :style="{ gap: props.height * 0.3 + 'px' }">
    <KidoMark :size="height" />
    <svg
      :height="height"
      viewBox="0 0 116 40"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="kido"
    >
      <text x="0" y="29" class="kido-logo__text">kido</text>
    </svg>
  </span>
</template>

<style scoped>
.kido-logo__text {
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.5px;
  fill: #5f07ef;
}
</style>
