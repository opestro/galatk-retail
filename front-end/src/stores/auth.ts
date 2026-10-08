import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '@/services/api'
import type { LoginResponse, StaffProfile } from '@/types/api'

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

  return {
    token,
    staff,
    selectedShopId,
    isAuthenticated,
    isOwner,
    isManager,
    isCashier,
    login,
    fetchMe,
    logout,
    selectShop,
    setSession,
    clearSession,
  }
})
