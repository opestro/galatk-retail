<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import { getGlobalProduct, type PublicCatalogProductDetail, type PublicCatalogShop, type PublicCatalogVariant } from '@/services/globalStore'
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
import { Check, ChevronDown, Loader2, PackageCheck, SearchX, ShoppingBag, Store, Truck } from 'lucide-vue-next'
import ProductOrderForm from '@/components/storefront/ProductOrderForm.vue'
import QuantityStepper from '@/components/storefront/QuantityStepper.vue'
import StoreBreadcrumb from '@/components/storefront/StoreBreadcrumb.vue'
import StoreEmptyState from '@/components/storefront/StoreEmptyState.vue'
import StoreProductCard from '@/components/storefront/StoreProductCard.vue'
import WishlistButton from '@/components/storefront/WishlistButton.vue'
import { mediaUrl } from '@/services/products'
import { useGlobalCatalogStore } from '@/stores/globalCatalog'
import { primaryImageUrl } from '@/utils/storeCatalog'

const MAX_ORDER_QUANTITY = 99

const { t } = useI18n()
const route = useRoute()
const cart = useGlobalStoreCartStore()
const catalog = useGlobalCatalogStore()

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

onMounted(() => {
  void loadProduct()
  void catalog.load()
})
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
  return shops.find((shop) => shop.shopId === selectedShopId.value) ?? shops[0] ?? null
})

const canAdd = computed(() => Boolean(selectedVariant.value && selectedShop.value && quantity.value >= 1))

watch(selectedVariant, (variant) => {
  if (!variant) return
  const shops = variant.shops
  let shopId = selectedShopId.value
  if (shopFilter.value !== 'all') {
    shopId = shops.find((shop) => shop.shopId === shopFilter.value)?.shopId ?? null
  } else if (!shops.some((shop) => shop.shopId === shopId)) {
    shopId = shops[0]?.shopId ?? null
  }
  selectedShopId.value = shopId
  if (quantity.value > MAX_ORDER_QUANTITY) {
    quantity.value = MAX_ORDER_QUANTITY
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
    maxQuantity: MAX_ORDER_QUANTITY,
    image: cartImage.value,
    slug: product.value.slug,
  })
  addState.value = 'added'
  window.setTimeout(() => {
    if (addState.value === 'added') addState.value = 'idle'
  }, 1400)
}

/** Image shown on the cart line: the photo being viewed, else the cover. */
const cartImage = computed(() => {
  if (!product.value) return null
  const viewed = product.value.images.find((image) => image.id === selectedImageId.value)
  return viewed ? mediaUrl(viewed.url) : primaryImageUrl(product.value)
})

const stockLabel = computed(() => {
  if (!selectedShop.value) return ''
  return selectedShop.value.inStock ? t('shop.product.inStock') : t('shop.product.toOrder')
})

const breadcrumb = computed(() => {
  const items: Array<{ label: string; to?: string | { name: string; query?: Record<string, string> } }> = [
    { label: t('shop.breadcrumb.home'), to: '/store' },
    { label: t('shop.breadcrumb.shop'), to: { name: 'global-store-shop' } },
  ]
  if (product.value?.category && product.value.category.toLowerCase() !== product.value.name.toLowerCase()) {
    items.push({ label: product.value.category, to: { name: 'global-store-shop', query: { category: product.value.category } } })
  }
  if (product.value) items.push({ label: product.value.name })
  return items
})

/** Category eyebrow, skipped when it merely repeats the product name. */
const categoryLabel = computed(() => {
  const category = product.value?.category?.trim()
  if (!category || category.toLowerCase() === product.value?.name.trim().toLowerCase()) return ''
  return category
})

/** Short descriptions sit in the panel; longer ones move to the accordion. */
const DESCRIPTION_INLINE_LIMIT = 220
const description = computed(() => product.value?.description?.trim() ?? '')
const descriptionInline = computed(() => description.value.length > 0 && description.value.length <= DESCRIPTION_INLINE_LIMIT)

const related = computed(() => (product.value ? catalog.related(product.value.id, product.value.category) : []))

