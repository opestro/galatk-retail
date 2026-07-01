<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick, inject } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { usePosCartStore } from '@/stores/posCart'
import { usePosHotkeys } from '@/composables/usePosHotkeys'
import type { PosProduct } from '@/types/api'
import type { Client } from '@/types/api'
import SkeletonProductGrid from '@/components/ui/SkeletonProductGrid.vue'
import ClientPicker from '@/components/pos/ClientPicker.vue'
import PayLaterConfirm from '@/components/pos/PayLaterConfirm.vue'

const auth = useAuthStore()
const cart = usePosCartStore()
const products = ref<PosProduct[]>([])
const loading = ref(true)
const search = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)
const paymentMethod = ref<'CASH' | 'CARD'>('CASH')
const message = ref('')
const error = ref('')
const showConfirm = ref(false)
const pendingOverride = ref(false)

// Keyboard product-grid nav state
const highlightIndex = ref<number | null>(null)
const pendingQty = ref(1)

// Two-stage checkout state
const confirmStage = ref(false)
const clientPickerRef = ref<InstanceType<typeof ClientPicker> | null>(null)

const openPaymentModal = inject<(() => void) | undefined>('posOpenPayment', undefined)
const registerApi = inject<{ value: { focusSearch: () => void; completeSale: () => void } | null } | null>(
  'posRegisterApi',
  null,
)

const filtered = computed(() =>
  products.value.filter((p) => p.name.toLowerCase().includes(search.value.toLowerCase())),
)

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

