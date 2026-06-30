<script setup lang="ts">
import { ref, computed, watch, onMounted, inject } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { usePosCartStore } from '@/stores/posCart'
import { usePosHotkeys } from '@/composables/usePosHotkeys'
import type { PosProduct } from '@/types/api'
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

const openPaymentModal = inject<(() => void) | undefined>('posOpenPayment', undefined)

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

usePosHotkeys({
  onFocusSearch: () => searchInputRef.value?.focus(),
  onRecordPayment: () => openPaymentModal?.(),
  onCompleteSale: () => {
    if (cart.lines.length) checkout()
  },
  onClearCart: () => {
    if (cart.lines.length) cart.clear()
  },
})

onMounted(loadProducts)
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-4">
    <div class="grid gap-6 lg:grid-cols-5">
      <div class="flex flex-col gap-4 lg:col-span-3">
        <input
          ref="searchInputRef"
          v-model="search"
          placeholder="Search products… (F2)"
          class="input text-base"
        />

        <SkeletonProductGrid v-if="loading" :count="8" />
        <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <button
            v-for="product in filtered"
            :key="product.productId"
            type="button"
            class="card flex min-h-[88px] flex-col justify-between text-left transition-colors hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100"
            @click="cart.addProduct(product)"
          >
            <p class="font-medium leading-snug text-gray-900">{{ product.name }}</p>
            <p class="mt-2 text-sm text-gray-500">{{ product.sellPrice }} DZD · {{ product.quantity }} left</p>
          </button>
        </div>
        <p v-if="!loading && !filtered.length" class="text-sm text-gray-500">No products match your search.</p>
      </div>

      <div class="card sticky top-4 flex h-fit flex-col gap-4 lg:col-span-2">
        <div class="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 class="font-semibold text-gray-900">Cart</h3>
          <span class="rounded-md bg-gray-100 px-2 py-0.5 text-sm text-gray-700">{{ cart.itemCount }} items</span>
        </div>

        <ul v-if="cart.lines.length" class="flex max-h-48 flex-col gap-2 overflow-y-auto">
          <li v-for="line in cart.lines" :key="line.productId" class="flex items-center justify-between gap-2 text-sm">
            <span class="min-w-0 truncate">{{ line.name }} × {{ line.quantity }}</span>
            <button type="button" class="shrink-0 text-red-600 hover:text-red-800" @click="cart.removeLine(line.productId)">
              Remove
            </button>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-500">Tap products to add them.</p>

        <div class="border-t border-gray-100 pt-3">
          <p class="text-2xl font-bold text-gray-900">{{ cart.total.toFixed(2) }} <span class="text-base font-normal text-gray-500">DZD</span></p>
        </div>

        <ClientPicker :model-value="cart.selectedClient" @update:model-value="onClientChange" />

        <template v-if="cart.selectedClient">
          <div class="flex flex-col gap-2">
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
          <div v-if="cart.checkoutMode === 'partial'">
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
          <p v-if="cart.amountOnCredit > 0" class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Credit: {{ cart.amountOnCredit.toFixed(2) }} DZD
          </p>
        </template>

        <select v-model="paymentMethod" class="input">
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
        </select>

        <p v-if="message" class="text-sm text-green-600">{{ message }}</p>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="button"
          :disabled="!cart.lines.length"
          class="btn-primary w-full py-3 text-base"
          @click="checkout"
        >
          Complete sale (F12)
        </button>
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
  </div>
</template>
