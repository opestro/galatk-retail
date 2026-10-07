<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronDown, PackageSearch, RefreshCw, Search, X } from 'lucide-vue-next'
import StoreProductGridSkeleton from '@/components/storefront/StoreProductGridSkeleton.vue'
import StoreProductCard from '@/components/storefront/StoreProductCard.vue'
import StoreBreadcrumb from '@/components/storefront/StoreBreadcrumb.vue'
import StoreEmptyState from '@/components/storefront/StoreEmptyState.vue'
import { useGlobalCatalogStore } from '@/stores/globalCatalog'
import type { PublicCatalogProductSummary } from '@/services/globalStore'
import { CATALOG_SORTS, matchesQuery, sortProducts, type CatalogSort } from '@/utils/storeCatalog'

const PAGE_SIZE = 12

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const catalog = useGlobalCatalogStore()

onMounted(() => {
  void catalog.load()
})

function queryString(key: string): string {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

const searchQuery = computed(() => queryString('q'))
const categoryFilter = computed(() => queryString('category'))
const shopFilter = computed(() => queryString('shop') || 'all')
const sort = computed<CatalogSort>(() => {
  const value = queryString('sort') as CatalogSort
  return CATALOG_SORTS.includes(value) ? value : 'featured'
})

/** Search box is local state, committed to the URL after a short pause. */
const searchInput = ref(searchQuery.value)
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, (value) => {
  if (value !== searchInput.value.trim()) searchInput.value = value
})
watch(searchInput, (value) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => updateQuery({ q: value.trim() || undefined }), 300)
})

function updateQuery(patch: Record<string, string | undefined>) {
  const next: LocationQueryRaw = { ...route.query, ...patch }
  for (const key of Object.keys(next)) {
    if (next[key] === undefined || next[key] === '') delete next[key]
  }
  void router.replace({ query: next })
}

const loading = computed(() => catalog.status === 'idle' || catalog.status === 'loading')

const allShops = computed(() => {
  const map = new Map<string, string>()
  catalog.products.forEach((p) => p.shops.forEach((s) => map.set(s.shopId, s.shopName)))
  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
})

const filteredProducts = computed(() => {
  let list = catalog.products
  if (searchQuery.value) list = list.filter((p) => matchesQuery(p, searchQuery.value))
  if (categoryFilter.value) list = list.filter((p) => p.category === categoryFilter.value)
  if (shopFilter.value !== 'all') list = list.filter((p) => p.shops.some((s) => s.shopId === shopFilter.value))
  return sortProducts(list, sort.value)
})

const visibleCount = ref(PAGE_SIZE)
watch(
  () => [searchQuery.value, categoryFilter.value, shopFilter.value, sort.value],
  () => {
    visibleCount.value = PAGE_SIZE
  },
)
const visibleProducts = computed(() => filteredProducts.value.slice(0, visibleCount.value))

const hasFilters = computed(() => Boolean(searchQuery.value || categoryFilter.value || shopFilter.value !== 'all'))

const pageTitle = computed(() => {
  if (searchQuery.value) return t('shop.catalog.resultsFor', { q: searchQuery.value })
  if (categoryFilter.value) return categoryFilter.value
  if (sort.value === 'new') return t('shop.catalog.newTitle')
  return t('shop.catalog.title')
})

const breadcrumb = computed(() => {
  const items: Array<{ label: string; to?: string | { name: string } }> = [
    { label: t('shop.breadcrumb.home'), to: '/store' },
    { label: t('shop.breadcrumb.shop'), to: { name: 'global-store-shop' } },
  ]
  if (categoryFilter.value) items.push({ label: categoryFilter.value })
  return items
})

function productTo(product: PublicCatalogProductSummary) {
  return {
    name: 'global-store-product' as const,
    params: { productId: product.slug || product.id },
    query: shopFilter.value !== 'all' ? { shop: shopFilter.value } : undefined,
  }
}

