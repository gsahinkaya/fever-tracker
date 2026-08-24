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

export default router
