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
          error: '#d03b3b',
          background: '#faf7f2',
          surface: '#ffffff',
        },
      },
    },
  },
  defaults: {
    VCard: { rounded: 'lg', elevation: 1 },
    VBtn: { rounded: 'lg' },
    VTextField: { rounded: 'lg' },
    VDialog: { VCard: { rounded: 'xl' } },
    VAlert: { rounded: 'lg' },
    VChip: { rounded: 'lg' },
    VAppBar: { elevation: 0 },
  },
})
