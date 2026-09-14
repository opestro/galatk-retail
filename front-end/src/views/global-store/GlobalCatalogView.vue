<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { listGlobalProducts, type PublicCatalogProductSummary } from '@/services/globalStore'
import { MapPin, Package, Search } from 'lucide-vue-next'
import StoreProductGridSkeleton from '@/components/storefront/StoreProductGridSkeleton.vue'
import StoreProductCard from '@/components/storefront/StoreProductCard.vue'

const route = useRoute()
const products = ref<PublicCatalogProductSummary[]>([])
const loading = ref(true)
const loadError = ref(false)
const searchQuery = ref('')
const shopFilter = ref<string>((route.query.shop as string) || 'all')

onMounted(async () => {
  try {
    products.value = await listGlobalProducts()
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
})

const allShops = computed(() => {
  const map = new Map<string, string>()
  products.value.forEach((p) => p.shops.forEach((s) => map.set(s.shopId, s.shopName)))
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
})

const filteredProducts = computed(() => {
  let list = products.value

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false),
    )
  }

  if (shopFilter.value !== 'all') {
    list = list.filter((p) => p.shops.some((s) => s.shopId === shopFilter.value))
  }

  return list
})

function productTo(product: PublicCatalogProductSummary) {
  return {
    name: 'global-store-product' as const,
    params: { productId: product.slug || product.id },
    query: shopFilter.value !== 'all' ? { shop: shopFilter.value } : undefined,
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div class="relative flex-1">
        <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search products..."
          class="input pl-9"
        />
      </div>
      <div class="relative sm:w-56">
        <MapPin class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <select v-model="shopFilter" class="input appearance-none pl-9">
          <option value="all">All shops</option>
          <option v-for="shop in allShops" :key="shop.id" :value="shop.id">{{ shop.name }}</option>
        </select>
      </div>
    </div>

    <StoreProductGridSkeleton v-if="loading" />

    <div v-else-if="loadError" class="flex flex-col items-center gap-3 py-16 text-center">
      <Package class="h-10 w-10 text-gray-300" />
      <p class="text-gray-500">Could not load the store. Please try again.</p>
    </div>

    <div v-else-if="filteredProducts.length === 0" class="flex flex-col items-center gap-3 py-16 text-center">
      <Package class="h-10 w-10 text-gray-300" />
      <p class="text-gray-500">No products found.</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <RouterLink
        v-for="product in filteredProducts"
        :key="product.id"
        :to="productTo(product)"
        class="block h-full"
      >
        <StoreProductCard :product="product" />
      </RouterLink>
    </div>
  </div>
</template>
