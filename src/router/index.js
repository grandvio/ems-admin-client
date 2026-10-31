import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'
import { installMenus } from './dynamic'
import { pageMap } from './pages'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/LoginView.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      name: 'layout',
      component: () => import('@/layouts/AdminLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/dashboard/DashboardView.vue'),
          meta: { title: '工作台' }
        }
      ]
    }
  ]
})

router.beforeEach(async (to) => {
  const user = useUserStore()
  if (to.meta.public) {
    if (to.path === '/login' && user.token) return '/dashboard'
    return true
  }
  if (!getToken()) {
    user.reset(router)
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (!user.loaded) {
    try {
      const info = await user.loadInfo()
      installMenus(router, info.menus || [], pageMap)
      return { path: to.fullPath, replace: true }
    } catch {
      user.reset(router)
      return '/login'
    }
  }
  return true
})

export default router
