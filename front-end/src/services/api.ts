import axios from 'axios'
import router from '@/router'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const url = config.url ?? ''
  const customerToken = localStorage.getItem('customer_token')
  const staffToken = localStorage.getItem('auth_token')
  const preferCustomer =
    Boolean(customerToken) &&
    (url.includes('/account') || /\/(global-store|storefront\/[^/]+)\/checkout/.test(url))

  if (preferCustomer && customerToken) {
    config.headers.Authorization = `Bearer ${customerToken}`
  } else if (staffToken && !preferCustomer) {
    config.headers.Authorization = `Bearer ${staffToken}`
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = String(error.config?.url ?? '')
      const isCustomerRequest =
        url.includes('/account') || /\/(global-store|storefront\/[^/]+)\/checkout/.test(url)
      if (isCustomerRequest) {
        return Promise.reject(error)
      }
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_staff')
      const path = router.currentRoute.value.path
      const isCustomerStorefront = path.startsWith('/store') || path.startsWith('/shop')
      if (path !== '/staff/login' && path !== '/login' && !path.startsWith('/sso') && !isCustomerStorefront) {
        router.push('/staff/login')
      }
    }
    return Promise.reject(error)
  },
)

export { api }
