<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerAuthStore } from '@/stores/customerAuth'
import { normalizeAlgerianPhone, validateCustomerName } from '@/utils/algerianPhone'
import { normalizeEmail } from '@/utils/email'
import { MIN_CUSTOMER_PASSWORD_LENGTH } from '@/utils/guestCheckout'
import axios from 'axios'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const customerAuth = useCustomerAuthStore()

const mode = ref<'login' | 'register'>(route.query.create === '1' ? 'register' : 'login')
const name = ref('')
const email = ref(customerAuth.customer?.email ?? '')
const phone = ref(customerAuth.customer?.phone ?? '')
const password = ref('')
const passwordConfirm = ref('')
const error = ref('')
const submitting = ref(false)

watch(
  () => route.query.create,
  (create) => {
    mode.value = create === '1' ? 'register' : mode.value
  },
)

const nextPath = computed(() => {
  const raw = route.query.next
  if (typeof raw === 'string' && (raw.startsWith('/store') || raw.startsWith('/shop'))) {
    return raw
  }
  return '/store/account'
})

function switchMode(next: 'login' | 'register') {
  mode.value = next
  error.value = ''
}

async function submit() {
  error.value = ''
  const canonicalEmail = normalizeEmail(email.value)
  if (!canonicalEmail) {
    error.value = t('shop.auth.errorEmail')
    return
  }
  if (password.value.length < MIN_CUSTOMER_PASSWORD_LENGTH) {
    error.value = t('shop.auth.errorPasswordLength', { n: MIN_CUSTOMER_PASSWORD_LENGTH })
    return
  }

  submitting.value = true
  try {
    if (mode.value === 'register') {
      if (!validateCustomerName(name.value)) {
        error.value = t('shop.auth.errorName')
        submitting.value = false
        return
      }
      const canonicalPhone = normalizeAlgerianPhone(phone.value)
      if (!canonicalPhone) {
        error.value = t('shop.auth.errorPhone')
        submitting.value = false
        return
      }
      if (password.value !== passwordConfirm.value) {
        error.value = t('shop.auth.errorPasswordMatch')
        submitting.value = false
        return
      }
      await customerAuth.register(name.value.trim(), canonicalEmail, canonicalPhone, password.value)
    } else {
      await customerAuth.login(canonicalEmail, password.value)
    }
    await router.replace(nextPath.value)
  } catch (err) {
    if (axios.isAxiosError(err)) {
      error.value = (err.response?.data?.message as string) || t('shop.auth.errorGeneric')
    } else {
      error.value = t('shop.auth.errorGeneric')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold text-gray-900">
        {{ mode === 'register' ? $t('shop.auth.registerTitle') : $t('shop.auth.signInTitle') }}
      </h1>
      <p class="mt-1 text-sm text-gray-600">
        {{
          mode === 'register'
            ? $t('shop.auth.registerSubtitle')
            : $t('shop.auth.loginSubtitle')
        }}
      </p>
    </div>

    <div class="grid grid-cols-2 rounded-lg border border-gray-200 bg-white p-1">
      <button
        type="button"
        class="rounded-md px-3 py-2 text-sm font-medium"
        :class="mode === 'login' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'"
        @click="switchMode('login')"
      >
        {{ $t('shop.auth.signIn') }}
      </button>
      <button
        type="button"
        class="rounded-md px-3 py-2 text-sm font-medium"
        :class="mode === 'register' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'"
        @click="switchMode('register')"
      >
        {{ $t('shop.auth.createAccount') }}
      </button>
    </div>

    <form class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5" @submit.prevent="submit">
      <label v-if="mode === 'register'" class="flex flex-col gap-1.5">
        <span class="text-sm text-gray-700">{{ $t('shop.auth.fullName') }}</span>
        <input v-model="name" type="text" autocomplete="name" class="input" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-sm text-gray-700">{{ $t('shop.auth.email') }}</span>
        <input v-model="email" type="email" autocomplete="email" class="input" />
      </label>
      <label v-if="mode === 'register'" class="flex flex-col gap-1.5">
        <span class="text-sm text-gray-700">{{ $t('shop.auth.phone') }}</span>
        <input v-model="phone" type="tel" autocomplete="tel" :placeholder="$t('shop.auth.phonePlaceholder')" class="input" />
      </label>
      <label class="flex flex-col gap-1.5">
        <span class="text-sm text-gray-700">{{ $t('shop.auth.password') }}</span>
        <input
          v-model="password"
          type="password"
          :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
          class="input"
        />
      </label>
      <label v-if="mode === 'register'" class="flex flex-col gap-1.5">
        <span class="text-sm text-gray-700">{{ $t('shop.auth.confirmPassword') }}</span>
        <input v-model="passwordConfirm" type="password" autocomplete="new-password" class="input" />
      </label>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="submitting">
        {{
          submitting
            ? mode === 'register'
              ? $t('shop.auth.creatingAccount')
              : $t('shop.auth.signingIn')
            : mode === 'register'
              ? $t('shop.auth.createAccount')
              : $t('shop.auth.signIn')
        }}
      </button>
    </form>
  </div>
</template>
