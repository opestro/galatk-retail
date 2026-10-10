<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerAuthStore } from '@/stores/customerAuth'
import { normalizeAlgerianPhone, validateCustomerName } from '@/utils/algerianPhone'
import { normalizeEmail } from '@/utils/email'
import { MIN_CUSTOMER_PASSWORD_LENGTH } from '@/utils/guestCheckout'
import axios from 'axios'
import { Check } from 'lucide-vue-next'
import { useGlobalCatalogStore } from '@/stores/globalCatalog'
import { primaryImageUrl } from '@/utils/storeCatalog'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const customerAuth = useCustomerAuthStore()
const catalog = useGlobalCatalogStore()
void catalog.load()

/** Editorial side image: first product with photography. */
const sideImage = computed(() => {
  const product = catalog.products.find((item) => item.images.length > 0)
  return product ? primaryImageUrl(product) : null
})

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
  <div class="grid min-h-[calc(100dvh-7.5rem)] lg:grid-cols-2">
    <div class="relative hidden overflow-hidden bg-cream lg:block">
      <img v-if="sideImage" :src="sideImage" alt="" class="absolute inset-0 h-full w-full object-cover" />
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/50 to-transparent p-14 pt-40 text-ivory">
        <p class="sf-eyebrow text-ivory/85">{{ $t('shop.auth.eyebrow') }}</p>
        <ul class="mt-6 flex flex-col gap-3.5 font-display text-2xl font-light rtl:text-xl">
          <li class="flex items-center gap-3"><Check class="h-4 w-4 shrink-0" />{{ $t('shop.auth.perkOrders') }}</li>
          <li class="flex items-center gap-3"><Check class="h-4 w-4 shrink-0" />{{ $t('shop.auth.perkFaster') }}</li>
          <li class="flex items-center gap-3"><Check class="h-4 w-4 shrink-0" />{{ $t('shop.auth.perkCredit') }}</li>
        </ul>
      </div>
    </div>

    <div class="flex items-center justify-center px-5 py-16 sm:px-8 md:py-24">
      <div class="w-full max-w-md">
        <p class="sf-eyebrow">{{ $t('shop.auth.eyebrow') }}</p>
        <!-- Heading crossfades between sign-in and create-account. -->
        <Transition name="sf-fade" mode="out-in">
          <div :key="mode">
            <h1 class="sf-display mt-4 text-5xl md:text-6xl rtl:text-4xl rtl:md:text-5xl">
              {{ mode === 'register' ? $t('shop.auth.registerTitle') : $t('shop.auth.signInTitle') }}
            </h1>
            <p class="mt-4 text-[15px] leading-relaxed text-mute">
              {{ mode === 'register' ? $t('shop.auth.registerSubtitle') : $t('shop.auth.loginSubtitle') }}
            </p>
          </div>
        </Transition>

        <div class="mt-10 grid grid-cols-2 border-b border-line" role="tablist">
          <button
            type="button"
            role="tab"
            :aria-selected="mode === 'login'"
            class="sf-tab -mb-px justify-center py-3"
            :class="{ 'sf-tab-active': mode === 'login' }"
            @click="switchMode('login')"
          >
            {{ $t('shop.auth.signIn') }}
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="mode === 'register'"
            class="sf-tab -mb-px justify-center py-3"
            :class="{ 'sf-tab-active': mode === 'register' }"
            @click="switchMode('register')"
          >
            {{ $t('shop.auth.createAccount') }}
          </button>
        </div>

        <form class="mt-10 flex flex-col gap-6" novalidate @submit.prevent="submit">
          <label v-if="mode === 'register'" class="flex flex-col gap-1.5">
            <span class="sf-label">{{ $t('shop.auth.fullName') }}</span>
            <input v-model="name" type="text" autocomplete="name" class="sf-input" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="sf-label">{{ $t('shop.auth.email') }}</span>
            <input v-model="email" type="email" autocomplete="email" inputmode="email" class="sf-input" />
          </label>
          <label v-if="mode === 'register'" class="flex flex-col gap-1.5">
            <span class="sf-label">{{ $t('shop.auth.phone') }}</span>
            <input v-model="phone" type="tel" inputmode="tel" autocomplete="tel" :placeholder="$t('shop.auth.phonePlaceholder')" class="sf-input" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="sf-label">{{ $t('shop.auth.password') }}</span>
            <input
              v-model="password"
              type="password"
              :autocomplete="mode === 'register' ? 'new-password' : 'current-password'"
              class="sf-input"
            />
          </label>
          <label v-if="mode === 'register'" class="flex flex-col gap-1.5">
            <span class="sf-label">{{ $t('shop.auth.confirmPassword') }}</span>
            <input v-model="passwordConfirm" type="password" autocomplete="new-password" class="sf-input" />
          </label>
          <p v-if="error" class="border-s border-alert bg-paper px-4 py-3 text-sm text-alert" role="alert">{{ error }}</p>
          <button type="submit" class="sf-btn mt-2 w-full" :disabled="submitting">
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
    </div>
  </div>
</template>
