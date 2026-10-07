<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import type { PublicCatalogProductSummary } from '@/services/globalStore'
import { formatFromPrice } from '@/utils/formatMoney'
import { orderedImageUrls, productMeta } from '@/utils/storeCatalog'
import WishlistButton from '@/components/storefront/WishlistButton.vue'
import { useWishlistStore } from '@/stores/wishlist'
import { useGlobalCatalogStore } from '@/stores/globalCatalog'

const props = withDefaults(
  defineProps<{
    product: PublicCatalogProductSummary
    to: RouteLocationRaw
    /** Image frame classes; feature tiles pass a taller/fill frame. */
    frameClass?: string
    /** Load the image eagerly (above-the-fold tiles). */
    eager?: boolean
    /** Optional larger title for editorial feature tiles. */
    feature?: boolean
  }>(),
  { frameClass: 'aspect-[3/4]', eager: false, feature: false },
)

const images = computed(() => orderedImageUrls(props.product))
const primary = computed(() => images.value[0] ?? null)
const secondary = computed(() => images.value[1] ?? null)
const meta = computed(() => productMeta(props.product))
const catalog = useGlobalCatalogStore()
const isNew = computed(() => catalog.newIds.has(props.product.id))
const wishlist = useWishlistStore()
const saved = computed(() => wishlist.has(props.product.id))
const initial = computed(() => props.product.name.trim().charAt(0).toUpperCase())
</script>

<template>
  <article class="group relative flex h-full flex-col">
    <div class="relative overflow-hidden bg-cream" :class="frameClass">
      <RouterLink :to="to" class="absolute inset-0 block" tabindex="-1" aria-hidden="true">
        <template v-if="primary">
          <img
            :src="primary"
            :alt="product.name"
            :loading="eager ? 'eager' : 'lazy'"
            decoding="async"
            class="h-full w-full object-cover transition-[transform,opacity] duration-[1200ms] ease-[var(--ease-store)] motion-safe:group-hover:scale-[1.03]"
            :class="secondary ? 'group-hover:opacity-0' : ''"
          />
          <img
            v-if="secondary"
            :src="secondary"
            alt=""
            loading="lazy"
            decoding="async"
            class="absolute inset-0 h-full w-full object-cover opacity-0 transition-[transform,opacity] duration-[1200ms] ease-[var(--ease-store)] group-hover:opacity-100 motion-safe:group-hover:scale-[1.03]"
          />
        </template>
        <span
          v-else
          class="flex h-full w-full items-center justify-center font-display text-7xl font-light text-taupe/50"
        >
          {{ initial }}
        </span>
      </RouterLink>

      <span
        v-if="isNew"
        class="pointer-events-none absolute start-0 top-0 bg-ivory/90 px-2.5 py-1.5 font-label text-[9.5px] font-medium uppercase tracking-[0.22em] text-ink rtl:text-[12px] rtl:tracking-normal"
      >
        {{ $t('shop.catalog.newBadge') }}
      </span>
      <div
        class="absolute end-1.5 top-1.5 transition-opacity duration-300"
        :class="saved ? '' : 'md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100'"
      >
        <WishlistButton :product="product" />
      </div>
    </div>

    <!-- Name over price, start-aligned: reads the same in LTR and RTL and never truncates two-up. -->
    <div class="flex flex-col pt-4" :class="feature ? 'md:pt-6' : ''">
      <h3 class="sf-name" :class="feature ? 'md:text-[14px]' : ''">
        <RouterLink :to="to" class="transition-opacity duration-200 hover:opacity-60">
          {{ product.name }}
        </RouterLink>
      </h3>
      <p v-if="meta" class="mt-1 truncate text-[12px] text-mute">{{ meta }}</p>
      <p class="sf-price mt-2 text-ink-soft">
        {{ formatFromPrice(product.fromPrice, product.hasPriceRange) }}
      </p>
    </div>
  </article>
</template>
