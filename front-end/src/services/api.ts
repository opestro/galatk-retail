import axios from 'axios'
import router from '@/router'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
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
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_staff')
      const path = router.currentRoute.value.path
      const isCustomerStorefront = path.startsWith('/store') || path.startsWith('/shop')
      if (path !== '/login' && !path.startsWith('/sso') && !isCustomerStorefront) {
        router.push('/login')
      }
    }
    return Promise.reject(error)
  },
)

export { api }
