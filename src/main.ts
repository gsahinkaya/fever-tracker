import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './assets/theme.css'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { i18n } from './i18n'

// registerType: 'autoUpdate' (vite.config.ts) makes a new service worker
// skipWaiting + claim clients as soon as it's installed, but that alone
// doesn't reload an already-open tab — it just silently starts serving a
// new SW version underneath a page still running the old deploy's JS. The
// next lazy import (or any fetch the SW intercepts) then resolves against
// the new SW's cache, which has no record of the old build's content-hashed
// filenames, and 404s. Reloading the instant a new SW takes control — not
// waiting for that failure — is what actually fixes it for an open tab.
if ('serviceWorker' in navigator) {
  // Only reload when a controller is *replaced* — a first-ever visit also
  // fires controllerchange once its SW activates and claims the (until
  // then uncontrolled) page, which would otherwise reload every new
  // install for no reason.
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return
    reloaded = true
    window.location.reload()
  })
}

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(vuetify)
app.use(i18n)

app.mount('#app')
