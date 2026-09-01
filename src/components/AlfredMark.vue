<script setup lang="ts">
import alfredMark from '@/assets/alfred-mark.png'

withDefaults(defineProps<{ height?: number }>(), { height: 40 })
</script>

<template>
  <img :src="alfredMark" :height="height" alt="Alfred" class="alfred-mark" />
</template>

<style scoped>
.alfred-mark {
  display: block;
  object-fit: contain;
}
</style>
