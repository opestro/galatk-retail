<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { api } from '@/services/api'
import { useStorefrontCartStore } from '@/stores/storefrontCart'
import type { StorefrontProduct } from '@/types/api'
import { ShoppingCart } from 'lucide-vue-next'
import Skeleton from '@/components/ui/Skeleton.vue'
import SkeletonProductGrid from '@/components/ui/SkeletonProductGrid.vue'
import { groupByCategory, variantDisplay } from '@/utils/productFamily'

const route = useRoute()
const cart = useStorefrontCartStore()
const products = ref<StorefrontProduct[]>([])
const shopName = ref('')
const loading = ref(true)
const productGroups = computed(() => groupByCategory(products.value))

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
  <div class="flex flex-col gap-6">
    <header class="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5">
      <Skeleton v-if="loading" height="h-8" width="w-48" />
      <h1 v-else class="text-2xl font-semibold text-gray-900">{{ shopName }}</h1>
      <RouterLink
        :to="`/shop/${route.params.slug}/checkout`"
        class="btn-secondary flex items-center gap-2"
      >
        <ShoppingCart class="h-4 w-4" />
        Cart ({{ cart.lines.length }})
      </RouterLink>
    </header>

    <SkeletonProductGrid v-if="loading" :count="6" :columns="3" />
    <div v-else class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      <div
        v-for="group in productGroups"
        :key="group.category"
        class="card flex flex-col gap-3"
      >
        <h3 class="font-semibold text-gray-900">{{ group.category }}</h3>
        <div class="flex flex-col gap-2">
          <div
            v-for="product in group.variants"
            :key="product.productId"
            class="flex items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2"
            :class="!product.inStock ? 'opacity-60' : ''"
          >
            <div>
              <p class="text-sm font-medium text-gray-900">{{ variantDisplay(product) }}</p>
              <p class="text-xs text-gray-500">{{ product.sellPrice }} DZD</p>
            </div>
            <button
              v-if="product.inStock"
              class="btn-primary px-3 py-1.5 text-xs"
              @click="cart.addProduct(product)"
            >
              Add
            </button>
            <span v-else class="text-xs text-red-600">Out of stock</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
