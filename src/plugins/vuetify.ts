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
          // Brand palette (Primary/500) — the color lives in the buttons
          // and header, not the background.
          primary: '#5F07EF',
          // Feeding actions (breastfeeding/bottle) — vivid terracotta,
          // distinct from the primary purple and the error red. Not part
          // of the design-system export (which only defines a brand
          // purple + semantic states), kept as this app's own accent for
          // that category so the home/feeding tiles stay color-coded.
          secondary: '#d15f28',
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
