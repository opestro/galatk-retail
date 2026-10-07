<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Heart, Menu, Search, ShoppingBag, User } from 'lucide-vue-next'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import SearchOverlay from '@/components/storefront/SearchOverlay.vue'
import MobileNavDrawer from '@/components/storefront/MobileNavDrawer.vue'
import { useGlobalStoreCartStore } from '@/stores/globalStoreCart'
import { useCustomerAuthStore } from '@/stores/customerAuth'
import { useWishlistStore } from '@/stores/wishlist'
import { useGlobalCatalogStore } from '@/stores/globalCatalog'

const { t } = useI18n()
const route = useRoute()
const cart = useGlobalStoreCartStore()
const customerAuth = useCustomerAuthStore()
const wishlist = useWishlistStore()
const catalog = useGlobalCatalogStore()

const searchOpen = ref(false)
const menuOpen = ref(false)
const scrolled = ref(false)
const bagPulse = ref(0)

/** Header nav shows the four largest categories; the rest live in the drawer/search. */
const navCategories = computed(() => catalog.categories.slice(0, 4))

const accountTo = computed(() => (customerAuth.isAuthenticated ? '/store/account' : '/login'))
const accountLabel = computed(() => {
  if (!customerAuth.customer) return t('shop.nav.signIn')
  const first = customerAuth.customer.name.trim().split(/\s+/)[0]
  return first || t('shop.nav.myOrders')
})

function isActiveCategory(name: string) {
  return route.name === 'global-store-shop' && route.query.category === name
}

const shopAllActive = computed(
  () => route.name === 'global-store-shop' && !route.query.category && route.query.sort !== 'new',
)
const newInActive = computed(() => route.name === 'global-store-shop' && route.query.sort === 'new')

function onScroll() {
  scrolled.value = window.scrollY > 8
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
    searchOpen.value = false
  },
)

watch(
  () => cart.lastAdded?.at,
  (at) => {
    if (at) bagPulse.value += 1
  },
)
</script>

