<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, Check, ShoppingBag } from 'lucide-vue-next'
import StoreBreadcrumb from '@/components/storefront/StoreBreadcrumb.vue'
import StoreEmptyState from '@/components/storefront/StoreEmptyState.vue'
import StoreProductCard from '@/components/storefront/StoreProductCard.vue'
import ProductThumb from '@/components/storefront/ProductThumb.vue'
import QuantityStepper from '@/components/storefront/QuantityStepper.vue'
import { useGlobalStoreCartStore, type GlobalCartLine } from '@/stores/globalStoreCart'
import { useGlobalCatalogStore } from '@/stores/globalCatalog'
import { formatDzd } from '@/utils/formatMoney'
import { sortProducts } from '@/utils/storeCatalog'

const { t } = useI18n()
const cart = useGlobalStoreCartStore()
const catalog = useGlobalCatalogStore()

onMounted(() => {
  void catalog.load()
})

const groups = computed(() => {
  const map = new Map<string, { shopName: string; lines: GlobalCartLine[] }>()
  for (const line of cart.lines) {
    const group = map.get(line.shopId)
    if (group) group.lines.push(line)
    else map.set(line.shopId, { shopName: line.shopName, lines: [line] })
  }
  return [...map.entries()]
})

const breadcrumb = computed(() => [{ label: t('shop.breadcrumb.home'), to: '/store' }, { label: t('shop.breadcrumb.bag') }])

function lineTo(line: GlobalCartLine) {
  return { name: 'global-store-product' as const, params: { productId: line.slug || '' } }
}

/** Suggestions: catalog pieces not already in the bag (matched by slug). */
const suggestions = computed(() => {
  const inBag = new Set(cart.lines.map((line) => line.slug).filter(Boolean))
  return sortProducts(
    catalog.products.filter((product) => !inBag.has(product.slug)),
    'featured',
  ).slice(0, 4)
})
</script>

