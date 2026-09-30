import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginCustomer, registerCustomer, type CustomerSession } from '@/services/customerAccount'
import type { CustomerProfile } from '@/types/api'

const CUSTOMER_KEY = 'customer_profile'
const TOKEN_KEY = 'customer_token'

function loadCustomer(): CustomerProfile | null {
  const raw = localStorage.getItem(CUSTOMER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CustomerProfile
  } catch {
    return null
  }
}

export const useCustomerAuthStore = defineStore('customerAuth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const customer = ref<CustomerProfile | null>(loadCustomer())

  const isAuthenticated = computed(() => !!token.value && !!customer.value)

  function setSession(data: CustomerSession) {
    token.value = data.token
    customer.value = data.customer
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(data.customer))
  }

  function clearSession() {
    token.value = null
    customer.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(CUSTOMER_KEY)
  }

  async function login(email: string, password: string) {
    const data = await loginCustomer(email, password)
    setSession(data)
    return data
  }

  async function register(name: string, email: string, phone: string, password: string) {
    const data = await registerCustomer(name, email, phone, password)
    setSession(data)
    return data
  }

  function logout() {
    clearSession()
  }

  return {
    token,
    customer,
    isAuthenticated,
    login,
    register,
    logout,
    setSession,
    clearSession,
  }
})
