import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/services/api'
import type { LoginResponse, StaffPermission, StaffProfile } from '@/types/api'

const STAFF_KEY = 'auth_staff'
const TOKEN_KEY = 'auth_token'
/** The active shop survives reloads; the API returns `shopIds` in no fixed order. */
const SHOP_KEY = 'auth_selected_shop'

function loadSelectedShop(staff: StaffProfile | null): string | null {
  const saved = localStorage.getItem(SHOP_KEY)
  if (saved && staff?.shopIds.includes(saved)) return saved
  return staff?.shopIds[0] ?? null
}

function loadStaff(): StaffProfile | null {
  const raw = localStorage.getItem(STAFF_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StaffProfile
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const staff = ref<StaffProfile | null>(loadStaff())
  const selectedShopId = ref<string | null>(loadSelectedShop(staff.value))

  const isAuthenticated = computed(() => !!token.value && !!staff.value)

  function setSession(data: LoginResponse) {
    token.value = data.token
    staff.value = data.staff
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(STAFF_KEY, JSON.stringify(data.staff))
    if (!selectedShopId.value || !data.staff.shopIds.includes(selectedShopId.value)) {
      selectedShopId.value = loadSelectedShop(data.staff)
    }
  }

  function clearSession() {
    token.value = null
    staff.value = null
    selectedShopId.value = null
    localStorage.removeItem(SHOP_KEY)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(STAFF_KEY)
  }

  async function login(email: string, password: string) {
    const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
    setSession(data)
    return data
  }

  async function fetchMe() {
    const { data } = await api.get<{ staff: StaffProfile }>('/auth/me')
    staff.value = data.staff
    localStorage.setItem(STAFF_KEY, JSON.stringify(data.staff))
    if (!selectedShopId.value || !data.staff.shopIds.includes(selectedShopId.value)) {
      selectedShopId.value = loadSelectedShop(data.staff)
    }
  }

  function logout() {
    clearSession()
  }

  function selectShop(shopId: string) {
    selectedShopId.value = shopId
    localStorage.setItem(SHOP_KEY, shopId)
  }

  const isOwner = computed(() => staff.value?.role === 'OWNER')
  const isManager = computed(() => staff.value?.role === 'MANAGER' || isOwner.value)
  const isCashier = computed(() => !!staff.value)

  /** Owners hold every permission; everyone else only what their role grants. */
  function can(permission: StaffPermission): boolean {
    if (isOwner.value) return true
    return !!staff.value?.permissions?.includes(permission)
  }
  const canManageCatalog = computed(() => can('PRODUCT_VIEW'))
  const canEditPrice = computed(() => can('SALE_EDIT_PRICE'))
  const canGiveDiscount = computed(() => can('SALE_DISCOUNT'))
  const canPayLater = computed(() => can('SALE_PAY_LATER'))

  /** Admin pages in menu order, with the permission each one needs. */
  const ADMIN_LANDING: Array<[string, StaffPermission]> = [
    ['/admin', 'DASHBOARD_VIEW'],
    ['/admin/orders', 'ORDER_VIEW'],
    ['/admin/products', 'PRODUCT_VIEW'],
    ['/admin/stock', 'STOCK_VIEW'],
    ['/admin/inbound', 'INBOUND_VIEW'],
    ['/admin/clients', 'CLIENT_VIEW'],
    ['/admin/charges', 'CHARGES_VIEW'],
    ['/admin/shops', 'SHOPS_MANAGE'],
    ['/admin/staff', 'STAFF_MANAGE'],
    ['/admin/settings', 'SETTINGS_MANAGE'],
  ]
  /** First admin page this person may open, or null when they have none. */
  const adminHome = computed(() => ADMIN_LANDING.find(([, p]) => can(p))?.[0] ?? null)
  /** Where to send someone right after sign-in. */
  const homePath = computed(() => adminHome.value ?? '/pos')

  return {
    token,
    staff,
    selectedShopId,
    isAuthenticated,
    isOwner,
    isManager,
    isCashier,
    can,
    canManageCatalog,
    canEditPrice,
    canGiveDiscount,
    canPayLater,
    adminHome,
    homePath,
    login,
    fetchMe,
    logout,
    selectShop,
    setSession,
    clearSession,
  }
})
