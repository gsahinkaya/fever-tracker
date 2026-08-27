<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 40 })
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 40 40"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Kido"
    class="kido-mark"
  >
    <rect width="40" height="40" rx="10" class="kido-mark__bg" />
    <text x="20" y="29" text-anchor="middle" class="kido-mark__k">K</text>
    <circle cx="32" cy="8" r="6" class="kido-mark__dot" />
  </svg>
</template>

<style scoped>
.kido-mark__bg {
  fill: #5f07ef;
}
.kido-mark__k {
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
  font-size: 24px;
  font-weight: 800;
  fill: #ffffff;
}
.kido-mark__dot {
  fill: #d15f28;
}
</style>
