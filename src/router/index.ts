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
      path: '/doctor-report',
      name: 'doctor-report',
      component: () => import('../views/DoctorReportView.vue'),
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/HistoryView.vue'),
    },
    {
      path: '/duty-pharmacy',
      name: 'duty-pharmacy',
      component: () => import('../views/DutyPharmacyView.vue'),
    },
    {
      path: '/vaccinations',
      name: 'vaccinations',
      component: () => import('../views/VaccinationsView.vue'),
    },
    {
      path: '/milestones',
      name: 'milestones',
      component: () => import('../views/MilestonesView.vue'),
    },
    {
      path: '/nearby-activities',
      name: 'nearby-activities',
      component: () => import('../views/NearbyActivitiesView.vue'),
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: () => import('../views/CalendarView.vue'),
    },
    {
      path: '/nearby-hospitals',
      name: 'nearby-hospitals',
      component: () => import('../views/NearbyHospitalsView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
    },
    {
      path: '/children',
      name: 'children',
      component: () => import('../views/ChildrenView.vue'),
    },
    {
      path: '/medications',
      name: 'medications',
      component: () => import('../views/MedicationsView.vue'),
    },
    {
      path: '/feeding',
      name: 'feeding',
      component: () => import('../views/FeedingView.vue'),
    },
    {
      path: '/ask-alfred',
      name: 'ask-alfred',
      component: () => import('../views/AskAlfredView.vue'),
    },
    {
      path: '/growth',
      name: 'growth',
      component: () => import('../views/GrowthView.vue'),
    },
    {
      path: '/symptoms',
      name: 'symptoms',
      component: () => import('../views/SymptomsView.vue'),
    },
    {
      path: '/quick-dose',
      name: 'quick-dose',
      component: () => import('../views/QuickDoseView.vue'),
    },
    {
      path: '/next-dose',
      name: 'next-dose',
      component: () => import('../views/NextDoseView.vue'),
    },
    {
      path: '/sleep',
      name: 'sleep',
      component: () => import('../views/SleepView.vue'),
    },
    {
      path: '/diaper',
      name: 'diaper',
      component: () => import('../views/DiaperView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
    },
  ],
})

const PUBLIC_ROUTES = new Set(['/login', '/register'])

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
    return '/login'
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
