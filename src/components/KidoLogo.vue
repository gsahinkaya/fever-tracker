<script setup lang="ts">
import KidoMark from './KidoMark.vue'

const props = withDefaults(defineProps<{ height?: number }>(), { height: 40 })
</script>

<template>
  <span class="kido-logo d-inline-flex align-center" :style="{ gap: props.height * 0.3 + 'px' }">
    <KidoMark :size="height" />
    <span class="kido-logo__text" :style="{ fontSize: props.height * 0.75 + 'px' }">kido</span>
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
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #5f07ef;
  line-height: 1;
}
</style>
