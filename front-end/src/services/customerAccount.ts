import axios from 'axios'
import router from '@/router'
import type { CustomerLoginResponse, CustomerOrder, CustomerProfile } from '@/types/api'

const TOKEN_KEY = 'customer_token'
const PROFILE_KEY = 'customer_profile'

const customerApi = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

customerApi.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

customerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(PROFILE_KEY)
      const path = router.currentRoute.value.path
      if (path.startsWith('/store/account')) {
        void router.push({ path: '/login', query: { next: path } })
      }
    }
    return Promise.reject(error)
  },
)

export type CustomerSession = CustomerLoginResponse

export async function loginCustomer(email: string, password: string) {
  const { data } = await customerApi.post<CustomerLoginResponse>('/account/login', { email, password })
  return data
}

export async function registerCustomer(name: string, email: string, phone: string, password: string) {
  const { data } = await customerApi.post<CustomerLoginResponse>('/account/register', {
    name,
    email,
    phone,
    password,
  })
  return data
}

export async function fetchCustomerMe() {
  const { data } = await customerApi.get<{ customer: CustomerProfile }>('/account/me')
  return data.customer
}

export async function listMyOrders() {
  const { data } = await customerApi.get<{ data: CustomerOrder[] }>('/account/orders')
  return data.data
}

export async function getMyOrder(orderId: string) {
  const { data } = await customerApi.get<{ data: CustomerOrder }>(`/account/orders/${orderId}`)
  return data.data
}
