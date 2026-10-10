<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowRight, ArrowUpRight, MapPin, PackageCheck, RefreshCw, Store, Truck } from 'lucide-vue-next'
import HomeHeroBanner from '@/components/storefront/HomeHeroBanner.vue'
import StoreProductCard from '@/components/storefront/StoreProductCard.vue'
import StoreProductGridSkeleton from '@/components/storefront/StoreProductGridSkeleton.vue'
import StoreEmptyState from '@/components/storefront/StoreEmptyState.vue'
import { getPublicHomeBanner } from '@/services/siteSettings'
import { useGlobalCatalogStore } from '@/stores/globalCatalog'
import { useCustomerAuthStore } from '@/stores/customerAuth'
import type { PublicCatalogProductSummary } from '@/services/globalStore'
import type { SiteSettings } from '@/types/api'
import { primaryImageUrl, sortProducts } from '@/utils/storeCatalog'

const { t } = useI18n()
const catalog = useGlobalCatalogStore()
const customerAuth = useCustomerAuthStore()
const banner = ref<SiteSettings | null>(null)

onMounted(async () => {
  void catalog.load()
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
  subtitle: banner.value?.bannerSubtitle || t('shop.hero.defaultSubtitle'),
  images: banner.value?.images ?? [],
  intervalMs: banner.value?.bannerIntervalMs ?? 5000,
}))

const loading = computed(() => catalog.status === 'idle' || catalog.status === 'loading')
const withImages = computed(() => catalog.products.filter((product) => product.images.length > 0))

const heroFallback = computed(() =>
  withImages.value
    .slice(0, 3)
    .map((product) => primaryImageUrl(product))
    .filter((src): src is string => Boolean(src)),
)

/** Newest five pieces, laid out as one feature tile plus four. */
const edit = computed(() => catalog.newest.slice(0, 5))
const editIds = computed(() => new Set(edit.value.map((product) => product.id)))

/** Editorial feature layout needs exactly five pieces; smaller edits use an even grid. */
const featureEdit = computed(() => edit.value.length === 5)

/** Pieces not already shown in the edit (hidden entirely for small catalogs). */
const collection = computed(() =>
  sortProducts(
    catalog.products.filter((product) => !editIds.value.has(product.id)),
    'featured',
  ).slice(0, 8),
)

const showCategories = computed(() => catalog.categories.length >= 2)
const homeCategories = computed(() => catalog.categories.slice(0, 5))
/** Tiles keep product-card proportions; a short list leaves whitespace rather than ballooning. */
const categoryCols = computed(() => (homeCategories.value.length === 5 ? 'md:grid-cols-5' : 'md:grid-cols-4'))

