<script setup lang="ts">
import { ref, computed, watch, onMounted, onActivated, onBeforeUnmount, nextTick, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowLeft, ChevronRight, Search, SearchX, ShoppingBag, X } from 'lucide-vue-next'
import { api } from '@/services/api'
import { mediaUrl } from '@/services/products'
import { useAuthStore } from '@/stores/auth'
import { usePosCartStore } from '@/stores/posCart'
import PayLaterConfirm from '@/components/pos/PayLaterConfirm.vue'
import PosSuccessDialog from '@/components/pos/PosSuccessDialog.vue'
import PosCartPanel from '@/components/pos/PosCartPanel.vue'
import PosProductTile from '@/components/pos/PosProductTile.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { playPosErrorSound, playPosSuccessSound } from '@/composables/usePosSounds'
import { printPosReceipt, saleToReceipt, type SaleReceiptData } from '@/utils/printPosReceipt'
import { formatCount, formatMoney } from '@/utils/formatMoney'
import { isTouchDevice, shortcutLabel } from '@/utils/platform'
import type { Client, PosProduct, Sale } from '@/types/api'
import { groupByCategory, variantDisplay, type ProductFamilyGroup } from '@/utils/productFamily'

const { t } = useI18n()
const auth = useAuthStore()
const cart = usePosCartStore()
const products = ref<PosProduct[]>([])
const loading = ref(true)
const search = ref('')
/** Currently opened product family; `null` shows the family picker. */
const selectedFamily = ref<string | null>(null)
/** Size chip on the variant screen; `null` shows every variant. */
const sizeFilter = ref<string | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const paymentMethod = ref<'CASH' | 'CARD'>('CASH')
const error = ref('')
const submitting = ref(false)
const showConfirm = ref(false)
const pendingOverride = ref(false)
const successReceipt = ref<SaleReceiptData | null>(null)

// Keyboard product-grid nav state
const highlightIndex = ref<number | null>(null)
const pendingQty = ref(1)

// Cart is a bottom sheet below `lg`
const cartDrawerOpen = ref(false)

// Two-stage checkout state
const confirmStage = ref(false)
const cartPanelRef = ref<InstanceType<typeof PosCartPanel> | null>(null)
const sheetPanelRef = ref<InstanceType<typeof PosCartPanel> | null>(null)

const registerApi = inject<{
  value: { focusSearch: () => void; completeSale: () => void; clearCart: () => void } | null
} | null>('posRegisterApi', null)

const query = computed(() => search.value.trim().toLowerCase())

const allFamilies = computed(() => groupByCategory(products.value))

function variantMatchesQuery(product: PosProduct, q: string): boolean {
  if (!q) return true
  return (
    product.name.toLowerCase().includes(q) ||
    variantDisplay(product).toLowerCase().includes(q)
  )
}

/** Family cards on the first screen; search matches family name or any variant. */
const familyCards = computed(() => {
  const q = query.value
  if (!q) return allFamilies.value
  return allFamilies.value.filter(
    (group) =>
      group.category.toLowerCase().includes(q) ||
      group.variants.some((product) => variantMatchesQuery(product, q)),
  )
})

const selectedGroup = computed(
  () => allFamilies.value.find((group) => group.category === selectedFamily.value) ?? null,
)

/** Distinct sizes in the opened family, in first-seen order. */
const sizes = computed(() => {
  const seen = new Set<string>()
  for (const product of selectedGroup.value?.variants ?? []) {
    const size = product.attributes?.size
    if (size) seen.add(size)
  }
  return [...seen]
})

/** Variants of the opened family, filtered by the search bar and size chip. */
const variantCards = computed(() => {
  const group = selectedGroup.value
  if (!group) return []
  return group.variants.filter(
    (product) =>
      variantMatchesQuery(product, query.value) &&
      (!sizeFilter.value || product.attributes?.size === sizeFilter.value),
  )
})

const totalStock = computed(() => products.value.reduce((sum, product) => sum + product.quantity, 0))

function familyStock(group: ProductFamilyGroup<PosProduct>): number {
  return group.variants.reduce((sum, product) => sum + product.quantity, 0)
}

