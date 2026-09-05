<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AlfredMark from './AlfredMark.vue'

const { t } = useI18n()
const props = withDefaults(defineProps<{ height?: number }>(), { height: 40 })
</script>

<template>
  <span class="alfred-logo d-inline-flex align-center" :style="{ gap: props.height * 0.25 + 'px' }">
    <AlfredMark :height="height * 1.15" />
    <span class="d-flex flex-column">
      <span class="alfred-logo__text" :style="{ fontSize: props.height * 0.75 + 'px' }">{{
        t('common.appName')
      }}</span>
      <span class="alfred-logo__tagline" :style="{ fontSize: props.height * 0.26 + 'px' }">{{
        t('common.appTagline')
      }}</span>
    </span>
  </span>
</template>

<style scoped>
.alfred-logo__text {
  font-family:
    'Poppins',
    'Inter',
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #5f07ef;
  line-height: 1.05;
}

.alfred-logo__tagline {
  /* Block-justified so its line spans exactly as wide as "Alfred" above it
     (the flex column stretches every child to the widest one's width —
     "Alfred" — and text-align-last fills that width by distributing the
     leftover space between this line's words), matching the supplied
     logo's look instead of sitting narrower/left-aligned under the title. */
  display: block;
  text-align: justify;
  text-align-last: justify;
  /* Reuses common.appTagline (Title Case, shown as-is in the header) rather
     than a second near-duplicate translation key — this lockup's style
     just wants it lowercase. Safe as a plain CSS transform here (no
     capital İ/I in this specific string to trip the Turkish-dotless-ı
     case-folding problem); don't copy this onto arbitrary Turkish text. */
  text-transform: lowercase;
  font-family:
    'Poppins',
    'Inter',
    system-ui,
    -apple-system,
    'Segoe UI',
    sans-serif;
  font-weight: 400;
  opacity: 0.85;
  color: #5f07ef;
  line-height: 1.2;
}
</style>
