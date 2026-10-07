<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { api } from '@/services/api'
import { useStorefrontCartStore } from '@/stores/storefrontCart'
import type { StorefrontProduct } from '@/types/api'
import { ShoppingCart } from 'lucide-vue-next'
import { groupByCategory, variantDisplay } from '@/utils/productFamily'
import { formatDzd } from '@/utils/formatMoney'

const route = useRoute()
const cart = useStorefrontCartStore()
const products = ref<StorefrontProduct[]>([])
const shopName = ref('')
const loading = ref(true)
const productGroups = computed(() =>
  groupByCategory(products.value).filter((group) => group.variants.some((item) => item.inStock)),
)

onMounted(async () => {
  const slug = route.params.slug as string
  try {
    const [shopRes, productsRes] = await Promise.all([
      api.get<{ data: { name: string } }>(`/storefront/${slug}`),
      api.get<{ data: StorefrontProduct[] }>(`/storefront/${slug}/products`),
    ])
    shopName.value = shopRes.data.data.name
    products.value = productsRes.data.data
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col gap-12">
    <header class="border-b border-line pb-8">
      <p class="sf-eyebrow">{{ $t('shop.breadcrumb.shop') }}</p>
      <div v-if="loading" class="sf-skeleton mt-4 h-12 w-64" />
      <h1 v-else class="sf-display mt-4 text-5xl md:text-7xl rtl:text-4xl rtl:md:text-6xl">{{ shopName }}</h1>
    </header>

    <div v-if="loading" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3" role="status">
      <span class="sr-only">{{ $t('shop.catalog.loading') }}</span>
      <div v-for="n in 6" :key="n" class="sf-skeleton h-56" />
    </div>
    <div v-else class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <section v-for="group in productGroups" :key="group.category" class="border border-line bg-paper">
        <h2 class="sf-title border-b border-line px-5 py-4 text-xl">{{ group.category }}</h2>
        <ul class="divide-y divide-line">
          <li
            v-for="product in group.variants"
            :key="product.productId"
            class="flex items-center justify-between gap-3 px-5 py-3.5"
            :class="!product.inStock ? 'opacity-60' : ''"
          >
            <div class="min-w-0">
              <p class="truncate text-sm text-ink">{{ variantDisplay(product) }}</p>
              <p class="text-xs text-mute tabular-nums">{{ formatDzd(product.sellPrice) }}</p>
            </div>
            <button
              v-if="product.inStock"
              type="button"
              class="sf-btn min-h-9 shrink-0 px-4 text-[11px]"
              @click="cart.addProduct(product)"
            >
              {{ $t('shop.catalog.add') }}
            </button>
            <span v-else class="shrink-0 text-xs text-alert">{{ $t('shop.catalog.outOfStock') }}</span>
          </li>
        </ul>
      </section>
    </div>

    <!-- Sticky checkout bar once the cart has something in it -->
    <Transition
      enter-active-class="transition duration-500 ease-[var(--ease-store)]"
      enter-from-class="translate-y-full"
      leave-active-class="transition duration-200"
      leave-to-class="translate-y-full"
    >
      <div v-if="cart.lines.length" class="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ivory/95 backdrop-blur-md">
        <div class="sf-container flex items-center justify-between gap-4 py-3">
          <p class="text-sm text-ink-soft">
            <ShoppingCart class="me-2 inline h-4 w-4 align-[-2px]" stroke-width="1.25" />
            {{ $t('shop.catalog.cartWithCount', { n: cart.lines.length }) }}
            <span class="sf-figure ms-2 text-ink">{{ formatDzd(cart.total) }}</span>
          </p>
          <RouterLink :to="`/shop/${route.params.slug}/checkout`" class="sf-btn min-h-11">
            {{ $t('shop.cart.checkout') }}
          </RouterLink>
        </div>
      </div>
    </Transition>
  </div>
</template>