<template>
  <div>
    <div class="border-b border-line">
      <div class="sf-container pb-8 pt-8 md:pb-10 md:pt-12">
        <StoreBreadcrumb :items="breadcrumb" />
        <div class="mt-6 flex items-end justify-between gap-6">
          <h1 class="sf-display text-5xl md:text-7xl rtl:text-4xl rtl:md:text-6xl">{{ $t('shop.cart.title') }}</h1>
          <p v-if="cart.itemCount" class="sf-eyebrow pb-3 tabular-nums">{{ $t('shop.cart.itemsCount', cart.itemCount) }}</p>
        </div>
      </div>
    </div>

    <div class="sf-container py-12 md:py-16">
      <StoreEmptyState
        v-if="cart.lines.length === 0"
        :icon="ShoppingBag"
        :title="$t('shop.cart.emptyTitle')"
        :body="$t('shop.cart.emptyBody')"
      >
        <RouterLink :to="{ name: 'global-store-shop' }" class="sf-btn">{{ $t('shop.checkout.browseProducts') }}</RouterLink>
      </StoreEmptyState>

      <div v-else class="grid gap-12 lg:grid-cols-12 lg:gap-20">
        <div class="lg:col-span-8">
          <p
            v-if="groups.length > 1"
            class="mb-8 border-s border-taupe bg-cream px-5 py-4 text-[13px] leading-relaxed text-ink-soft"
          >
            {{ $t('shop.checkout.multiShopNotice', { n: groups.length }) }}
          </p>

          <section v-for="[shopId, group] in groups" :key="shopId" class="mb-8 last:mb-0">
            <p v-if="groups.length > 1" class="sf-eyebrow mb-3">{{ $t('shop.cart.fromShop', { shop: group.shopName }) }}</p>
            <ul class="flex flex-col divide-y divide-line border-y border-line">
              <li
                v-for="line in group.lines"
                :key="`${line.productId}-${line.shopId}`"
                class="flex gap-5 py-6 sm:grid sm:grid-cols-[8rem_minmax(0,1fr)_auto_7.5rem] sm:items-start sm:gap-8 sm:py-8"
              >
                <component
                  :is="line.slug ? RouterLink : 'div'"
                  :to="line.slug ? lineTo(line) : undefined"
                  class="block aspect-[3/4] w-24 shrink-0 overflow-hidden sm:w-32"
                  tabindex="-1"
                  aria-hidden="true"
                >
                  <ProductThumb :src="line.image" :name="line.name" />
                </component>

                <!-- Details -->
                <div class="flex min-w-0 flex-1 flex-col sm:pt-1">
                  <h2 class="sf-name">
                    <RouterLink v-if="line.slug" :to="lineTo(line)" class="hover:opacity-70">{{ line.name }}</RouterLink>
                    <template v-else>{{ line.name }}</template>
                  </h2>
                  <p class="mt-1.5 text-[13px] text-mute">
                    <template v-if="line.variantLabel">{{ line.variantLabel }}</template>
                    <template v-if="line.variantLabel && groups.length === 1"> · </template>
                    <template v-if="groups.length === 1">{{ line.shopName }}</template>
                  </p>
                  <p v-if="line.quantity > 1" class="sf-figure mt-1 text-xs text-mute">
                    {{ $t('shop.cart.each', { price: formatDzd(line.sellPrice) }) }}
                  </p>
                  <p class="sf-price mt-2 text-[15px] sm:hidden">{{ formatDzd(Number(line.sellPrice) * line.quantity) }}</p>

                  <div class="mt-auto flex items-center justify-between gap-3 pt-4 sm:mt-5 sm:pt-0">
                    <QuantityStepper
                      class="sm:hidden"
                      size="sm"
                      :model-value="line.quantity"
                      :max="line.maxQuantity"
                      :label="`${$t('shop.cart.qtyLabel')} — ${line.name}`"
                      @update:model-value="cart.updateQuantity(line.productId, line.shopId, $event)"
                    />
                    <button
                      type="button"
                      class="min-h-11 cursor-pointer text-[12px] tracking-[0.04em] text-ink-soft underline decoration-ink/25 underline-offset-[5px] transition-colors hover:text-alert hover:decoration-alert"
                      @click="cart.removeLine(line.productId, line.shopId)"
                    >
                      {{ $t('shop.cart.remove') }}
                      <span class="sr-only">— {{ line.name }}</span>
                    </button>
                  </div>
                </div>

                <!-- Desktop quantity + line total -->
                <div class="hidden sm:block">
                  <QuantityStepper
                    :model-value="line.quantity"
                    :max="line.maxQuantity"
                    :label="`${$t('shop.cart.qtyLabel')} — ${line.name}`"
                    @update:model-value="cart.updateQuantity(line.productId, line.shopId, $event)"
                  />
                </div>
                <p class="sf-price hidden pt-3 text-end text-[15px] sm:block">{{ formatDzd(Number(line.sellPrice) * line.quantity) }}</p>
              </li>
            </ul>
          </section>

          <RouterLink :to="{ name: 'global-store-shop' }" class="sf-link mt-10">
            <ArrowLeft class="h-4 w-4 rtl:-scale-x-100" />
            {{ $t('shop.cart.continue') }}
          </RouterLink>
        </div>

        <!-- Summary -->
        <aside class="lg:col-span-4" :aria-label="$t('shop.cart.summary')">
          <div class="sf-panel p-7 md:p-9 lg:sticky lg:top-32">
            <h2 class="sf-eyebrow">{{ $t('shop.cart.summary') }}</h2>
            <dl class="mt-6 flex flex-col gap-4 text-sm">
              <div class="flex items-center justify-between gap-4">
                <dt class="text-ink-soft">{{ $t('shop.cart.subtotal') }}</dt>
                <dd class="sf-figure text-ink">{{ formatDzd(cart.total) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-4">
                <dt class="text-ink-soft">{{ $t('shop.cart.delivery') }}</dt>
                <dd class="text-end text-mute">{{ $t('shop.cart.deliveryAtCheckout') }}</dd>
              </div>
            </dl>
            <div class="mt-6 flex items-center justify-between border-t border-line pt-6">
              <span class="sf-eyebrow text-ink">{{ $t('shop.cart.total') }}</span>
              <span class="sf-figure text-[17px] font-medium tracking-[0.02em] text-ink">{{ formatDzd(cart.total) }}</span>
            </div>
            <RouterLink :to="{ name: 'global-store-checkout' }" class="sf-btn mt-8 w-full">
              {{ $t('shop.cart.checkout') }}
            </RouterLink>
          </div>
          <ul class="mt-6 flex flex-col gap-2.5 px-1 text-[13px] text-mute">
            <li class="flex items-center gap-2.5"><Check class="h-4 w-4 shrink-0 text-taupe" stroke-width="1.25" />{{ $t('shop.cart.trustPickup') }}</li>
            <li class="flex items-center gap-2.5"><Check class="h-4 w-4 shrink-0 text-taupe" stroke-width="1.25" />{{ $t('shop.cart.trustDelivery') }}</li>
            <li class="flex items-center gap-2.5"><Check class="h-4 w-4 shrink-0 text-taupe" stroke-width="1.25" />{{ $t('shop.cart.trustTrack') }}</li>
          </ul>
        </aside>
      </div>
    </div>

    <section v-if="suggestions.length > 0" class="border-t border-line">
      <div class="sf-container sf-section">
        <p class="sf-eyebrow">{{ $t('shop.product.relatedEyebrow') }}</p>
        <h2 class="sf-heading mt-3">{{ $t('shop.product.relatedTitle') }}</h2>
        <div class="sf-grid mt-12 md:mt-16">
          <StoreProductCard
            v-for="product in suggestions"
            :key="product.id"
            :product="product"
            :to="{ name: 'global-store-product', params: { productId: product.slug || product.id } }"
          />
        </div>
      </div>
    </section>
  </div>
</template>