<template>
  <a
    href="#main"
    class="sr-only z-[90] bg-ink px-4 py-2 text-sm text-ivory focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
  >
    {{ $t('shop.nav.skipToContent') }}
  </a>

  <!-- Announcement bar -->
  <div class="bg-ink text-ivory">
    <div class="sf-container grid min-h-9 grid-cols-1 items-center py-2 md:grid-cols-[1fr_auto_1fr] md:py-0">
      <span class="hidden md:block" aria-hidden="true" />
      <p class="text-center font-label text-[10px] uppercase leading-snug tracking-[0.22em] text-ivory/90 rtl:text-[12px] rtl:tracking-normal">
        {{ $t('shop.announce.message') }}
      </p>
      <div class="hidden justify-self-end md:block">
        <LanguageSwitcher variant="minimal" />
      </div>
    </div>
  </div>

  <header
    class="sticky top-0 z-50 border-b bg-ivory/95 backdrop-blur-md transition-colors duration-300"
    :class="scrolled ? 'border-line' : 'border-transparent'"
  >
    <div class="sf-container grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 lg:h-[5.25rem]">
      <!-- Start: mobile menu+search / desktop nav -->
      <div class="flex items-center gap-1 lg:hidden">
        <button type="button" class="sf-icon-btn -ms-2" :aria-label="$t('shop.nav.menu')" :aria-expanded="menuOpen" @click="menuOpen = true">
          <Menu class="h-5 w-5" stroke-width="1.25" />
        </button>
        <button type="button" class="sf-icon-btn" :aria-label="$t('shop.nav.search')" @click="searchOpen = true">
          <Search class="h-5 w-5" stroke-width="1.25" />
        </button>
      </div>
      <nav class="hidden lg:block" :aria-label="$t('shop.nav.primary')">
        <ul class="flex items-center gap-8 font-label text-[11px] font-medium uppercase tracking-[0.18em] text-ink rtl:text-[14px] rtl:tracking-normal">
          <li>
            <RouterLink
              :to="{ name: 'global-store-shop' }"
              class="nav-link"
              :class="{ 'is-active': shopAllActive }"
            >
              {{ $t('shop.nav.shopAll') }}
            </RouterLink>
          </li>
          <li>
            <RouterLink
              :to="{ name: 'global-store-shop', query: { sort: 'new' } }"
              class="nav-link"
              :class="{ 'is-active': newInActive }"
            >
              {{ $t('shop.nav.newIn') }}
            </RouterLink>
          </li>
          <li
            v-for="(category, i) in navCategories"
            :key="category.name"
            :class="i >= 3 ? 'hidden 2xl:block' : i >= 1 ? 'hidden xl:block' : ''"
          >
            <RouterLink
              :to="{ name: 'global-store-shop', query: { category: category.name } }"
              class="nav-link"
              :class="{ 'is-active': isActiveCategory(category.name) }"
            >
              {{ category.name }}
            </RouterLink>
          </li>
        </ul>
      </nav>

      <!-- Wordmark -->
      <RouterLink
        to="/store"
        class="sf-wordmark justify-self-center ps-[0.32em] text-[22px] md:text-[28px] rtl:ps-0"
      >
        {{ $t('shop.brand.wordmark') }}
      </RouterLink>

      <!-- End: search + actions -->
      <div class="flex items-center justify-end gap-1 md:gap-2">
        <button
          type="button"
          class="me-3 hidden h-11 min-w-44 cursor-pointer items-center gap-3 border-b border-ink/25 text-start font-label text-[11px] uppercase tracking-[0.18em] text-mute transition-colors hover:border-ink hover:text-ink xl:flex rtl:text-[13px] rtl:tracking-normal"
          @click="searchOpen = true"
        >
          <Search class="h-4 w-4 text-ink" stroke-width="1.25" />
          {{ $t('shop.nav.search') }}
        </button>
        <button
          type="button"
          class="sf-icon-btn hidden lg:inline-flex xl:hidden"
          :aria-label="$t('shop.nav.search')"
          @click="searchOpen = true"
        >
          <Search class="h-5 w-5" stroke-width="1.25" />
        </button>
        <RouterLink
          :to="{ name: 'global-store-wishlist' }"
          class="sf-icon-btn"
          :aria-label="$t('shop.nav.wishlistWithCount', { n: wishlist.count })"
        >
          <Heart class="h-5 w-5" stroke-width="1.25" />
          <span v-if="wishlist.count" class="sf-badge-count">{{ wishlist.count }}</span>
        </RouterLink>
        <RouterLink
          :to="{ name: 'global-store-cart' }"
          class="sf-icon-btn"
          :aria-label="$t('shop.nav.bagWithCount', { n: cart.itemCount })"
        >
          <ShoppingBag class="h-5 w-5" stroke-width="1.25" />
          <span v-if="cart.itemCount" :key="bagPulse" class="sf-badge-count sf-pop">{{ cart.itemCount }}</span>
        </RouterLink>
        <RouterLink
          :to="accountTo"
          class="sf-icon-btn hidden md:inline-flex"
          :aria-label="accountLabel"
          :title="accountLabel"
        >
          <User class="h-5 w-5" stroke-width="1.25" />
        </RouterLink>
      </div>
    </div>
  </header>

  <SearchOverlay :open="searchOpen" @close="searchOpen = false" />
  <MobileNavDrawer
    :open="menuOpen"
    :categories="catalog.categories"
    :account-to="accountTo"
    :account-label="accountLabel"
    :bag-count="cart.itemCount"
    :wishlist-count="wishlist.count"
    @close="menuOpen = false"
  />
</template>

<style scoped>
.nav-link {
  position: relative;
  padding-block: 0.5rem;
  transition: opacity 0.2s;
}

.nav-link::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  bottom: 0.1rem;
  height: 1px;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.35s var(--ease-store);
}

/* Underline draws from the reading-start edge. */
:global(html[dir='rtl']) .nav-link::after {
  transform-origin: right;
}

.nav-link:hover::after,
.nav-link.is-active::after {
  transform: scaleX(1);
}
</style>
