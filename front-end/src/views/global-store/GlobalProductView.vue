<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import axios from 'axios'
import {
  getGlobalProduct,
  type PublicCatalogProductDetail,
  type PublicCatalogShop,
  type PublicCatalogVariant,
} from '@/services/globalStore'
import { useGlobalStoreCartStore } from '@/stores/globalStoreCart'
import ProductDetailSkeleton from '@/components/storefront/ProductDetailSkeleton.vue'
import ProductGallery from '@/components/storefront/ProductGallery.vue'
import VariantOptionGroup from '@/components/storefront/VariantOptionGroup.vue'
import { formatDzd, formatFromPrice } from '@/utils/formatMoney'
import {
  applyOptionChange,
  defaultSelection,
  findMatchingVariant,
  isOptionValueAvailable,
  labelForOptionKey,
  optionKeys,
  optionValues,
  type AttributeMap,
} from '@/utils/variantSelection'
import { Check, Loader2, Minus, Plus, ShoppingBag } from 'lucide-vue-next'

const route = useRoute()
const cart = useGlobalStoreCartStore()

const product = ref<PublicCatalogProductDetail | null>(null)
const loading = ref(true)
const notFound = ref(false)
const loadError = ref(false)
const selectedImageId = ref<string | null>(null)
const selection = ref<AttributeMap>({})
const selectedShopId = ref<string | null>(null)
const quantity = ref(1)
const addState = ref<'idle' | 'adding' | 'added'>('idle')

const shopFilter = computed(() => {
  const q = route.query.shop
  return typeof q === 'string' && q ? q : 'all'
})

onMounted(loadProduct)
watch(() => route.params.productId, loadProduct)

async function loadProduct() {
  loading.value = true
  notFound.value = false
  loadError.value = false
  product.value = null
  try {
    const id = String(route.params.productId ?? '')
    const data = await getGlobalProduct(id)
    product.value = data
    selectedImageId.value = data.images[0]?.id ?? null
    const visible = variantsForShop(data)
    const keys = optionKeys(visible)
    selection.value = defaultSelection(visible, keys)
    selectedShopId.value = initialShop(data)
    quantity.value = 1
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      notFound.value = true
    } else {
      loadError.value = true
    }
  } finally {
    loading.value = false
  }
}

function initialShop(data: PublicCatalogProductDetail): string | null {
  if (shopFilter.value !== 'all' && data.shops.some((shop) => shop.shopId === shopFilter.value)) {
    return shopFilter.value
  }
  return data.shops[0]?.shopId ?? null
}

function variantsForShop(data: PublicCatalogProductDetail) {
  if (shopFilter.value === 'all') return data.variants
  return data.variants.filter((variant) => variant.shops.some((shop) => shop.shopId === shopFilter.value))
}

const visibleVariants = computed(() => (product.value ? variantsForShop(product.value) : []))

const keys = computed(() => optionKeys(visibleVariants.value))

const selectedVariant = computed<PublicCatalogVariant | undefined>(() => {
  return findMatchingVariant(visibleVariants.value, selection.value, keys.value) as
    | PublicCatalogVariant
    | undefined
})

const shopsForVariant = computed<PublicCatalogShop[]>(() => selectedVariant.value?.shops ?? [])

const selectedShop = computed(() => {
  const shops = shopsForVariant.value
  if (shopFilter.value !== 'all') {
    return shops.find((shop) => shop.shopId === shopFilter.value) ?? null
  }
  return shops.find((shop) => shop.shopId === selectedShopId.value) ?? shops.find((shop) => shop.inStock) ?? shops[0] ?? null
})

const availableQty = computed(() => selectedShop.value?.quantity ?? 0)
const inStock = computed(() => (selectedShop.value?.inStock ?? false) && availableQty.value > 0)
const canAdd = computed(() => Boolean(selectedVariant.value && selectedShop.value && inStock.value && quantity.value >= 1 && quantity.value <= availableQty.value))

watch(selectedVariant, (variant) => {
  if (!variant) return
  const shops = variant.shops
  let shopId = selectedShopId.value
  if (shopFilter.value !== 'all') {
    shopId = shops.find((shop) => shop.shopId === shopFilter.value)?.shopId ?? null
  } else if (!shops.some((shop) => shop.shopId === shopId)) {
    shopId = shops.find((shop) => shop.inStock)?.shopId ?? shops[0]?.shopId ?? null
  }
  selectedShopId.value = shopId
  const max = shops.find((shop) => shop.shopId === shopId)?.quantity ?? 0
  if (quantity.value > max) {
    quantity.value = Math.max(1, max || 1)
  }
})

function chooseOption(key: string, value: string) {
  if (!isOptionValueAvailable(visibleVariants.value, keys.value, selection.value, key, value)) {
    return
  }
  selection.value = applyOptionChange(visibleVariants.value, keys.value, selection.value, key, value)
}

function disabledValues(key: string): string[] {
  return optionValues(visibleVariants.value, key).filter(
    (value) => !isOptionValueAvailable(visibleVariants.value, keys.value, selection.value, key, value),
  )
}

