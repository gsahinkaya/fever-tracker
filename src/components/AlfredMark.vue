<script setup lang="ts">
withDefaults(defineProps<{ height?: number }>(), { height: 40 })
</script>

<template>
  <svg
    :width="height"
    :height="height"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Alfred"
    class="alfred-mark"
  >
    <rect width="100" height="100" rx="22" class="alfred-mark__bg" />
    <text x="50" y="66" text-anchor="middle" class="alfred-mark__letter">A</text>
  </svg>
</template>

<style scoped>
.alfred-mark {
  display: block;
}
.alfred-mark__bg {
  fill: #5f07ef;
}
.alfred-mark__letter {
  font-family:
    'Poppins',
    'Inter',
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
  font-weight: 700;
  font-size: 60px;
  fill: #ffffff;
}
</style>