function familyImage(group: ProductFamilyGroup<PosProduct>): string | null {
  const url = group.variants.find((product) => product.imageUrl)?.imageUrl
  return url ? mediaUrl(url) : null
}

/** "1,000.00 DZD" when every variant shares a price, else "From 1,000.00 DZD". */
function familyPrice(group: ProductFamilyGroup<PosProduct>): string {
  const prices = group.variants.map((product) => Number(product.sellPrice))
  const min = Math.min(...prices)
  return prices.every((price) => price === min)
    ? formatMoney(min)
    : t('pos.register.fromPrice', { price: formatMoney(min) })
}

function selectFamily(category: string) {
  selectedFamily.value = category
  sizeFilter.value = null
  search.value = ''
  highlightIndex.value = null
  pendingQty.value = 1
}

function clearFamily() {
  selectedFamily.value = null
  sizeFilter.value = null
  highlightIndex.value = null
  pendingQty.value = 1
}

watch(
  () => cart.total,
  () => cart.syncAmountPaid(),
)

watch(
  () => cart.selectedClient,
  (client) => {
    if (!client) {
      cart.setCheckoutMode('full')
    }
  },
)

// Reset highlight when the typed search or size chip changes
watch([search, sizeFilter], () => {
  highlightIndex.value = null
  pendingQty.value = 1
})

async function loadProducts() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const { data } = await api.get<{ data: PosProduct[] }>(`/shops/${shopId}/pos/products`)
    products.value = data.data
  } finally {
    loading.value = false
  }
}

function onPrintReceipt() {
  if (successReceipt.value) printPosReceipt(successReceipt.value)
}

async function executeCheckout(creditLimitOverride = false) {
  const shopId = auth.selectedShopId
  if (!shopId || !cart.lines.length || submitting.value) return
  error.value = ''
  submitting.value = true
  try {
    const body: Record<string, unknown> = {
      lines: cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      paymentMethod: paymentMethod.value,
    }
    if (cart.selectedClient) {
      body.clientId = cart.selectedClient.id
      body.amountPaid = cart.amountPaid
      if (cart.checkoutMode === 'payLater') {
        body.payLater = true
        body.amountPaid = 0
      }
      if (creditLimitOverride) {
        body.creditLimitOverride = true
      }
    } else {
      body.amountPaid = cart.total
    }
    const { data } = await api.post<{ data: Sale }>(`/shops/${shopId}/pos/sales`, body)
    playPosSuccessSound()
    successReceipt.value = saleToReceipt(data.data, auth.staff?.name ?? t('common.staff'))
    cart.clear()
    showConfirm.value = false
    confirmStage.value = false
    cartDrawerOpen.value = false
    await loadProducts()
  } catch {
    error.value = t('pos.register.errorCheckoutFailed')
    playPosErrorSound()
  } finally {
    submitting.value = false
  }
}

function checkout() {
  if (!cart.lines.length) return
  if (cart.selectedClient && (cart.checkoutMode === 'payLater' || cart.checkoutMode === 'partial' || cart.amountOnCredit > 0)) {
    if (cart.creditLimitExceeded) {
      if (!auth.isManager) {
        error.value = t('pos.register.errorCreditLimit')
        return
      }
      pendingOverride.value = true
      showConfirm.value = true
      return
    }
    if (cart.checkoutMode === 'payLater') {
      pendingOverride.value = false
      showConfirm.value = true
      return
    }
  }
  executeCheckout()
}

function onConfirm(creditLimitOverride: boolean) {
  executeCheckout(creditLimitOverride)
}

// --- Keyboard-driven product grid (local to the search input) ---
function scrollHighlightedIntoView() {
  nextTick(() => {
    if (highlightIndex.value === null) return
    document.getElementById(`pos-card-${highlightIndex.value}`)?.scrollIntoView({ block: 'nearest' })
  })
}

