import { createRouter, createWebHistory } from 'vue-router'
import { watch } from 'vue'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/rapor',
      name: 'doctor-report',
      component: () => import('../views/DoctorReportView.vue'),
    },
    {
      path: '/gecmis',
      name: 'history',
      component: () => import('../views/HistoryView.vue'),
    },
    {
      path: '/ayarlar',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      path: '/cocuklar',
      name: 'children',
      component: () => import('../views/ChildrenView.vue'),
    },
    {
      path: '/ilaclar',
      name: 'medications',
      component: () => import('../views/MedicationsView.vue'),
    },
    {
      path: '/beslenme',
      name: 'feeding',
      component: () => import('../views/FeedingView.vue'),
    },
    {
      path: '/sor',
      name: 'ask-kido',
      component: () => import('../views/AskKidoView.vue'),
    },
    {
      path: '/buyume',
      name: 'growth',
      component: () => import('../views/GrowthView.vue'),
    },
    {
      path: '/giris',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/kayit',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
    },
  ],
})

const PUBLIC_ROUTES = new Set(['/giris', '/kayit'])

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (authStore.initializing) {
    await new Promise<void>((resolve) => {
      const stop = watch(
        () => authStore.initializing,
        (value) => {
          if (!value) {
            stop()
            resolve()
          }
        },
      )
    })
  }

  if (!authStore.isAuthenticated && !PUBLIC_ROUTES.has(to.path)) {
    return '/giris'
  }
  if (authStore.isAuthenticated && PUBLIC_ROUTES.has(to.path)) {
    return '/'
  }
})

// Lazy-loaded route chunks are content-hashed, so a tab left open across a
// deploy can still be holding a reference to a filename the new deploy no
// longer serves — the fetch then 404s (or gets rewritten to index.html,
// tripping a MIME-type error). Recover by reloading once to pick up the
// current build instead of leaving the user on a broken navigation.
const RELOAD_FLAG = 'ates-olcer:reloaded-after-chunk-error'
// Clear the guard after any successful navigation so a *later* deploy can
// still trigger one recovery reload — the guard only needs to stop the
// current failure from reloading in a tight loop.
router.afterEach(() => sessionStorage.removeItem(RELOAD_FLAG))
router.onError((error) => {
  if (!/dynamically imported module|Importing a module script failed/i.test(error.message)) return
  if (sessionStorage.getItem(RELOAD_FLAG)) return
  sessionStorage.setItem(RELOAD_FLAG, '1')
  window.location.reload()
})

export default router
