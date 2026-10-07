<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Heart, X } from 'lucide-vue-next'
import StoreBreadcrumb from '@/components/storefront/StoreBreadcrumb.vue'
import StoreEmptyState from '@/components/storefront/StoreEmptyState.vue'
import { useWishlistStore, type WishlistItem } from '@/stores/wishlist'
import { useGlobalCatalogStore } from '@/stores/globalCatalog'
import ProductThumb from '@/components/storefront/ProductThumb.vue'
import { formatFromPrice } from '@/utils/formatMoney'
import { primaryImageUrl } from '@/utils/storeCatalog'

const { t } = useI18n()
const wishlist = useWishlistStore()
const catalog = useGlobalCatalogStore()

onMounted(() => {
  void catalog.load()
})

const breadcrumb = computed(() => [{ label: t('shop.breadcrumb.home'), to: '/store' }, { label: t('shop.breadcrumb.wishlist') }])

/** Merge saved snapshots with live catalog data (price, image, availability). */
const rows = computed(() =>
  wishlist.items.map((item) => {
    const live = catalog.findById(item.id)
    return {
      item,
      available: catalog.status !== 'ready' || Boolean(live),
      image: (live && primaryImageUrl(live)) || item.image,
      price: live ? formatFromPrice(live.fromPrice, live.hasPriceRange) : formatFromPrice(item.fromPrice, item.hasPriceRange),
      category: live?.category ?? item.category,
    }
  }),
)

function productTo(item: WishlistItem) {
  return { name: 'global-store-product' as const, params: { productId: item.slug || item.id } }
}
</script>

<template>
  <div>
    <div class="border-b border-line">
      <div class="sf-container pb-8 pt-8 md:pb-10 md:pt-12">
        <StoreBreadcrumb :items="breadcrumb" />
        <div class="mt-6 flex items-end justify-between gap-6">
          <h1 class="sf-display text-5xl md:text-7xl rtl:text-4xl rtl:md:text-6xl">{{ $t('shop.wishlist.title') }}</h1>
          <p v-if="wishlist.count" class="pb-2 text-sm text-mute tabular-nums">{{ $t('shop.cart.itemsCount', wishlist.count) }}</p>
        </div>
      </div>
    </div>

    <div class="sf-container pb-24 pt-10 md:pt-14">
      <StoreEmptyState
        v-if="wishlist.count === 0"
        :icon="Heart"
        :title="$t('shop.wishlist.emptyTitle')"
        :body="$t('shop.wishlist.emptyBody')"
      >
        <RouterLink :to="{ name: 'global-store-shop' }" class="sf-btn">{{ $t('shop.checkout.browseProducts') }}</RouterLink>
      </StoreEmptyState>

      <template v-else>
        <ul class="sf-grid md:grid-cols-3 xl:grid-cols-4">
          <li v-for="row in rows" :key="row.item.id" class="group flex flex-col">
            <div class="relative aspect-[3/4] overflow-hidden bg-cream">
              <RouterLink :to="productTo(row.item)" class="absolute inset-0" tabindex="-1" aria-hidden="true">
                <span
                  class="block h-full w-full transition-transform duration-[1200ms] ease-[var(--ease-store)] motion-safe:group-hover:scale-[1.03]"
                  :class="row.available ? '' : 'opacity-50 grayscale'"
                >
                  <ProductThumb :src="row.image" :name="row.item.name" />
                </span>
              </RouterLink>
              <button
                type="button"
                class="absolute end-1.5 top-1.5 flex h-10 w-10 cursor-pointer items-center justify-center bg-ivory/80 text-ink transition-colors hover:bg-ivory"
                :aria-label="$t('shop.catalog.removeFromWishlist', { name: row.item.name })"
                @click="wishlist.remove(row.item.id)"
              >
                <X class="h-4 w-4" stroke-width="1.25" />
              </button>
              <span
                v-if="!row.available"
                class="absolute inset-x-3 bottom-3 bg-ivory/90 px-3 py-2 text-center text-xs text-ink"
              >
                {{ $t('shop.wishlist.unavailable') }}
              </span>
            </div>
            <div class="flex flex-col pt-4">
              <div class="min-w-0">
                <h2 class="sf-name">
                  <RouterLink :to="productTo(row.item)" class="hover:opacity-70">{{ row.item.name }}</RouterLink>
                </h2>
                <p v-if="row.category" class="mt-1 truncate text-[12px] text-mute">{{ row.category }}</p>
              </div>
              <p class="sf-price mt-2 text-ink-soft">{{ row.price }}</p>
            </div>
            <div class="mt-5 flex flex-1 items-end">
              <RouterLink
                v-if="row.available"
                :to="productTo(row.item)"
                class="sf-btn-outline min-h-11 w-full px-3"
              >
                {{ $t('shop.wishlist.chooseOptions') }}
              </RouterLink>
              <RouterLink
                v-else
                :to="{ name: 'global-store-shop', query: row.category ? { category: row.category } : {} }"
                class="sf-btn-outline min-h-11 w-full px-3"
              >
                {{ $t('shop.wishlist.shopSimilar') }}
              </RouterLink>
            </div>
          </li>
        </ul>
        <p class="mt-14 text-center text-xs text-mute">{{ $t('shop.wishlist.deviceNote') }}</p>
      </template>
    </div>
  </div>
</template>
