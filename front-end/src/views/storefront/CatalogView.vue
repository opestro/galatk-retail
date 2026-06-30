<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { api } from '@/services/api'
import { useStorefrontCartStore } from '@/stores/storefrontCart'
import type { StorefrontProduct } from '@/types/api'
import { ShoppingCart } from 'lucide-vue-next'
import Skeleton from '@/components/ui/Skeleton.vue'
import SkeletonProductGrid from '@/components/ui/SkeletonProductGrid.vue'

const route = useRoute()
const cart = useStorefrontCartStore()
const products = ref<StorefrontProduct[]>([])
const shopName = ref('')
const loading = ref(true)

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
        v-for="product in products"
        :key="product.productId"
        class="card flex flex-col gap-3"
        :class="!product.inStock ? 'opacity-60' : ''"
      >
        <h3 class="font-medium text-gray-900">{{ product.name }}</h3>
        <p class="text-sm text-gray-500">{{ product.description }}</p>
        <div class="flex items-center justify-between pt-1">
          <span class="font-semibold text-gray-900">{{ product.sellPrice }} DZD</span>
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
</template>