/** Stores offering pickup, with how many catalog pieces each carries. */
const stores = computed(() => {
  const map = new Map<string, { id: string; name: string; count: number }>()
  for (const product of catalog.products) {
    for (const shop of product.shops) {
      const entry = map.get(shop.shopId)
      if (entry) entry.count += 1
      else map.set(shop.shopId, { id: shop.shopId, name: shop.shopName, count: 1 })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
})

function productTo(product: PublicCatalogProductSummary) {
  return { name: 'global-store-product' as const, params: { productId: product.slug || product.id } }
}

const services = [
  { icon: Truck, title: 'shop.home.serviceDelivery', body: 'shop.home.serviceDeliveryBody' },
  { icon: Store, title: 'shop.home.servicePickup', body: 'shop.home.servicePickupBody' },
  { icon: PackageCheck, title: 'shop.home.serviceAccount', body: 'shop.home.serviceAccountBody' },
]
</script>

<template>
  <div>
    <HomeHeroBanner
      v-if="hero.enabled"
      :title="hero.title"
      :subtitle="hero.subtitle"
      :images="hero.images"
      :interval-ms="hero.intervalMs"
      :fallback-images="heroFallback"
    />

    <!-- Catalog failed: one clear recovery path instead of empty sections. -->
    <div v-if="catalog.status === 'error'" class="sf-container">
      <StoreEmptyState :icon="RefreshCw" :title="$t('shop.product.loadErrorTitle')" :body="$t('shop.catalog.loadError')">
        <button type="button" class="sf-btn" @click="catalog.load(true)">{{ $t('shop.catalog.retry') }}</button>
      </StoreEmptyState>
    </div>

    <template v-else>
      <!-- Category discovery: portrait tiles, swipeable on phones -->
      <section v-if="showCategories" class="sf-container pt-20 md:pt-28" aria-labelledby="home-categories">
        <div class="mb-10 flex items-end justify-between gap-6 md:mb-12">
          <h2 id="home-categories" class="sf-eyebrow">{{ $t('shop.home.categoriesEyebrow') }}</h2>
          <RouterLink :to="{ name: 'global-store-shop' }" class="sf-link shrink-0">
            {{ $t('shop.nav.shopAll') }}
          </RouterLink>
        </div>
        <ul class="sf-scroll-x -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 sm:-mx-8 sm:px-8 md:mx-0 md:grid md:gap-5 md:overflow-visible md:px-0" :class="categoryCols">
          <li
            v-for="category in homeCategories"
            :key="category.name"
            class="w-[44vw] max-w-56 shrink-0 snap-start md:w-auto md:max-w-none"
          >
            <RouterLink
              :to="{ name: 'global-store-shop', query: { category: category.name } }"
              class="group block"
            >
              <span class="block aspect-[3/4] overflow-hidden bg-cream">
                <img
                  v-if="category.image"
                  :src="category.image"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  class="h-full w-full object-cover transition-transform duration-[1200ms] ease-[var(--ease-store)] motion-safe:group-hover:scale-[1.04]"
                />
              </span>
              <span class="mt-4 flex items-baseline justify-between gap-3">
                <span class="sf-name truncate">{{ category.name }}</span>
                <span class="shrink-0 text-[11px] text-mute tabular-nums">{{ category.count }}</span>
              </span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <!-- This week's edit -->
      <section class="sf-container sf-section">
        <div class="mb-12 flex items-end justify-between gap-6 md:mb-16">
          <div>
            <p class="sf-eyebrow">{{ $t('shop.home.newEyebrow') }}</p>
            <h2 class="sf-heading mt-4">{{ $t('shop.home.newTitle') }}</h2>
          </div>
          <RouterLink :to="{ name: 'global-store-shop', query: { sort: 'new' } }" class="sf-link shrink-0">
            {{ $t('shop.home.viewAll') }}
            <ArrowRight class="h-4 w-4 rtl:-scale-x-100" />
          </RouterLink>
        </div>

        <StoreProductGridSkeleton v-if="loading" :count="4" />

        <StoreEmptyState v-else-if="edit.length === 0" :title="$t('shop.catalog.empty')" />

        <div v-else-if="featureEdit" class="grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 md:gap-x-6 lg:grid-cols-12 lg:gap-y-16">
          <div
            v-for="(product, i) in edit"
            :key="product.id"
            :class="i === 0 ? 'col-span-2 lg:col-span-6 lg:row-span-2' : 'lg:col-span-3'"
          >
            <StoreProductCard
              :product="product"
              :to="productTo(product)"
              :feature="i === 0"
              :eager="i < 3"
              :frame-class="i === 0 ? 'aspect-[3/4] lg:aspect-auto lg:flex-1 lg:min-h-[40rem]' : 'aspect-[3/4]'"
            />
          </div>
        </div>
        <div v-else class="sf-grid">
          <StoreProductCard
            v-for="(product, i) in edit"
            :key="product.id"
            :product="product"
            :to="productTo(product)"
            :eager="i < 4"
          />
        </div>
      </section>

      <!-- Campaign band: order online, collect from a real store -->
      <section class="bg-cream">
        <div class="sf-container grid gap-14 py-20 md:grid-cols-12 md:gap-16 md:py-32">
          <div class="md:col-span-5">
            <p class="sf-eyebrow">{{ $t('shop.home.campaignEyebrow') }}</p>
            <h2 class="sf-display mt-5 text-[2.75rem] md:text-6xl rtl:text-4xl rtl:md:text-5xl">{{ $t('shop.home.campaignTitle') }}</h2>
            <p class="mt-5 max-w-md text-[15px] leading-relaxed text-ink-soft">{{ $t('shop.home.campaignBody') }}</p>
            <RouterLink :to="{ name: 'global-store-shop' }" class="sf-btn mt-9">{{ $t('shop.home.campaignCta') }}</RouterLink>
          </div>
          <ul v-if="stores.length > 0" class="border-t border-ink/20 md:col-span-6 md:col-start-7 md:self-center">
            <li v-for="store in stores" :key="store.id" class="border-b border-ink/20">
              <RouterLink
                :to="{ name: 'global-store-shop', query: { shop: store.id } }"
                class="group flex items-center gap-5 py-6 md:py-7"
              >
                <MapPin class="h-5 w-5 shrink-0 text-taupe" stroke-width="1.25" />
                <span class="min-w-0 flex-1">
                  <span class="sf-title block truncate text-[1.75rem] font-light md:text-4xl rtl:text-2xl rtl:md:text-3xl">{{ store.name }}</span>
                  <span class="sf-eyebrow mt-1.5 block">
                    {{ $t('shop.checkout.pickup') }} · {{ $t('shop.checkout.free') }} — {{ $t('shop.home.itemsCount', store.count) }}
                  </span>
                </span>
                <ArrowUpRight
                  class="h-5 w-5 shrink-0 text-ink transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                  stroke-width="1.25"
                />
              </RouterLink>
            </li>
          </ul>
        </div>
      </section>

      <!-- Collection -->
      <section v-if="!loading && collection.length > 0" class="sf-container sf-section">
        <div class="mb-12 flex items-end justify-between gap-6 md:mb-16">
          <div>
            <p class="sf-eyebrow">{{ $t('shop.home.collectionEyebrow') }}</p>
            <h2 class="sf-heading mt-4">{{ $t('shop.home.collectionTitle') }}</h2>
          </div>
          <RouterLink :to="{ name: 'global-store-shop' }" class="sf-link shrink-0">
            {{ $t('shop.home.viewAll') }}
            <ArrowRight class="h-4 w-4 rtl:-scale-x-100" />
          </RouterLink>
        </div>
        <div class="sf-grid">
          <StoreProductCard v-for="product in collection" :key="product.id" :product="product" :to="productTo(product)" />
        </div>
      </section>
    </template>

    <!-- Services -->
    <section class="border-y border-line">
      <ul class="sf-container grid md:grid-cols-3">
        <li
          v-for="service in services"
          :key="service.title"
          class="flex flex-col items-center border-b border-line px-6 py-12 text-center last:border-b-0 md:border-b-0 md:border-e md:py-16 md:last:border-e-0"
        >
          <component :is="service.icon" class="h-6 w-6 text-taupe" stroke-width="1" aria-hidden="true" />
          <p class="sf-eyebrow mt-5 text-ink">{{ $t(service.title) }}</p>
          <p class="mt-3 max-w-xs text-[13px] leading-relaxed text-mute">{{ $t(service.body) }}</p>
        </li>
      </ul>
    </section>

    <!-- Membership -->
    <section v-if="!customerAuth.isAuthenticated" class="sf-container sf-section text-center">
      <p class="sf-eyebrow">{{ $t('shop.home.joinEyebrow') }}</p>
      <h2 class="sf-display mx-auto mt-6 max-w-3xl text-[2.75rem] md:text-7xl rtl:text-4xl rtl:md:text-6xl">{{ $t('shop.home.joinTitle') }}</h2>
      <p class="mx-auto mt-6 max-w-md text-[15px] leading-[1.75] text-ink-soft">{{ $t('shop.home.joinBody') }}</p>
      <RouterLink :to="{ path: '/login', query: { create: '1' } }" class="sf-btn-outline mt-10">
        {{ $t('shop.home.joinCta') }}
        <ArrowRight class="h-4 w-4 rtl:-scale-x-100" />
      </RouterLink>
    </section>
  </div>
</template>
