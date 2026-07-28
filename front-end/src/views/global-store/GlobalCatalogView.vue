<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listGlobalProducts, type GlobalProduct } from '@/services/globalStore'
import { useGlobalStoreCartStore } from '@/stores/globalStoreCart'
import { Check, MapPin, Package, Search, ShoppingBag } from 'lucide-vue-next'
import SkeletonProductGrid from '@/components/ui/SkeletonProductGrid.vue'

const cart = useGlobalStoreCartStore()
const products = ref<GlobalProduct[]>([])
const loading = ref(true)
const searchQuery = ref('')
const shopFilter = ref<string>('all')

// Track which shop is selected per product; default to first in-stock shop
const selectedShops = ref<Map<string, string>>(new Map())
const justAdded = ref<Set<string>>(new Set())

onMounted(async () => {
  try {
    products.value = await listGlobalProducts()
    products.value.forEach((p) => {
      const firstInStock = p.shops.find((s) => s.inStock)
      if (firstInStock) {
        selectedShops.value.set(p.productId, firstInStock.shopId)
      }
    })
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
      (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
    )
  }

  if (shopFilter.value !== 'all') {
    list = list.filter((p) => p.shops.some((s) => s.shopId === shopFilter.value))
  }

  return list
})

function getShopForProduct(productId: string): string | undefined {
  return selectedShops.value.get(productId)
}

function selectShop(productId: string, shopId: string) {
  selectedShops.value.set(productId, shopId)
}

function isSelectedShopInStock(product: GlobalProduct): boolean {
  const shopId = getShopForProduct(product.productId)
  return !!product.shops.find((s) => s.shopId === shopId)?.inStock
}

function addToCart(product: GlobalProduct) {
  const shopId = getShopForProduct(product.productId)
  if (!shopId) return
  cart.addProduct(product, shopId)

  justAdded.value.add(product.productId)
  setTimeout(() => justAdded.value.delete(product.productId), 1200)
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Filters -->
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

    <SkeletonProductGrid v-if="loading" :count="8" :columns="3" />

    <div v-else-if="filteredProducts.length === 0" class="flex flex-col items-center gap-3 py-16 text-center">
      <Package class="h-10 w-10 text-gray-300" />
      <p class="text-gray-500">No products found.</p>
    </div>

    <div v-else class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="product in filteredProducts"
        :key="product.productId"
        class="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:border-gray-300"
      >
        <!-- Product image placeholder -->
        <div class="flex aspect-square items-center justify-center bg-gray-50">
          <Package class="h-12 w-12 text-gray-300" />
        </div>

        <div class="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h3 class="font-medium text-gray-900">{{ product.name }}</h3>
            <p v-if="product.description" class="mt-0.5 line-clamp-2 text-sm text-gray-500">
              {{ product.description }}
            </p>
          </div>

          <p class="text-lg font-semibold text-gray-900">{{ product.sellPrice }} DZD</p>

          <!-- Shop selection -->
          <div v-if="product.shops.length > 0" class="flex flex-col gap-2">
            <p class="text-xs font-medium text-gray-500">
              {{ product.shops.length > 1 ? `Available at ${product.shops.length} shops` : 'Available at' }}
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="shop in product.shops"
                :key="shop.shopId"
                type="button"
                :disabled="!shop.inStock"
                class="min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
                :class="
                  getShopForProduct(product.productId) === shop.shopId
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                "
                @click="selectShop(product.productId, shop.shopId)"
              >
                {{ shop.shopName }}
                <span v-if="!shop.inStock">· out of stock</span>
              </button>
            </div>
          </div>

          <button
            v-if="product.shops.length > 0"
            type="button"
            :disabled="!isSelectedShopInStock(product)"
            class="btn-primary mt-auto flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            @click="addToCart(product)"
          >
            <template v-if="justAdded.has(product.productId)">
              <Check class="h-4 w-4" />
              Added
            </template>
            <template v-else>
              <ShoppingBag class="h-4 w-4" />
              {{ isSelectedShopInStock(product) ? 'Add to cart' : 'Out of stock' }}
            </template>
          </button>
          <p v-else class="mt-auto text-center text-xs text-gray-400">Not available</p>
        </div>
      </div>
    </div>
  </div>
</template>
