import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AdminLayout from '@/layouts/AdminLayout.vue'
import PosLayout from '@/layouts/PosLayout.vue'
import StorefrontLayout from '@/layouts/StorefrontLayout.vue'
import GlobalStoreLayout from '@/layouts/GlobalStoreLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/sso',
      name: 'sso',
      component: () => import('@/views/auth/SsoExchangeView.vue'),
      meta: { public: true },
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, roles: ['OWNER', 'MANAGER'] },
      children: [
        { path: '', name: 'admin-dashboard', component: () => import('@/views/admin/DashboardView.vue') },
        { path: 'shops', name: 'admin-shops', component: () => import('@/views/admin/ShopsView.vue') },
        { path: 'products', name: 'admin-products', component: () => import('@/views/admin/ProductsView.vue') },
        { path: 'stock', name: 'admin-stock', component: () => import('@/views/admin/StockView.vue') },
        { path: 'inbound', name: 'admin-inbound', component: () => import('@/views/admin/InboundTransferView.vue') },
        { path: 'orders', name: 'admin-orders', component: () => import('@/views/admin/OrdersView.vue') },
        { path: 'staff', name: 'admin-staff', component: () => import('@/views/admin/StaffView.vue') },
        { path: 'clients', name: 'admin-clients', component: () => import('@/views/admin/ClientsView.vue') },
        { path: 'clients/:clientId', name: 'admin-client-profile', component: () => import('@/views/admin/ClientProfileView.vue') },
        { path: 'credit/reminders', name: 'admin-credit-reminders', component: () => import('@/views/admin/CreditRemindersView.vue') },
        { path: 'charges', name: 'admin-charges', component: () => import('@/views/admin/ChargesView.vue') },
        { path: 'settings', name: 'admin-settings', component: () => import('@/views/admin/ShopSettingsView.vue') },
        { path: 'network', name: 'admin-network', component: () => import('@/views/admin/NetworkOverviewView.vue'), meta: { roles: ['OWNER'] } },
      ],
    },
    {
      path: '/pos',
      component: PosLayout,
      meta: { requiresAuth: true, roles: ['OWNER', 'MANAGER', 'CASHIER'] },
      children: [
        { path: '', name: 'pos-register', component: () => import('@/views/pos/RegisterView.vue') },
        { path: 'orders', name: 'pos-orders', component: () => import('@/views/pos/PosOrdersView.vue') },
        { path: 'credits', name: 'pos-credits', component: () => import('@/views/pos/PosCreditsView.vue') },
        { path: 'history', name: 'pos-history', component: () => import('@/views/pos/SalesHistoryView.vue') },
      ],
    },
    {
      path: '/shop/:slug',
      component: StorefrontLayout,
      meta: { public: true },
      children: [
        { path: '', name: 'storefront-catalog', component: () => import('@/views/storefront/CatalogView.vue') },
        { path: 'checkout', name: 'storefront-checkout', component: () => import('@/views/storefront/CheckoutView.vue') },
        { path: 'confirmation/:orderNumber', name: 'storefront-confirmation', component: () => import('@/views/storefront/OrderConfirmationView.vue') },
      ],
    },
    {
      path: '/store',
      component: GlobalStoreLayout,
      meta: { public: true },
      children: [
        { path: '', name: 'global-store-catalog', component: () => import('@/views/global-store/GlobalCatalogView.vue') },
        { path: 'checkout', name: 'global-store-checkout', component: () => import('@/views/global-store/GlobalCheckoutView.vue') },
        { path: 'confirmation', name: 'global-store-confirmation', component: () => import('@/views/global-store/GlobalOrderConfirmationView.vue') },
      ],
    },
    {
      path: '/',
      redirect: '/store',
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.public) return true

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return '/login'
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles && auth.staff && !roles.includes(auth.staff.role)) {
    if (auth.staff.role === 'CASHIER') return '/pos'
    return '/login'
  }

  const childRoles = to.matched.at(-1)?.meta.roles as string[] | undefined
  if (childRoles && auth.staff && !childRoles.includes(auth.staff.role)) {
    return '/admin'
  }

  return true
})

export default router
