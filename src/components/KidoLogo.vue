<script setup lang="ts">
withDefaults(defineProps<{ height?: number }>(), { height: 40 })
</script>

<template>
  <svg
    :height="height"
    viewBox="0 0 168 40"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Kido"
    class="kido-logo"
  >
    <rect width="40" height="40" rx="10" class="kido-logo__mark" />
    <text x="20" y="29" text-anchor="middle" class="kido-logo__k">K</text>
    <circle cx="32" cy="8" r="6" class="kido-logo__dot" />
    <text x="52" y="29" class="kido-logo__text">kido</text>
  </svg>
</template>

<style scoped>
.kido-logo__mark {
  fill: #5f07ef;
}
.kido-logo__k {
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
.kido-logo__dot {
  fill: #d15f28;
}
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
