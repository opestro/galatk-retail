<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { apiErrorMessage } from '@/services/products'
import { useAuthStore } from '@/stores/auth'
import PayLaterConfirm from '@/components/pos/PayLaterConfirm.vue'
import PosSuccessDialog from '@/components/pos/PosSuccessDialog.vue'
import { saveOrderReceiptPdf } from '@/utils/orderReceiptPdf'
import type { OnlineOrder } from '@/types/api'

const props = defineProps<{
  order: OnlineOrder
}>()

const emit = defineEmits<{ close: []; completed: [] }>()

const { t } = useI18n()
const auth = useAuthStore()
const paymentMethod = ref<'CASH' | 'CARD'>('CASH')
const checkoutMode = ref<'full' | 'partial' | 'payLater'>('full')
const amountPaid = ref(Number(props.order.total))
const loading = ref(false)
const error = ref('')
const showManagerConfirm = ref(false)
const pendingOverride = ref(false)
const showSuccess = ref(false)

const total = computed(() => Number(props.order.total))
const amountOnCredit = computed(() => {
  if (checkoutMode.value === 'payLater') return total.value
  const paid = Math.min(total.value, Math.max(0, Number(amountPaid.value) || 0))
  return Math.round((total.value - paid) * 100) / 100
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
      body.amountPaid = '0.00'
    } else if (checkoutMode.value === 'partial') {
      body.amountPaid = Number(amountPaid.value).toFixed(2)
    } else {
      body.amountPaid = Number(props.order.total).toFixed(2)
    }
    if (creditLimitOverride) {
      body.creditLimitOverride = true
    }
    await api.post(`/shops/${shopId}/orders/${props.order.id}/complete`, body)
    showSuccess.value = true
  } catch (err) {
    error.value = apiErrorMessage(err, t('pos.orderComplete.errorFailed'))
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
    error.value = t('pos.orderComplete.errorCreditLimit')
    return
  }
  submitComplete(creditLimitExceeded.value && auth.isManager)
}
</script>

<template>
  <PosSuccessDialog
    v-if="showSuccess"
    :title="$t('pos.orderComplete.successTitle')"
    :message="$t('pos.orderComplete.successMessage', { orderNumber: order.orderNumber, total: order.total })"
    @close="emit('completed')"
    @print="saveOrderReceiptPdf(order)"
  />

  <div v-else class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="card flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto">
      <div>
        <h3 class="text-lg font-semibold text-gray-900">{{ $t('pos.orderComplete.title') }}</h3>
        <p class="text-sm text-gray-500">{{ order.orderNumber }} · {{ order.customerName }}</p>
        <p class="mt-1 text-sm font-medium text-gray-900">{{ $t('pos.orderComplete.total', { total: order.total }) }}</p>
        <p v-if="client" class="text-sm text-gray-600">
          {{ $t('pos.orderComplete.clientBalance', { name: client.name, balance: client.balance }) }}
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium text-gray-700">{{ $t('pos.orderComplete.paymentRecovery') }}</label>
        <select
          :value="checkoutMode"
          class="input"
          @change="onModeChange(($event.target as HTMLSelectElement).value as 'full' | 'partial' | 'payLater')"
        >
          <option value="full">{{ $t('pos.orderComplete.modeFull') }}</option>
          <option value="partial">{{ $t('pos.orderComplete.modePartial') }}</option>
          <option v-if="auth.isManager" value="payLater">{{ $t('pos.orderComplete.modePayLater') }}</option>
        </select>
      </div>

      <div v-if="checkoutMode === 'partial'">
        <label class="mb-1 block text-sm font-medium text-gray-700">{{ $t('pos.orderComplete.amountCollected') }}</label>
        <input v-model.number="amountPaid" type="number" min="0" :max="total" step="0.01" class="input" />
      </div>

      <p v-if="amountOnCredit > 0" class="text-sm text-amber-700">
        {{ $t('pos.orderComplete.onCredit', { amount: amountOnCredit.toFixed(2) }) }}
      </p>

      <select v-model="paymentMethod" class="input">
        <option value="CASH">{{ $t('common.paymentMethod.CASH') }}</option>
        <option value="CARD">{{ $t('common.paymentMethod.CARD') }}</option>
      </select>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" class="btn-secondary" @click="emit('close')">{{ $t('common.cancel') }}</button>
        <button type="button" class="btn-primary" :disabled="loading" @click="handleComplete">
          {{ loading ? $t('pos.orderComplete.saving') : $t('pos.orderComplete.submit') }}
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
