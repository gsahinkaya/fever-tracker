import { createI18n } from 'vue-i18n'
import tr from '@/locales/tr'

// `legacy: false` puts vue-i18n in Composition API mode so `useI18n()`
// works in `<script setup>`. Only one locale exists today, but every
// user-facing string in the app is read through this instance rather than
// hardcoded, so adding a second locale later is a new sibling file under
// locales/, not a hunt through every component.
export const i18n = createI18n({
  legacy: false,
  locale: 'tr',
  fallbackLocale: 'tr',
  messages: { tr },
})

// For plain .ts modules (stores, composables) that aren't inside a
// component's setup() and so can't call useI18n().
export const t = i18n.global.t
