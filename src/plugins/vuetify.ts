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
          // Vivid, saturated accents against a plain white canvas — the
          // color lives in the buttons, not the background.
          primary: '#1479a8',
          // Feeding actions (breastfeeding/bottle) — vivid terracotta,
          // distinct from the primary blue and the error red.
          secondary: '#d15f28',
          error: '#d03b3b',
          // Solid food / "safe now" confirmations.
          success: '#2fa35c',
          // "Too early for next dose" and similar caution states.
          warning: '#e0a415',
          // Informational banners (bell activity, install-PWA prompt).
          info: '#2aa0d8',
          background: '#ffffff',
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