function clearFilters() {
  searchInput.value = ''
  void router.replace({ query: sort.value !== 'featured' ? { sort: sort.value } : {} })
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="sf-container pb-10 pt-8 md:pb-16 md:pt-14">
      <StoreBreadcrumb :items="breadcrumb" />
      <div class="mt-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 md:mt-12">
        <div>
          <h1 class="sf-display text-5xl md:text-7xl rtl:text-4xl rtl:md:text-6xl">{{ pageTitle }}</h1>
          <p v-if="!hasFilters && sort !== 'new'" class="mt-5 max-w-lg text-[15px] leading-[1.75] text-mute">
            {{ $t('shop.catalog.intro') }}
          </p>
        </div>
        <p v-if="!loading" class="sf-eyebrow tabular-nums" aria-live="polite">
          {{ $t('shop.catalog.count', filteredProducts.length) }}
        </p>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="z-40 border-y border-line bg-ivory/95 backdrop-blur-md lg:sticky lg:top-[5.25rem]">
      <div class="sf-container flex flex-col gap-2 py-2 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:py-3">
        <ul
          v-if="catalog.categories.length > 0"
          class="sf-scroll-x -mx-5 flex gap-7 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-wrap lg:gap-x-8 lg:px-0"
          :aria-label="$t('shop.catalog.categoryFilter')"
        >
          <li class="shrink-0">
            <button
              type="button"
              class="sf-tab"
              :class="{ 'sf-tab-active': !categoryFilter }"
              :aria-pressed="!categoryFilter"
              @click="updateQuery({ category: undefined })"
            >
              {{ $t('shop.catalog.allCategories') }}
            </button>
          </li>
          <li v-for="category in catalog.categories" :key="category.name" class="shrink-0">
            <button
              type="button"
              class="sf-tab"
              :class="{ 'sf-tab-active': categoryFilter === category.name }"
              :aria-pressed="categoryFilter === category.name"
              @click="updateQuery({ category: category.name })"
            >
              {{ category.name }}
            </button>
          </li>
        </ul>
        <div v-else class="hidden lg:block" />

        <div class="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
          <div class="relative col-span-2 sm:w-56">
            <Search class="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" stroke-width="1.25" />
            <label for="catalog-search" class="sr-only">{{ $t('shop.catalog.searchLabel') }}</label>
            <input
              id="catalog-search"
              v-model="searchInput"
              type="search"
              :placeholder="$t('shop.catalog.searchPlaceholder')"
              class="sf-input h-11 ps-9 md:text-[13px]"
            />
          </div>
          <div v-if="allShops.length > 1" class="relative">
            <label for="catalog-shop" class="sr-only">{{ $t('shop.catalog.shopFilter') }}</label>
            <select
              id="catalog-shop"
              :value="shopFilter"
              class="sf-input h-11 cursor-pointer appearance-none pe-9 md:text-[13px] sm:w-44"
              @change="updateQuery({ shop: ($event.target as HTMLSelectElement).value === 'all' ? undefined : ($event.target as HTMLSelectElement).value })"
            >
              <option value="all">{{ $t('shop.catalog.allShops') }}</option>
              <option v-for="shop in allShops" :key="shop.id" :value="shop.id">{{ shop.name }}</option>
            </select>
            <ChevronDown class="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          </div>
          <div class="relative" :class="allShops.length > 1 ? '' : 'col-span-2'">
            <label for="catalog-sort" class="sr-only">{{ $t('shop.catalog.sort') }}</label>
            <select
              id="catalog-sort"
              :value="sort"
              class="sf-input h-11 cursor-pointer appearance-none pe-9 md:text-[13px] sm:w-52"
              @change="updateQuery({ sort: ($event.target as HTMLSelectElement).value === 'featured' ? undefined : ($event.target as HTMLSelectElement).value })"
            >
              <option v-for="option in CATALOG_SORTS" :key="option" :value="option">
                {{ $t('shop.catalog.sort') }}: {{ $t(`shop.catalog.sorts.${option}`) }}
              </option>
            </select>
            <ChevronDown class="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
          </div>
        </div>
      </div>
    </div>

    <!-- Results -->
    <div class="sf-container pb-28 pt-10 md:pt-16">
      <StoreProductGridSkeleton v-if="loading" />

      <StoreEmptyState
        v-else-if="catalog.status === 'error'"
        :icon="RefreshCw"
        :title="$t('shop.product.loadErrorTitle')"
        :body="$t('shop.catalog.loadError')"
      >
        <button type="button" class="sf-btn" @click="catalog.load(true)">{{ $t('shop.catalog.retry') }}</button>
      </StoreEmptyState>

      <StoreEmptyState
        v-else-if="filteredProducts.length === 0"
        :icon="PackageSearch"
        :title="hasFilters ? $t('shop.catalog.emptyFiltered') : $t('shop.catalog.empty')"
        :body="searchQuery ? $t('shop.search.noResultsHint') : undefined"
      >
        <button v-if="hasFilters" type="button" class="sf-btn-outline" @click="clearFilters">
          <X class="h-4 w-4" />
          {{ $t('shop.catalog.clearFilters') }}
        </button>
      </StoreEmptyState>

      <template v-else>
        <div class="sf-grid md:grid-cols-3 xl:grid-cols-4">
          <StoreProductCard
            v-for="(product, i) in visibleProducts"
            :key="product.id"
            :product="product"
            :to="productTo(product)"
            :eager="i < 4"
          />
        </div>

        <div v-if="filteredProducts.length > PAGE_SIZE" class="mt-20 flex flex-col items-center gap-5">
          <p class="sf-eyebrow tabular-nums">
            {{ $t('shop.catalog.showing', { shown: visibleProducts.length, total: filteredProducts.length }) }}
          </p>
          <div class="h-px w-48 bg-line">
            <div
              class="h-px bg-ink transition-[width] duration-500"
              :style="{ width: `${(visibleProducts.length / filteredProducts.length) * 100}%` }"
            />
          </div>
          <button
            v-if="visibleProducts.length < filteredProducts.length"
            type="button"
            class="sf-btn-outline mt-2"
            @click="visibleCount += PAGE_SIZE"
          >
            {{ $t('shop.catalog.loadMore') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
