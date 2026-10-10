<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { ShoppingBag } from 'lucide-vue-next'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import { useStorefrontCartStore } from '@/stores/storefrontCart'

const route = useRoute()
const cart = useStorefrontCartStore()
</script>

<template>
  <div class="storefront flex min-h-screen flex-col">
    <header class="sticky top-0 z-50 border-b border-line bg-ivory/95 backdrop-blur-md">
      <div class="sf-container flex h-16 items-center justify-between gap-4 lg:h-[5.25rem]">
        <RouterLink
          to="/store"
          class="sf-wordmark ps-[0.32em] text-[22px] md:text-[28px] rtl:ps-0"
        >
          {{ $t('shop.brand.wordmark') }}
        </RouterLink>
        <div class="flex items-center gap-3 text-ink">
          <LanguageSwitcher variant="minimal" />
          <RouterLink
            :to="`/shop/${route.params.slug}/checkout`"
            class="sf-icon-btn"
            :aria-label="$t('shop.nav.bagWithCount', { n: cart.lines.length })"
          >
            <ShoppingBag class="h-5 w-5" stroke-width="1.25" />
            <span v-if="cart.lines.length" class="sf-badge-count">{{ cart.lines.length }}</span>
          </RouterLink>
        </div>
      </div>
    </header>
    <main class="sf-container flex-1 pb-24 pt-10 md:pt-14">
      <RouterView />
    </main>
    <footer class="border-t border-line bg-cream">
      <div class="sf-container py-8 text-[11px] tracking-[0.04em] text-mute">{{ $t('shop.footer.copyright') }}</div>
    </footer>
  </div>
</template>
