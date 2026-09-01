<script setup lang="ts">
import alfredMark from '@/assets/alfred-mark.png'

withDefaults(defineProps<{ size?: number }>(), { size: 40 })
</script>

<template>
  <img :src="alfredMark" :height="size" alt="Alfred" class="alfred-mark" />
</template>

<style scoped>
.alfred-mark {
  display: block;
  object-fit: contain;
}
</style>
