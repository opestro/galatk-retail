<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const auth = useAuthStore()
const router = useRouter()

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const data = await auth.login(email.value, password.value)
    if (data.staff.role === 'CASHIER') {
      await router.push('/pos')
    } else {
      await router.push('/admin')
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-white p-6">
    <form class="flex w-full max-w-sm flex-col gap-5 rounded-lg border border-gray-200 p-8" @submit.prevent="handleSubmit">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-semibold text-gray-900">Sign in</h1>
        <p class="text-sm text-gray-500">Galatk Retail staff portal</p>
      </div>

      <div class="flex flex-col gap-4">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
          <input v-model="email" type="email" required class="input" />
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
          <input v-model="password" type="password" required class="input" />
        </div>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <button type="submit" :disabled="loading" class="btn-primary w-full">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>
