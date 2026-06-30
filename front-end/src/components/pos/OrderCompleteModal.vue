<script setup lang="ts">
import { ref, computed } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import PayLaterConfirm from '@/components/pos/PayLaterConfirm.vue'
import type { OnlineOrder } from '@/types/api'

const props = defineProps<{
  order: OnlineOrder
}>()

const emit = defineEmits<{ close: []; completed: [] }>()

const auth = useAuthStore()
const paymentMethod = ref<'CASH' | 'CARD'>('CASH')
const checkoutMode = ref<'full' | 'partial' | 'payLater'>('full')
const amountPaid = ref(Number(props.order.total))
const loading = ref(false)
const error = ref('')
const showManagerConfirm = ref(false)
const pendingOverride = ref(false)

const total = computed(() => Number(props.order.total))
const amountOnCredit = computed(() => {
  if (checkoutMode.value === 'payLater') return total.value
  return Math.max(0, total.value - amountPaid.value)
})

const client = computed(() => props.order.client ?? null)

const creditLimitExceeded = computed(() => {
  if (!client.value?.creditLimit) return false
  return Number(client.value.balance) + amountOnCredit.value > Number(client.value.creditLimit)
})

function onModeChange(mode: 'full' | 'partial' | 'payLater') {
  if (mode === 'payLater' && !auth.isManager) return
  checkoutMode.value = mode
  if (mode === 'full') amountPaid.value = total.value
  if (mode === 'payLater') amountPaid.value = 0
}

async function submitComplete(creditLimitOverride = false) {
  const shopId = auth.selectedShopId
  if (!shopId) return
  loading.value = true
  error.value = ''
  try {
    const body: Record<string, unknown> = {
      paymentMethod: paymentMethod.value,
    }
    if (checkoutMode.value === 'payLater') {
      body.payLater = true
      body.amountPaid = 0
    } else {
      body.amountPaid = amountPaid.value
    }
    if (creditLimitOverride) {
      body.creditLimitOverride = true
    }
    await api.post(`/shops/${shopId}/orders/${props.order.id}/complete`, body)
    emit('completed')
  } catch {
    error.value = 'Could not complete order — check payment or credit limit'
  } finally {
    loading.value = false
    showManagerConfirm.value = false
  }
}

function handleComplete() {
  if (checkoutMode.value === 'payLater' || (creditLimitExceeded.value && auth.isManager)) {
    pendingOverride.value = creditLimitExceeded.value
    showManagerConfirm.value = true
    return
  }
  if (creditLimitExceeded.value && !auth.isManager) {
    error.value = 'Credit limit exceeded — manager approval required'
    return
  }
  submitComplete(creditLimitExceeded.value && auth.isManager)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="card w-full max-w-md flex flex-col gap-4">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">Complete order</h3>
        <p class="text-sm text-gray-500">{{ order.orderNumber }} · {{ order.customerName }}</p>
        <p class="mt-1 text-sm font-medium text-gray-900">Total: {{ order.total }} DZD</p>
        <p v-if="client" class="text-sm text-gray-600">
          Client: {{ client.name }} · Balance {{ client.balance }} DZD
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-gray-700">Payment recovery</label>
        <select
          :value="checkoutMode"
          class="input"
          @change="onModeChange(($event.target as HTMLSelectElement).value as 'full' | 'partial' | 'payLater')"
        >
          <option value="full">Full payment collected</option>
          <option value="partial">Partial payment</option>
          <option v-if="auth.isManager" value="payLater">Pay later (full credit)</option>
        </select>
      </div>

      <div v-if="checkoutMode === 'partial'">
        <label class="mb-1 block text-sm font-medium text-gray-700">Amount collected (DZD)</label>
        <input v-model.number="amountPaid" type="number" min="0" :max="total" step="0.01" class="input" />
      </div>

      <p v-if="amountOnCredit > 0" class="text-sm text-amber-700">
        On credit: {{ amountOnCredit.toFixed(2) }} DZD
      </p>

      <select v-model="paymentMethod" class="input">
        <option value="CASH">Cash</option>
        <option value="CARD">Card</option>
      </select>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex justify-end gap-2">
        <button type="button" class="btn-secondary" @click="emit('close')">Cancel</button>
        <button type="button" class="btn-primary" :disabled="loading" @click="handleComplete">
          {{ loading ? 'Saving…' : 'Complete order' }}
        </button>
      </div>
    </div>

    <PayLaterConfirm
      v-if="showManagerConfirm && client"
      :client="client"
      :total="total"
      :amount-paid="amountPaid"
      :amount-on-credit="amountOnCredit"
      :limit-override="pendingOverride"
      @close="showManagerConfirm = false"
      @confirm="submitComplete"
    />
  </div>
</template>