function decrement() {
  quantity.value = Math.max(1, quantity.value - 1)
}

function increment() {
  quantity.value = Math.min(Math.max(1, availableQty.value), quantity.value + 1)
}

function addToCart() {
  if (!canAdd.value || addState.value === 'adding' || !product.value || !selectedVariant.value || !selectedShop.value) {
    return
  }
  addState.value = 'adding'
  cart.addItem({
    productId: selectedVariant.value.id,
    shopId: selectedShop.value.shopId,
    shopName: selectedShop.value.shopName,
    name: product.value.name,
    variantLabel: selectedVariant.value.variantLabel,
    sellPrice: selectedVariant.value.sellPrice,
    quantity: quantity.value,
    maxQuantity: selectedShop.value.quantity,
  })
  addState.value = 'added'
  window.setTimeout(() => {
    if (addState.value === 'added') addState.value = 'idle'
  }, 1400)
}
</script>

<template>
  <div>
    <ProductDetailSkeleton v-if="loading" />

    <div v-else-if="notFound" class="flex flex-col items-center gap-4 py-16 text-center">
      <p class="text-lg font-medium text-gray-900">Product not found</p>
      <p class="text-sm text-gray-500">This product is unavailable or no longer listed.</p>
      <RouterLink to="/store" class="btn-primary">Back to Store</RouterLink>
    </div>

    <div v-else-if="loadError" class="flex flex-col items-center gap-4 py-16 text-center">
      <p class="text-lg font-medium text-gray-900">Something went wrong</p>
      <p class="text-sm text-gray-500">We could not load this product. Please try again.</p>
      <RouterLink to="/store" class="btn-secondary">Back to Store</RouterLink>
    </div>

    <div v-else-if="product" class="grid gap-8 lg:grid-cols-2 lg:items-start">
      <ProductGallery
        :images="product.images"
        :product-name="product.name"
        :selected-id="selectedImageId"
        @select="selectedImageId = $event"
      />

      <div class="flex flex-col gap-5">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">{{ product.name }}</h1>
          <p v-if="product.description?.trim()" class="mt-3 text-sm leading-6 text-gray-600">
            {{ product.description }}
          </p>
        </div>

        <p class="text-3xl font-semibold tracking-tight text-gray-900">
          {{
            selectedVariant
              ? formatDzd(selectedVariant.sellPrice)
              : formatFromPrice(product.fromPrice, product.hasPriceRange)
          }}
        </p>

        <template v-if="keys.length > 0">
          <VariantOptionGroup
            v-for="key in keys"
            :key="key"
            :option-key="key"
            :label="labelForOptionKey(key)"
            :values="optionValues(visibleVariants, key)"
            :model-value="selection[key]"
            :disabled-values="disabledValues(key)"
            @update:model-value="chooseOption(key, $event)"
          />
        </template>

        <div
          v-if="shopFilter === 'all' && shopsForVariant.length > 1"
          class="flex flex-col gap-2"
        >
          <p class="text-sm font-medium text-gray-900">Shop</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="shop in shopsForVariant"
              :key="shop.shopId"
              type="button"
              :disabled="!shop.inStock"
              class="min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
              :class="
                selectedShop?.shopId === shop.shopId
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              "
              @click="selectedShopId = shop.shopId"
            >
              {{ shop.shopName }}
              <span v-if="!shop.inStock"> · out of stock</span>
            </button>
          </div>
        </div>

        <p v-if="selectedVariant" class="text-sm text-gray-600">
          <template v-if="inStock">Available: {{ availableQty }}</template>
          <template v-else>Out of stock</template>
        </p>
        <p v-else class="text-sm text-gray-500">This combination is not available.</p>

        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-gray-900">Quantity</span>
          <div class="flex items-center rounded-md border border-gray-200">
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center text-gray-600 disabled:opacity-40"
              :disabled="quantity <= 1"
              @click="decrement"
            >
              <Minus class="h-4 w-4" />
            </button>
            <span class="w-8 text-center text-sm">{{ quantity }}</span>
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center text-gray-600 disabled:opacity-40"
              :disabled="!inStock || quantity >= availableQty"
              @click="increment"
            >
              <Plus class="h-4 w-4" />
            </button>
          </div>
        </div>

        <button
          type="button"
          class="btn-primary flex w-full items-center justify-center gap-2"
          :disabled="!canAdd || addState === 'adding'"
          @click="addToCart"
        >
          <Loader2 v-if="addState === 'adding'" class="h-4 w-4 animate-spin" />
          <Check v-else-if="addState === 'added'" class="h-4 w-4" />
          <ShoppingBag v-else class="h-4 w-4" />
          {{
            addState === 'adding'
              ? 'Adding...'
              : addState === 'added'
                ? 'Added to Cart'
                : !selectedVariant
                  ? 'Unavailable'
                  : inStock
                    ? 'Add to Cart'
                    : 'Out of Stock'
          }}
        </button>
        <RouterLink
          v-if="addState === 'added'"
          to="/store/checkout"
          class="btn-secondary w-full text-center"
        >
          View cart
        </RouterLink>
      </div>
    </div>
  </div>
</template>