function relatedTo(id: string, slug: string) {
  return { name: 'global-store-product' as const, params: { productId: slug || id } }
}

const priceLabel = computed(() => {
  if (!product.value) return ''
  return selectedVariant.value
    ? formatDzd(selectedVariant.value.sellPrice)
    : formatFromPrice(product.value.fromPrice, product.value.hasPriceRange)
})

const addButtonLabel = computed(() => {
  if (addState.value === 'adding') return t('shop.product.adding')
  if (addState.value === 'added') return t('shop.product.added')
  if (!selectedVariant.value) return t('shop.product.unavailable')
  return t('shop.product.addToCart')
})
</script>

<template>
  <div>
    <div class="sf-container pb-20 pt-6 md:pt-10">
      <ProductDetailSkeleton v-if="loading" />

      <StoreEmptyState
        v-else-if="notFound"
        :icon="SearchX"
        :title="$t('shop.product.notFoundTitle')"
        :body="$t('shop.product.notFoundBody')"
      >
        <RouterLink to="/store" class="sf-btn">{{ $t('shop.product.backToStore') }}</RouterLink>
      </StoreEmptyState>

      <StoreEmptyState
        v-else-if="loadError"
        :title="$t('shop.product.loadErrorTitle')"
        :body="$t('shop.product.loadErrorBody')"
      >
        <button type="button" class="sf-btn" @click="loadProduct">{{ $t('shop.catalog.retry') }}</button>
        <RouterLink to="/store" class="sf-btn-outline">{{ $t('shop.product.backToStore') }}</RouterLink>
      </StoreEmptyState>

      <template v-else-if="product">
        <StoreBreadcrumb :items="breadcrumb" class="mb-6 hidden md:block md:mb-8" />

        <div class="grid gap-10 lg:grid-cols-12 lg:gap-20">
          <ProductGallery
            class="lg:col-span-7"
            :images="product.images"
            :product-name="product.name"
            :selected-id="selectedImageId"
            @select="selectedImageId = $event"
          />

          <!-- Purchase panel -->
          <div class="lg:col-span-5">
            <div class="flex flex-col lg:sticky lg:top-32 lg:pt-6">
              <p v-if="categoryLabel" class="sf-eyebrow">{{ categoryLabel }}</p>
              <h1 class="sf-display mt-4 text-[2.6rem] md:text-[3.5rem] rtl:text-[2.1rem] rtl:md:text-[2.75rem]">{{ product.name }}</h1>
              <!-- Price crossfades when a different variant is chosen. -->
              <Transition name="sf-fade" mode="out-in">
                <p :key="priceLabel" class="sf-figure mt-5 text-[17px] tracking-[0.04em] text-ink">{{ priceLabel }}</p>
              </Transition>
              <p v-if="descriptionInline" class="mt-7 max-w-md whitespace-pre-line text-[14.5px] leading-[1.8] text-ink-soft">
                {{ description }}
              </p>

              <div class="mt-10 flex flex-col gap-8 border-t border-line pt-10">
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

                <fieldset v-if="shopFilter === 'all' && shopsForVariant.length > 1">
                  <legend class="sf-eyebrow mb-4 text-ink">{{ $t('shop.product.shopLabel') }}</legend>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="shop in shopsForVariant"
                      :key="shop.shopId"
                      type="button"
                      class="sf-chip h-11"
                      :class="{ 'sf-chip-active': selectedShop?.shopId === shop.shopId }"
                      :aria-pressed="selectedShop?.shopId === shop.shopId"
                      @click="selectedShopId = shop.shopId"
                    >
                      <Store class="h-3.5 w-3.5" stroke-width="1.25" />
                      {{ shop.shopName }}
                    </button>
                  </div>
                </fieldset>

                <Transition name="sf-fade" mode="out-in">
                <p v-if="!selectedVariant" class="text-sm text-alert" role="status">{{ $t('shop.product.comboUnavailable') }}</p>
                <p v-else-if="stockLabel" :key="`${stockLabel}-${selectedShop?.shopId}`" class="flex items-center gap-2 text-[13px] text-ink-soft">
                  <span class="h-1.5 w-1.5 rounded-full" :class="selectedShop?.inStock ? 'bg-ok' : 'bg-taupe'" />
                  {{ stockLabel }}<template v-if="selectedShop"> · {{ selectedShop.shopName }}</template>
                </p>
                </Transition>
              </div>

              <div class="mt-10 flex gap-2">
                <QuantityStepper v-model="quantity" :max="MAX_ORDER_QUANTITY" :label="$t('shop.product.quantity')" />
                <button
                  type="button"
                  class="sf-btn flex-1 px-4"
                  :disabled="!canAdd || addState === 'adding'"
                  @click="addToCart"
                >
                  <Loader2 v-if="addState === 'adding'" class="h-4 w-4 animate-spin" />
                  <Check v-else-if="addState === 'added'" class="h-4 w-4" />
                  <ShoppingBag v-else class="h-4 w-4" stroke-width="1.25" />
                  {{ addButtonLabel }}
                </button>
                <WishlistButton :product="product" variant="boxed" />
              </div>
              <RouterLink
                v-if="addState === 'added'"
                :to="{ name: 'global-store-cart' }"
                class="sf-link mt-4 self-start"
              >
                {{ $t('shop.product.goToCart') }}
              </RouterLink>

              <ul class="mt-10 flex flex-col gap-3.5 text-[13px] leading-relaxed text-ink-soft">
                <li class="flex items-start gap-3">
                  <Truck class="mt-px h-[18px] w-[18px] shrink-0 text-taupe" stroke-width="1.25" />
                  {{ $t('shop.product.deliveryInfo') }}
                </li>
                <li class="flex items-start gap-3">
                  <Store class="mt-px h-[18px] w-[18px] shrink-0 text-taupe" stroke-width="1.25" />
                  {{ selectedShop ? $t('shop.product.pickupInfo', { shop: selectedShop.shopName }) : $t('shop.product.pickupInfoGeneric') }}
                </li>
                <li class="flex items-start gap-3">
                  <PackageCheck class="mt-px h-[18px] w-[18px] shrink-0 text-taupe" stroke-width="1.25" />
                  {{ $t('shop.product.accountInfo') }}
                </li>
              </ul>

              <div class="mt-10 border-t border-line">
                <details v-if="description && !descriptionInline" class="group border-b border-line" open>
                  <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between font-label text-[11px] font-medium uppercase tracking-[0.2em] text-ink rtl:text-[14px] rtl:tracking-normal [&::-webkit-details-marker]:hidden">
                    {{ $t('shop.product.description') }}
                    <ChevronDown class="h-4 w-4 transition-transform group-open:rotate-180" stroke-width="1.25" />
                  </summary>
                  <p class="whitespace-pre-line pb-6 text-[15px] leading-relaxed text-ink-soft">{{ description }}</p>
                </details>
                <details v-if="selectedVariant && selectedShop" class="group border-b border-line">
                  <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between font-label text-[11px] font-medium uppercase tracking-[0.2em] text-ink rtl:text-[14px] rtl:tracking-normal [&::-webkit-details-marker]:hidden">
                    {{ $t('shop.product.orderDirectly') }}
                    <ChevronDown class="h-4 w-4 transition-transform group-open:rotate-180" stroke-width="1.25" />
                  </summary>
                  <div class="pb-8">
                    <ProductOrderForm
                      :product-id="selectedVariant.id"
                      :shop-id="selectedShop.shopId"
                      :sell-price="selectedVariant.sellPrice"
                      :quantity="quantity"
                    />
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Related -->
    <section v-if="product && related.length > 0" class="border-t border-line">
      <div class="sf-container sf-section">
        <p class="sf-eyebrow">{{ $t('shop.product.relatedEyebrow') }}</p>
        <h2 class="sf-heading mt-4">{{ $t('shop.product.relatedTitle') }}</h2>
        <div class="sf-grid mt-12 md:mt-16">
          <StoreProductCard
            v-for="item in related"
            :key="item.id"
            :product="item"
            :to="relatedTo(item.id, item.slug)"
          />
        </div>
      </div>
    </section>
  </div>
</template>