function onSearchKeydown(event: KeyboardEvent) {
  const items = selectedFamily.value ? variantCards.value : familyCards.value
  const len = items.length
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!len) return
    highlightIndex.value = highlightIndex.value === null ? 0 : Math.min(len - 1, highlightIndex.value + 1)
    scrollHighlightedIntoView()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!len) return
    highlightIndex.value = highlightIndex.value === null ? 0 : Math.max(0, highlightIndex.value - 1)
    scrollHighlightedIntoView()
  } else if (event.key === 'ArrowRight') {
    if (selectedFamily.value && highlightIndex.value !== null) {
      event.preventDefault()
      pendingQty.value += 1
    }
  } else if (event.key === 'ArrowLeft') {
    if (selectedFamily.value && highlightIndex.value !== null) {
      event.preventDefault()
      pendingQty.value = Math.max(1, pendingQty.value - 1)
    }
  } else if (event.key === 'Enter') {
    if (highlightIndex.value === null) return
    event.preventDefault()
    if (!selectedFamily.value) {
      const group = familyCards.value[highlightIndex.value]
      if (group) selectFamily(group.category)
      return
    }
    const product = variantCards.value[highlightIndex.value]
    if (product) {
      cart.addProductQty(product, pendingQty.value)
      pendingQty.value = 1
    }
  } else if (event.key === 'Escape') {
    // Handled here so the global Esc (clear cart) only fires outside the search.
    event.preventDefault()
    if (selectedFamily.value) {
      clearFamily()
      return
    }
    search.value = ''
    highlightIndex.value = null
    pendingQty.value = 1
  }
}

// --- Two-stage Cmd+Enter checkout flow ---
function completeSale() {
  if (!cart.lines.length) return
  if (cart.selectedClient) {
    checkout()
  } else {
    confirmStage.value = true
    nextTick(() => (cartDrawerOpen.value ? sheetPanelRef.value : cartPanelRef.value)?.focusClient())
  }
}

function onClientConfirm(client: Client | null) {
  cart.selectClient(client)
  checkout()
}

function clearCart() {
  if (cart.lines.length) cart.clear()
  confirmStage.value = false
  error.value = ''
}

function focusSearch() {
  searchInputRef.value?.focus()
  searchInputRef.value?.select()
}

// Hotkeys live in the layout; it drives the register through this handle.
if (registerApi) {
  registerApi.value = { focusSearch, completeSale, clearCart }
  onBeforeUnmount(() => {
    registerApi.value = null
  })
}

onMounted(loadProducts)
onActivated(loadProducts)
</script>

