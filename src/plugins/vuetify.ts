import '@mdi/font/css/materialdesignicons.css'
// vite-plugin-vuetify's autoImport only pulls in CSS for components actually
// used in templates — it does NOT include Vuetify's spacing/typography/flex
// utility classes (mb-4, pa-6, text-h4, d-flex, ...). Those live in the full
// stylesheet, so it must be imported explicitly or every utility class in the
// app is a silent no-op.
import 'vuetify/styles'

import { createVuetify } from 'vuetify'
import { THEME_STORAGE_KEY, type ThemeMode } from '@/lib/theme'

// Read synchronously at module init (before Vue even mounts) so the app
// never paints one frame in the wrong theme and then flips — Vuetify's own
// theme.global.name switch (used for later toggling, see stores/theme.ts)
// only takes effect after the plugin/component tree is already live.
function initialTheme(): ThemeMode {
  return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

export default createVuetify({
  theme: {
    // Without an explicit default, Vuetify auto-detects the OS color scheme
    // and switches to its own built-in dark theme — which knows nothing
    // about our custom "medication"/"growth"/"pharmacy" colors (renders
    // transparent). Both themes below are ours; the OS is never consulted.
    defaultTheme: initialTheme(),
    themes: {
      light: {
        colors: {
          // Brand palette (Primary/500) — the color lives in the buttons
          // and header, not the background.
          primary: '#5F07EF',
          // Feeding actions (breastfeeding/bottle) — vivid terracotta,
          // distinct from the primary purple and the error red. Not part
          // of the design-system export (which only defines a brand
          // purple + semantic states), kept as this app's own accent for
          // that category so the home/feeding tiles stay color-coded.
          secondary: '#d15f28',
          // Medication tile/actions — kept distinct from primary so the
          // home-screen "İlaç" tile doesn't read as the same color as the
          // (now purple) app header.
          medication: '#0e7490',
          // Growth tile/actions — kept distinct from every other tile color.
          growth: '#be185d',
          // Duty-pharmacy tile/actions — distinct emerald so it doesn't
          // read as the same "safe/success" green used elsewhere.
          pharmacy: '#059669',
          error: '#F04438',
          // Solid food / "safe now" confirmations.
          success: '#12B76A',
          // "Too early for next dose" and similar caution states.
          warning: '#F79009',
          // Informational banners (bell activity, install-PWA prompt).
          info: '#2E90FA',
          background: '#FCFCFC',
          surface: '#FFFFFF',
          'on-background': '#18181B',
          'on-surface': '#18181B',
        },
      },
      dark: {
        colors: {
          // Same brand hues, lifted a step so they stay vivid (not muddy)
          // against a near-black surface instead of reusing the light
          // theme's values verbatim.
          primary: '#9457FF',
          secondary: '#e07840',
          medication: '#22a6c2',
          growth: '#e0468a',
          pharmacy: '#10b981',
          error: '#F97066',
          success: '#32D583',
          warning: '#FDB022',
          info: '#53B1FD',
          background: '#121212',
          surface: '#1E1E1E',
          'on-background': '#E4E4E7',
          'on-surface': '#E4E4E7',
        },
      },
    },
  },
  defaults: {
    VCard: { rounded: 'lg', elevation: 1 },
    VBtn: { rounded: 'pill', variant: 'flat' },
    VTextField: { rounded: 'lg' },
    VDialog: { VCard: { rounded: 'xl' } },
    VAlert: { rounded: 'lg' },
    VChip: { rounded: 'pill' },
    VAppBar: { elevation: 0 },
  },
})
