import '@mdi/font/css/materialdesignicons.css'
// vite-plugin-vuetify's autoImport only pulls in CSS for components actually
// used in templates — it does NOT include Vuetify's spacing/typography/flex
// utility classes (mb-4, pa-6, text-h4, d-flex, ...). Those live in the full
// stylesheet, so it must be imported explicitly or every utility class in the
// app is a silent no-op.
import 'vuetify/styles'

import { createVuetify } from 'vuetify'

export default createVuetify({
  theme: {
    themes: {
      light: {
        colors: {
          primary: '#3d6e8c',
          // Feeding actions (breastfeeding/bottle) — warm clay, distinct from
          // the primary blue and the error red without competing with either.
          secondary: '#a8623a',
          error: '#d03b3b',
          // Solid food / "safe now" confirmations — muted sage rather than a
          // stock bright green, to stay in the same soft, warm register.
          success: '#4f8b6b',
          // "Too early for next dose" and similar caution states.
          warning: '#c98a2e',
          // Informational banners (bell activity, install-PWA prompt).
          info: '#5c88a6',
          background: '#faf7f2',
          surface: '#ffffff',
        },
      },
    },
  },
  defaults: {
    VCard: { rounded: 'lg', elevation: 1 },
    VBtn: { rounded: 'lg', variant: 'flat' },
    VTextField: { rounded: 'lg' },
    VDialog: { VCard: { rounded: 'xl' } },
    VAlert: { rounded: 'lg' },
    VChip: { rounded: 'lg' },
    VAppBar: { elevation: 0 },
  },
})
