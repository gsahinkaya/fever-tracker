import { createI18n } from 'vue-i18n'
import tr from '@/locales/tr'
import en from '@/locales/en'
import { LOCALE_STORAGE_KEY, type LocaleCode } from '@/lib/locale'

// Read synchronously at module init (before Vue even mounts) so the app
// never paints one frame in the wrong language and then flips — mirrors
// vuetify.ts's initialTheme() for the same reason. Defaults to Turkish for
// every new device/install.
function initialLocale(): LocaleCode {
  return localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'tr'
}

// `legacy: false` puts vue-i18n in Composition API mode so `useI18n()`
// works in `<script setup>`. Every user-facing string in the app is read
// through this instance rather than hardcoded, so switching languages (see
// stores/locale.ts) or adding a third locale is a matter of this file and a
// new sibling under locales/, not a hunt through every component.
export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'tr',
  messages: { tr, en },
})

// For plain .ts modules (stores, composables) that aren't inside a
// component's setup() and so can't call useI18n().
export const t = i18n.global.t
