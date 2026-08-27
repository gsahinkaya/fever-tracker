import { ref } from 'vue'
import { defineStore } from 'pinia'
import vuetify from '@/plugins/vuetify'
import { THEME_STORAGE_KEY, type ThemeMode } from '@/lib/theme'

// Mirrors color-scheme onto the document root so the browser's own chrome
// (scrollbars, native form controls, overscroll bounce) matches too — see
// the comment in theme.css this pairs with.
function applyDocumentTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(vuetify.theme.global.name.value as ThemeMode)
  applyDocumentTheme(mode.value)

  function setMode(next: ThemeMode) {
    mode.value = next
    localStorage.setItem(THEME_STORAGE_KEY, next)
    vuetify.theme.global.name.value = next
    applyDocumentTheme(next)
  }

  return { mode, setMode }
})