// Reset highlight when the typed search changes
watch(search, () => {
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

function onClientChange(client: typeof cart.selectedClient) {
  cart.selectClient(client)
}

function onCheckoutModeChange(mode: 'full' | 'partial' | 'payLater') {
  if (mode === 'payLater' && !auth.isManager) return
  cart.setCheckoutMode(mode)
}

async function executeCheckout(creditLimitOverride = false) {
  const shopId = auth.selectedShopId
  if (!shopId || !cart.lines.length) return
  error.value = ''
  message.value = ''
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
    await api.post(`/shops/${shopId}/pos/sales`, body)
    message.value = 'Sale completed'
    cart.clear()
    showConfirm.value = false
    confirmStage.value = false
    await loadProducts()
  } catch {
    error.value = 'Checkout failed — check stock, client, or credit limit'
  }
}

function checkout() {
  if (!cart.lines.length) return
  if (cart.selectedClient && (cart.checkoutMode === 'payLater' || cart.checkoutMode === 'partial' || cart.amountOnCredit > 0)) {
    if (cart.creditLimitExceeded) {
      if (!auth.isManager) {
        error.value = 'Credit limit exceeded — manager approval required'
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
  const len = filtered.value.length
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
    if (highlightIndex.value !== null) {
      event.preventDefault()
      pendingQty.value += 1
    }
  } else if (event.key === 'ArrowLeft') {
    if (highlightIndex.value !== null) {
      event.preventDefault()
      pendingQty.value = Math.max(1, pendingQty.value - 1)
    }
  } else if (event.key === 'Enter') {
    if (highlightIndex.value !== null) {
      event.preventDefault()
      const product = filtered.value[highlightIndex.value]
      if (product) {
        cart.addProductQty(product, pendingQty.value)
        pendingQty.value = 1
      }
    }
  } else if (event.key === 'Escape') {
    event.preventDefault()
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
    clientPickerRef.value?.focus()
  }
}

function onClientConfirm(client: Client | null) {
  cart.selectClient(client)
  checkout()
}

usePosHotkeys({
  onFocusSearch: () => searchInputRef.value?.focus(),
  onRecordPayment: () => openPaymentModal?.(),
  onCompleteSale: completeSale,
  onClearCart: () => {
    if (cart.lines.length) cart.clear()
    confirmStage.value = false
  },
})

// Expose handlers to the layout quick-action buttons (direct calls, no synthetic events)
if (registerApi) {
  registerApi.value = {
    focusSearch: () => searchInputRef.value?.focus(),
    completeSale,
  }
}

onMounted(loadProducts)
</script>

<template>
  <div class="relative flex h-full w-full min-h-0">
    <!-- Left column: search + product grid -->
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="shrink-0 border-b border-gray-200 bg-white p-3">
        <input
          ref="searchInputRef"
          v-model="search"
          placeholder="Search products… (F2 / ⌥2)"
          class="input text-base"
          @keydown="onSearchKeydown"
        />
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-3">
        <SkeletonProductGrid v-if="loading" :count="8" />
        <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="(product, i) in filtered"
            :key="product.productId"
            :id="`pos-card-${i}`"
            type="button"
            class="card relative flex min-h-[88px] flex-col justify-between text-left transition-colors hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100"
            :class="i === highlightIndex ? 'border-gray-900 ring-2 ring-gray-900' : ''"
            @click="cart.addProduct(product)"
          >
            <p class="font-medium leading-snug text-gray-900">{{ product.name }}</p>
            <p class="mt-2 text-sm text-gray-500">{{ product.sellPrice }} DZD · {{ product.quantity }} left</p>
            <span
              v-if="i === highlightIndex && pendingQty > 1"
              class="absolute top-2 right-2 rounded-full bg-gray-900 px-2 py-0.5 text-xs font-semibold text-white tabular-nums"
            >
              ×{{ pendingQty }}
            </span>
          </button>
        </div>
        <p v-if="!loading && !filtered.length" class="text-sm text-gray-500">No products match your search.</p>
      </div>
    </div>

    <!-- Right column: full-height cart panel -->
    <div class="flex w-[380px] shrink-0 flex-col border-l border-gray-200 bg-white">
      <div class="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 class="font-semibold text-gray-900">Cart</h3>
        <span class="rounded-md bg-gray-100 px-2 py-0.5 text-sm text-gray-700">{{ cart.itemCount }} items</span>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <ul v-if="cart.lines.length" class="flex flex-col gap-2">
          <li v-for="line in cart.lines" :key="line.productId" class="flex items-center justify-between gap-2 text-sm">
            <span class="min-w-0 truncate">{{ line.name }} × {{ line.quantity }}</span>
            <button type="button" class="shrink-0 text-red-600 hover:text-red-800" @click="cart.removeLine(line.productId)">
              Remove
            </button>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500">Tap products to add them.</p>

        <div class="mt-4 border-t border-gray-100 pt-3">
          <p class="text-2xl font-bold text-gray-900">{{ cart.total.toFixed(2) }} <span class="text-base font-normal text-gray-500">DZD</span></p>
        </div>

        <div class="mt-4" :class="confirmStage && !cart.selectedClient ? 'rounded-lg border-2 border-gray-900 p-2' : ''">
          <ClientPicker
            ref="clientPickerRef"
            :model-value="cart.selectedClient"
            @update:model-value="onClientChange"
            @confirm="onClientConfirm"
          />
        </div>

        <template v-if="cart.selectedClient">
          <div class="mt-4 flex flex-col gap-2">
            <label class="text-sm font-medium text-gray-700">Payment type</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                class="rounded-md border px-2 py-2 text-xs"
                :class="cart.checkoutMode === 'full' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700'"
                @click="onCheckoutModeChange('full')"
              >
                Full
              </button>
              <button
                type="button"
                class="rounded-md border px-2 py-2 text-xs"
                :class="cart.checkoutMode === 'partial' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700'"
                @click="onCheckoutModeChange('partial')"
              >
                Partial
              </button>
              <button
                v-if="auth.isManager"
                type="button"
                class="rounded-md border px-2 py-2 text-xs"
                :class="cart.checkoutMode === 'payLater' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700'"
                @click="onCheckoutModeChange('payLater')"
              >
                Later
              </button>
            </div>
          </div>
          <div v-if="cart.checkoutMode === 'partial'" class="mt-3">
            <label class="mb-1 block text-sm font-medium text-gray-700">Paid now (DZD)</label>
            <input
              v-model.number="cart.amountPaid"
              type="number"
              min="0"
              :max="cart.total"
              step="0.01"
              class="input"
            />
          </div>
          <p v-if="cart.amountOnCredit > 0" class="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Credit: {{ cart.amountOnCredit.toFixed(2) }} DZD
          </p>
        </template>

        <select v-model="paymentMethod" class="input mt-4">
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
        </select>

        <p v-if="confirmStage && !cart.selectedClient" class="mt-3 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-600">
          Press <kbd class="font-mono">Enter</kbd> to confirm as passenger, or pick a client first.
        </p>
        <p v-if="message" class="mt-3 text-sm text-green-600">{{ message }}</p>
        <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
      </div>

      <div class="shrink-0 border-t border-gray-100 p-4">
        <button
          type="button"
          :disabled="!cart.lines.length"
          class="btn-primary w-full py-3 text-base"
          @click="completeSale"
        >
          Complete sale (⌘↵)
        </button>
      </div>
    </div>
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
</template>
