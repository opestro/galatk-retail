<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/services/api'
import type { LoginResponse } from '@/types/api'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const status = ref<'loading' | 'error'>('loading')
const errorMessage = ref('')

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  if (!code) {
    status.value = 'error'
    errorMessage.value = 'Missing SSO code'
    return
  }

  try {
    const { data } = await api.post<LoginResponse>('/auth/sso/exchange', { code })
    auth.setSession(data)
    await router.replace(data.staff.role === 'CASHIER' ? '/pos' : '/admin')
  } catch (e: unknown) {
    status.value = 'error'
    const ax = e as { response?: { data?: { message?: string } }; message?: string }
    errorMessage.value =
      ax.response?.data?.message ?? ax.message ?? 'SSO sign-in failed'
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-white p-6">
    <div class="w-full max-w-sm rounded-lg border border-gray-200 p-8 text-center">
      <h1 class="text-lg font-semibold text-gray-900">Galatk Retail</h1>
      <p v-if="status === 'loading'" class="mt-4 text-sm text-gray-500">Signing you in…</p>
      <template v-else>
        <p class="mt-4 text-sm text-red-600">{{ errorMessage }}</p>
        <RouterLink to="/login" class="mt-4 inline-flex text-sm font-medium text-gray-900 underline">
          Sign in
        </RouterLink>
      </template>
    </div>
  </div>
</template>
