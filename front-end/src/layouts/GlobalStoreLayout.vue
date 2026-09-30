<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useGlobalStoreCartStore } from '@/stores/globalStoreCart'
import { useCustomerAuthStore } from '@/stores/customerAuth'
import { ShoppingCart, Store, User } from 'lucide-vue-next'
import HomeHeroBanner from '@/components/storefront/HomeHeroBanner.vue'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import { getPublicHomeBanner } from '@/services/siteSettings'
import type { SiteSettings } from '@/types/api'

const { t } = useI18n()
const route = useRoute()
const cart = useGlobalStoreCartStore()
const customerAuth = useCustomerAuthStore()
const banner = ref<SiteSettings | null>(null)

onMounted(async () => {
  try {
    banner.value = await getPublicHomeBanner()
  } catch {
    banner.value = null
  }
})

const hero = computed(() => ({
  enabled: banner.value?.bannerEnabled ?? true,
  // API title/subtitle stay as stored; defaults follow the active locale.
  title: banner.value?.bannerTitle || t('shop.hero.defaultTitle'),
  subtitle: banner.value?.bannerSubtitle ?? t('shop.hero.defaultSubtitle'),
  images: banner.value?.images ?? [],
  intervalMs: banner.value?.bannerIntervalMs ?? 5000,
}))

const accountLabel = computed(() => {
  if (!customerAuth.customer) return t('shop.nav.signIn')
  const first = customerAuth.customer.name.trim().split(/\s+/)[0]
  return first || t('shop.nav.myOrders')
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <header class="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
        <RouterLink to="/store" class="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Store class="h-6 w-6" />
          <span>{{ $t('shop.brand.name') }}</span>
        </RouterLink>

        <div class="flex items-center gap-2">
          <LanguageSwitcher />

          <RouterLink
            :to="customerAuth.isAuthenticated ? '/store/account' : '/login'"
            class="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <User class="h-5 w-5" />
            <span class="hidden sm:inline">{{ accountLabel }}</span>
          </RouterLink>

          <RouterLink
            to="/store/checkout"
            class="relative flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ShoppingCart class="h-5 w-5" />
            <span class="hidden sm:inline">{{ $t('shop.nav.cart') }}</span>
            <span
              v-if="cart.itemCount > 0"
              class="absolute -end-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white"
            >
              {{ cart.itemCount }}
            </span>
          </RouterLink>
        </div>
      </div>
    </header>

    <HomeHeroBanner
      v-if="route.name === 'global-store-catalog'"
      :enabled="hero.enabled"
      :title="hero.title"
      :subtitle="hero.subtitle"
      :images="hero.images"
      :interval-ms="hero.intervalMs"
    />

    <main class="mx-auto w-full max-w-7xl px-6 py-8 md:px-8 md:py-12">
      <RouterView />
    </main>

    <footer class="mt-auto border-t border-gray-200 bg-white">
      <div class="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-gray-500 md:px-8">
        <p>{{ $t('shop.footer.copyright') }}</p>
        <div class="mt-2 flex items-center justify-center gap-4 text-xs">
          <RouterLink to="/login" class="hover:text-gray-700">{{ $t('shop.nav.myOrders') }}</RouterLink>
          <span>·</span>
          <a href="#" class="hover:text-gray-700">{{ $t('shop.footer.support') }}</a>
        </div>
      </div>
    </footer>
  </div>
</template>