<template>
  <div class="flex h-full min-h-0 w-full">
    <!-- Search lives in the unified top bar -->
    <Teleport defer to="#pos-header-search">
      <div class="relative w-full">
        <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pos-faint" aria-hidden="true" />
        <input
          ref="searchInputRef"
          v-model="search"
          type="search"
          :placeholder="selectedFamily ? $t('pos.register.searchVariants') : $t('pos.register.searchFamilies')"
          :aria-label="$t('pos.shortcuts.searchProducts')"
          class="pos-input pos-input-icon h-10 border-transparent bg-pos-canvas pe-12 hover:border-transparent focus:bg-white [&::-webkit-search-cancel-button]:hidden"
          autocomplete="off"
          @keydown="onSearchKeydown"
        />
        <button
          v-if="search"
          type="button"
          class="absolute end-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-pos-muted hover:bg-black/5"
          :aria-label="$t('pos.register.clearSearch')"
          @click="search = ''; searchInputRef?.focus()"
        >
          <X class="h-3.5 w-3.5" />
        </button>
        <kbd v-else-if="!isTouchDevice" class="pos-kbd pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 bg-white">{{ shortcutLabel('F2', '⌥2') }}</kbd>
      </div>
    </Teleport>

    <div class="relative flex h-full min-h-0 w-full">
      <!-- Catalog -->
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="min-h-0 flex-1 overflow-y-auto px-4 pt-5 pb-6 sm:px-6 lg:px-8 lg:pt-7">
          <!-- Catalog header: breadcrumb, title, filters -->
          <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div class="min-w-0">
              <nav :aria-label="$t('pos.register.breadcrumb')" class="mb-1.5 flex items-center gap-1 text-[13px] text-pos-muted">
                <button
                  v-if="selectedFamily"
                  type="button"
                  class="rounded-md transition-colors hover:text-pos-ink"
                  @click="clearFamily"
                >
                  {{ $t('pos.register.catalog') }}
                </button>
                <span v-else aria-current="page">{{ $t('pos.register.catalog') }}</span>
                <template v-if="selectedFamily">
                  <ChevronRight class="h-3.5 w-3.5 text-pos-faint rtl:rotate-180" aria-hidden="true" />
                  <span class="font-medium text-pos-ink" aria-current="page">{{ selectedFamily }}</span>
                </template>
              </nav>
              <div class="flex items-center gap-2">
                <button
                  v-if="selectedFamily"
                  type="button"
                  class="pos-icon-btn -ms-2 h-9 w-9"
                  :aria-label="$t('pos.register.allFamilies')"
                  @click="clearFamily"
                >
                  <ArrowLeft class="h-[18px] w-[18px] rtl:rotate-180" />
                </button>
                <h1 class="pos-page-title truncate">{{ selectedFamily ?? $t('pos.register.allProducts') }}</h1>
              </div>
              <p class="pos-page-sub pos-num">
                <template v-if="selectedGroup">
                  {{ $t('pos.register.variantCount', { n: formatCount(selectedGroup.variants.length) }, selectedGroup.variants.length) }}
                  · {{ $t('pos.register.stock', { n: formatCount(familyStock(selectedGroup)) }) }}
                </template>
                <template v-else-if="!loading">
                  {{ $t('pos.register.familyCount', { n: formatCount(allFamilies.length) }, allFamilies.length) }}
                  · {{ $t('pos.register.stock', { n: formatCount(totalStock) }) }}
                </template>
              </p>
            </div>

            <!-- Size chips (variant screen) -->
            <div
              v-if="selectedFamily && sizes.length > 1"
              class="flex flex-wrap items-center gap-2"
              role="group"
              :aria-label="$t('pos.register.filterBySize')"
            >
              <button type="button" class="pos-chip" :aria-pressed="sizeFilter === null" @click="sizeFilter = null">
                {{ $t('pos.register.allSizes') }}
              </button>
              <button
                v-for="size in sizes"
                :key="size"
                type="button"
                class="pos-chip min-w-10 justify-center"
                :aria-pressed="sizeFilter === size"
                @click="sizeFilter = sizeFilter === size ? null : size"
              >
                {{ size }}
              </button>
            </div>

            <!-- Keyboard quantity hint while a variant is highlighted -->
            <p
              v-if="selectedFamily && highlightIndex !== null && !isTouchDevice"
              class="flex items-center gap-1.5 text-[12px] text-pos-muted"
              aria-live="polite"
            >
              <kbd class="pos-kbd">←</kbd><kbd class="pos-kbd">→</kbd>
              {{ $t('pos.register.qtyHint') }}
              <kbd class="pos-kbd ms-1.5">↵</kbd>
              {{ $t('pos.register.addQty', { n: formatCount(pendingQty) }) }}
            </p>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]" role="status">
            <span class="sr-only">{{ $t('common.loading') }}</span>
            <div v-for="i in 8" :key="i" class="pos-surface overflow-hidden">
              <div class="pos-skeleton aspect-[4/3] rounded-none" />
              <div class="flex flex-col gap-2 p-4">
                <div class="pos-skeleton h-4 w-2/3" />
                <div class="pos-skeleton h-3 w-1/3" />
                <div class="pos-skeleton mt-2 h-4 w-1/2" />
              </div>
            </div>
          </div>

          <!-- Families -->
          <div
            v-else-if="!selectedFamily"
            class="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]"
          >
            <PosProductTile
              v-for="(group, index) in familyCards"
              :id="`pos-card-${index}`"
              :key="group.category"
              class="pos-rise"
              :style="{ '--i': Math.min(index, 12) }"
              :title="group.category"
              :subtitle="$t('pos.register.variantCount', { n: formatCount(group.variants.length) }, group.variants.length)"
              :price="familyPrice(group)"
              :stock="familyStock(group)"
              :image-url="familyImage(group)"
              :highlighted="highlightIndex === index"
              @click="selectFamily(group.category)"
            />
          </div>

          <!-- Variants -->
          <div
            v-else
            class="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]"
          >
            <PosProductTile
              v-for="(product, index) in variantCards"
              :id="`pos-card-${index}`"
              :key="product.productId"
              class="pos-rise"
              :style="{ '--i': Math.min(index, 12) }"
              dense
              :title="variantDisplay(product)"
              :subtitle="selectedFamily"
              :price="formatMoney(product.sellPrice)"
              :stock="product.quantity"
              :image-url="product.imageUrl ? mediaUrl(product.imageUrl) : null"
              :in-cart="cart.quantityOf(product.productId)"
              :highlighted="highlightIndex === index"
              :disabled="cart.quantityOf(product.productId) >= product.quantity"
              @click="cart.addProduct(product)"
            />
          </div>

          <PosEmptyState
            v-if="!loading && ((!selectedFamily && !familyCards.length) || (selectedFamily && !variantCards.length))"
            :icon="SearchX"
            :title="search ? $t('pos.register.noResultsTitle', { q: search }) : $t('pos.register.noProductsTitle')"
            :body="selectedFamily ? $t('pos.register.emptyVariants') : $t('pos.register.emptyFamilies')"
          >
            <button v-if="search" type="button" class="pos-btn-soft pos-btn-sm mt-1" @click="search = ''">
              {{ $t('pos.register.clearSearch') }}
            </button>
          </PosEmptyState>
        </div>

        <!-- Phone/tablet: floating cart bar -->
        <Transition name="pos-pop">
          <div v-if="cart.lines.length && !cartDrawerOpen" class="shrink-0 px-4 pb-4 lg:hidden" style="padding-bottom: max(1rem, env(safe-area-inset-bottom))">
            <button
              type="button"
              class="pos-btn-primary h-14 w-full justify-between rounded-2xl px-5 text-[15px]"
              @click="cartDrawerOpen = true"
            >
              <span class="flex items-center gap-2.5">
                <ShoppingBag class="h-[18px] w-[18px]" />
                {{ $t('pos.register.viewCart') }}
                <span class="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white/15 px-2 text-[12px] pos-num">{{ formatCount(cart.itemCount) }}</span>
              </span>
              <span class="pos-num">{{ formatMoney(cart.total) }}</span>
            </button>
          </div>
        </Transition>
      </div>

      <!-- Desktop cart -->
      <aside class="hidden w-[400px] shrink-0 py-4 pe-4 lg:flex xl:w-[420px]">
        <div class="pos-surface flex w-full flex-col overflow-hidden">
          <PosCartPanel
            ref="cartPanelRef"
            v-model:payment-method="paymentMethod"
            mode="panel"
            :confirm-stage="confirmStage"
            :error="error"
            :busy="submitting"
            @complete-sale="completeSale"
            @client-confirm="onClientConfirm"
            @clear="clearCart"
          />
        </div>
      </aside>

      <!-- Phone/tablet: cart bottom sheet -->
      <Transition name="pos-modal">
        <div v-if="cartDrawerOpen" class="pos-backdrop lg:hidden" @click.self="cartDrawerOpen = false">
          <div class="pos-dialog h-[88vh] sm:h-[85vh] sm:max-w-lg">
            <PosCartPanel
              ref="sheetPanelRef"
              v-model:payment-method="paymentMethod"
              mode="sheet"
              :confirm-stage="confirmStage"
              :error="error"
              :busy="submitting"
              @complete-sale="completeSale"
              @client-confirm="onClientConfirm"
              @clear="clearCart"
              @close="cartDrawerOpen = false"
            />
          </div>
        </div>
      </Transition>
    </div>

    <PayLaterConfirm
      v-if="showConfirm && cart.selectedClient"
      :client="cart.selectedClient"
      :total="cart.total"
      :amount-paid="cart.amountPaid"
      :amount-on-credit="cart.amountOnCredit"
      :limit-override="pendingOverride"
      @close="showConfirm = false"
      @confirm="onConfirm"
    />

    <PosSuccessDialog
      v-if="successReceipt"
      :title="$t('pos.register.successTitle')"
      :message="$t('pos.register.successMessage', { total: formatMoney(successReceipt.total), paid: formatMoney(successReceipt.amountPaid) })"
      @close="successReceipt = null"
      @print="onPrintReceipt"
    />
  </div>
</template>
