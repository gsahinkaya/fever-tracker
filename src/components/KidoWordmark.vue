<script setup lang="ts">
withDefaults(defineProps<{ height?: number }>(), { height: 28 })
</script>

<template>
  <svg
    :height="height"
    viewBox="0 0 132 40"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Kido"
    class="kido-wordmark"
  >
    <text x="1" y="31" class="kido-wordmark__text">kido</text>
    <circle cx="112" cy="7" r="6" class="kido-wordmark__dot" />
  </svg>
</template>

<style scoped>
.kido-wordmark__text {
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.5px;
  fill: currentColor;
}
.kido-wordmark__dot {
  fill: #d15f28;
}
</style>
