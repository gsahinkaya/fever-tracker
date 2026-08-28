import { ref } from 'vue'
import { defineStore } from 'pinia'
import { i18n } from '@/i18n'
import { LOCALE_STORAGE_KEY, type LocaleCode } from '@/lib/locale'

export const useLocaleStore = defineStore('locale', () => {
  const locale = ref<LocaleCode>(i18n.global.locale.value as LocaleCode)

  function setLocale(next: LocaleCode) {
    locale.value = next
    localStorage.setItem(LOCALE_STORAGE_KEY, next)
    i18n.global.locale.value = next
  }

  return { locale, setLocale }
})
