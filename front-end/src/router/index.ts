import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCustomerAuthStore } from '@/stores/customerAuth'
import type { StaffPermission } from '@/types/api'
import AdminLayout from '@/layouts/AdminLayout.vue'
import PosLayout from '@/layouts/PosLayout.vue'
import StorefrontLayout from '@/layouts/StorefrontLayout.vue'
import GlobalStoreLayout from '@/layouts/GlobalStoreLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash }
    // Filter/sort changes on the same page keep the scroll position.
    if (to.path === from.path) return false
    return { top: 0 }
  },
  routes: [
    {
      path: '/login',
      component: GlobalStoreLayout,
      meta: { public: true },
      children: [
        { path: '', name: 'customer-login', component: () => import('@/views/global-store/AccountLoginView.vue') },
      ],
    },
    {
      path: '/staff/login',
      name: 'staff-login',
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
      meta: { requiresAuth: true, roles: ['OWNER', 'MANAGER', 'CASHIER'] },
      children: [
        { path: '', name: 'admin-dashboard', component: () => import('@/views/admin/DashboardView.vue'), meta: { permission: 'DASHBOARD_VIEW' } },
        { path: 'shops', name: 'admin-shops', component: () => import('@/views/admin/ShopsView.vue'), meta: { permission: 'SHOPS_MANAGE' } },
        { path: 'products', name: 'admin-products', component: () => import('@/views/admin/ProductsView.vue'), meta: { permission: 'PRODUCT_VIEW' } },
        { path: 'products/new', name: 'admin-product-create', component: () => import('@/views/admin/ProductCreateView.vue'), meta: { permission: 'PRODUCT_CREATE' } },
        { path: 'products/:familyId', name: 'admin-product-detail', component: () => import('@/views/admin/ProductDetailView.vue'), meta: { permission: 'PRODUCT_VIEW' } },
        { path: 'stock', name: 'admin-stock', component: () => import('@/views/admin/StockView.vue'), meta: { permission: 'STOCK_VIEW' } },
        { path: 'inbound', name: 'admin-inbound', component: () => import('@/views/admin/InboundTransferView.vue'), meta: { permission: 'INBOUND_VIEW' } },
        { path: 'orders', name: 'admin-orders', component: () => import('@/views/admin/OrdersView.vue'), meta: { permission: 'ORDER_VIEW' } },
        { path: 'orders/:orderId', name: 'admin-order-detail', component: () => import('@/views/admin/OrderDetailView.vue'), meta: { permission: 'ORDER_VIEW' } },
        { path: 'staff', name: 'admin-staff', component: () => import('@/views/admin/StaffView.vue'), meta: { permission: 'STAFF_MANAGE' } },
        { path: 'roles', name: 'admin-roles', component: () => import('@/views/admin/RolesView.vue'), meta: { roles: ['OWNER'] } },
        { path: 'clients', name: 'admin-clients', component: () => import('@/views/admin/ClientsView.vue'), meta: { permission: 'CLIENT_VIEW' } },
        { path: 'clients/:clientId', name: 'admin-client-profile', component: () => import('@/views/admin/ClientProfileView.vue'), meta: { permission: 'CLIENT_VIEW' } },
        { path: 'credit/reminders', name: 'admin-credit-reminders', component: () => import('@/views/admin/CreditRemindersView.vue'), meta: { permission: 'CREDIT_MANAGE' } },
        { path: 'charges', name: 'admin-charges', component: () => import('@/views/admin/ChargesView.vue'), meta: { permission: 'CHARGES_VIEW' } },
        { path: 'settings', name: 'admin-settings', component: () => import('@/views/admin/ShopSettingsView.vue'), meta: { permission: 'SETTINGS_MANAGE' } },
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
        {
          path: '',
          name: 'global-store-catalog',
          component: () => import('@/views/global-store/GlobalHomeView.vue'),
          // Old `/store?shop=…` links now land on the filterable listing.
          beforeEnter: (to) =>
            typeof to.query.shop === 'string' ? { name: 'global-store-shop', query: to.query } : true,
        },
        { path: 'shop', name: 'global-store-shop', component: () => import('@/views/global-store/GlobalCatalogView.vue') },
        { path: 'cart', name: 'global-store-cart', component: () => import('@/views/global-store/GlobalCartView.vue') },
        { path: 'wishlist', name: 'global-store-wishlist', component: () => import('@/views/global-store/GlobalWishlistView.vue') },
        { path: 'products/:productId', name: 'global-store-product', component: () => import('@/views/global-store/GlobalProductView.vue') },
        { path: 'checkout', name: 'global-store-checkout', component: () => import('@/views/global-store/GlobalCheckoutView.vue') },
        { path: 'confirmation', name: 'global-store-confirmation', component: () => import('@/views/global-store/GlobalOrderConfirmationView.vue') },
        { path: 'login', redirect: (to) => ({ path: '/login', query: to.query }) },
        {
          path: 'account',
          name: 'store-account',
          component: () => import('@/views/global-store/AccountOrdersView.vue'),
          meta: { requiresCustomerAuth: true },
        },
        {
          path: 'account/orders/:orderId',
          name: 'store-account-order',
          component: () => import('@/views/global-store/AccountOrderDetailView.vue'),
          meta: { requiresCustomerAuth: true },
        },
        {
          path: 'account/purchases/:saleId',
          name: 'store-account-purchase',
          component: () => import('@/views/global-store/AccountSaleDetailView.vue'),
          meta: { requiresCustomerAuth: true },
        },
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
  const customerAuth = useCustomerAuthStore()

  if (to.matched.some((record) => record.meta.requiresCustomerAuth) && !customerAuth.isAuthenticated) {
    const query: Record<string, string> = { next: to.fullPath }
    if (to.matched.some((record) => record.meta.customerCreate)) {
      query.create = '1'
    }
    return { path: '/login', query }
  }

  if (to.name === 'customer-login' && customerAuth.isAuthenticated) {
    const next = typeof to.query.next === 'string' ? to.query.next : ''
    if (next.startsWith('/store') || next.startsWith('/shop')) return next
    return '/store/account'
  }

  if (to.meta.public) return true

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return '/staff/login'
  }

  // Admin pages that declare a permission are closed to anyone whose role lacks it.
  if (auth.staff && to.path.startsWith('/admin')) {
    const permission = to.matched.at(-1)?.meta.permission as StaffPermission | undefined
    if (permission && !auth.can(permission)) return auth.homePath === to.path ? '/pos' : auth.homePath
  }

  const roles = to.meta.roles as string[] | undefined
  if (roles && auth.staff && !roles.includes(auth.staff.role)) {
    return auth.homePath
  }

  const childRoles = to.matched.at(-1)?.meta.roles as string[] | undefined
  if (childRoles && auth.staff && !childRoles.includes(auth.staff.role)) {
    return auth.homePath
  }

  return true
})

export default router
