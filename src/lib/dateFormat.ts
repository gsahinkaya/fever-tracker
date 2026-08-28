import { i18n } from '@/i18n'

// Every date/time formatting call in the app should go through this
// instead of hardcoding 'tr-TR', so switching the app language (see
// stores/locale.ts) also switches month names, weekday names, etc. — not
// just the UI copy read through t().
export function localeTag(): string {
  return i18n.global.locale.value === 'en' ? 'en-US' : 'tr-TR'
}
