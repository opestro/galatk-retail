<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import { useGlobalCatalogStore } from '@/stores/globalCatalog'
import { useCustomerAuthStore } from '@/stores/customerAuth'

const catalog = useGlobalCatalogStore()
const customerAuth = useCustomerAuthStore()
const footerCategories = computed(() => catalog.categories.slice(0, 5))
</script>

<template>
  <footer class="mt-auto bg-ink text-ivory/75">
    <div class="sf-container grid grid-cols-2 gap-x-6 gap-y-14 py-20 md:grid-cols-12 md:py-28">
      <div class="col-span-2 md:col-span-5">
        <RouterLink
          to="/store"
          class="sf-wordmark text-[30px] text-ivory md:text-[34px]"
        >
          {{ $t('shop.brand.wordmark') }}
        </RouterLink>
        <p class="mt-6 max-w-xs text-[13px] leading-[1.8] text-ivory/65">{{ $t('shop.footer.tagline') }}</p>
      </div>

      <nav class="md:col-span-3" :aria-label="$t('shop.footer.shopHeading')">
        <p class="sf-eyebrow text-ivory/60">{{ $t('shop.footer.shopHeading') }}</p>
        <ul class="mt-6 flex flex-col gap-3.5 text-[13px] text-ivory/85">
          <li><RouterLink :to="{ name: 'global-store-shop' }" class="transition-colors hover:text-ivory">{{ $t('shop.nav.shopAll') }}</RouterLink></li>
          <li>
            <RouterLink :to="{ name: 'global-store-shop', query: { sort: 'new' } }" class="transition-colors hover:text-ivory">
              {{ $t('shop.nav.newIn') }}
            </RouterLink>
          </li>
          <li v-for="category in footerCategories" :key="category.name">
            <RouterLink :to="{ name: 'global-store-shop', query: { category: category.name } }" class="transition-colors hover:text-ivory">
              {{ category.name }}
            </RouterLink>
          </li>
        </ul>
      </nav>

      <nav class="md:col-span-4" :aria-label="$t('shop.footer.accountHeading')">
        <p class="sf-eyebrow text-ivory/60">{{ $t('shop.footer.accountHeading') }}</p>
        <ul class="mt-6 flex flex-col gap-3.5 text-[13px] text-ivory/85">
          <li>
            <RouterLink :to="customerAuth.isAuthenticated ? '/store/account' : '/login'" class="transition-colors hover:text-ivory">
              {{ customerAuth.isAuthenticated ? $t('shop.nav.myOrders') : $t('shop.nav.signIn') }}
            </RouterLink>
          </li>
          <li><RouterLink :to="{ name: 'global-store-wishlist' }" class="transition-colors hover:text-ivory">{{ $t('shop.nav.wishlist') }}</RouterLink></li>
          <li><RouterLink :to="{ name: 'global-store-cart' }" class="transition-colors hover:text-ivory">{{ $t('shop.nav.cart') }}</RouterLink></li>
        </ul>
      </nav>
    </div>
    <div class="border-t border-ivory/15">
      <div class="sf-container flex flex-col items-start justify-between gap-3 py-6 text-[11px] tracking-[0.04em] text-ivory/60 sm:flex-row sm:items-center">
        <p>{{ $t('shop.footer.copyright') }}</p>
        <div class="text-ivory">
          <LanguageSwitcher variant="minimal" placement="top" />
        </div>
      </div>
    </div>
  </footer>
</template>
