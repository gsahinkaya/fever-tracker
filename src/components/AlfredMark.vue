<script setup lang="ts">
import alfredMark from '@/assets/alfred-mark.png'

withDefaults(defineProps<{ size?: number }>(), { size: 40 })
</script>

<template>
  <img :src="alfredMark" :width="size" :height="size" alt="Alfred" class="alfred-mark" />
</template>

<style scoped>
.alfred-mark {
  display: block;
  border-radius: 22%;
  object-fit: contain;
}
</style>
