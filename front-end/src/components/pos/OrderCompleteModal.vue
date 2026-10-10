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
import { AlertCircle, Banknote, CreditCard, Info } from 'lucide-vue-next'
import PosModal from '@/components/pos/PosModal.vue'
import { formatMoney } from '@/utils/formatMoney'

const methods = [
  { id: 'CASH' as const, icon: Banknote },
  { id: 'CARD' as const, icon: CreditCard },
]

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
    :message="$t('pos.orderComplete.successMessage', { orderNumber: order.orderNumber, total: formatMoney(order.total) })"
    @close="emit('completed')"
    @print="saveOrderReceiptPdf(order)"
  />

  <PosModal
    v-else
    :title="$t('pos.orderComplete.title')"
    :subtitle="`${order.orderNumber} · ${order.customerName}`"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-5">
      <div class="rounded-2xl bg-pos-sunken p-4">
        <p class="text-[12px] font-medium text-pos-muted">{{ $t('pos.register.total') }}</p>
        <p class="mt-0.5 text-[26px] leading-tight font-semibold tracking-[-0.02em] text-pos-ink pos-num">{{ formatMoney(order.total) }}</p>
        <p v-if="client" class="mt-1 text-[13px] text-pos-muted pos-num">
          {{ $t('pos.orderComplete.clientBalance', { name: client.name, balance: formatMoney(client.balance) }) }}
        </p>
      </div>

      <div class="flex flex-col gap-2">
        <span class="pos-label">{{ $t('pos.orderComplete.paymentRecovery') }}</span>
        <div class="pos-segmented" role="group" :aria-label="$t('pos.orderComplete.paymentRecovery')">
          <button type="button" class="pos-segment" :aria-pressed="checkoutMode === 'full'" @click="onModeChange('full')">{{ $t('pos.checkout.full') }}</button>
          <button type="button" class="pos-segment" :aria-pressed="checkoutMode === 'partial'" @click="onModeChange('partial')">{{ $t('pos.checkout.partial') }}</button>
          <button v-if="auth.isManager" type="button" class="pos-segment" :aria-pressed="checkoutMode === 'payLater'" @click="onModeChange('payLater')">{{ $t('pos.checkout.later') }}</button>
        </div>
      </div>

      <div v-if="checkoutMode === 'partial'" class="flex flex-col gap-2">
        <label for="pos-order-collected" class="pos-label">{{ $t('pos.orderComplete.amountCollected') }}</label>
        <div class="relative">
          <input
            id="pos-order-collected"
            v-model.number="amountPaid"
            type="number"
            inputmode="decimal"
            min="0"
            :max="total"
            step="0.01"
            class="pos-input h-14 pe-16 text-[24px] font-semibold pos-num"
          />
          <span class="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-[14px] font-medium text-pos-muted">{{ $t('common.currency') }}</span>
        </div>
      </div>

      <p v-if="amountOnCredit > 0" class="pos-notice bg-pos-warn-bg text-pos-warn">
        <Info class="mt-px h-4 w-4 shrink-0" />
        {{ $t('pos.orderComplete.onCredit', { amount: formatMoney(amountOnCredit) }) }}
      </p>

      <div class="flex flex-col gap-2">
        <span class="pos-label">{{ $t('pos.paymentModal.paymentMethod') }}</span>
        <div class="pos-segmented" role="group" :aria-label="$t('pos.paymentModal.paymentMethod')">
          <button
            v-for="method in methods"
            :key="method.id"
            type="button"
            class="pos-segment min-h-10"
            :aria-pressed="paymentMethod === method.id"
            @click="paymentMethod = method.id"
          >
            <component :is="method.icon" class="h-4 w-4" />
            {{ $t(`common.paymentMethod.${method.id}`) }}
          </button>
        </div>
      </div>

      <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">
        <AlertCircle class="mt-px h-4 w-4 shrink-0" />
        {{ error }}
      </p>
    </div>

    <template #footer>
      <button type="button" class="pos-btn-ghost" @click="emit('close')">{{ $t('common.cancel') }}</button>
      <button type="button" class="pos-btn-primary" data-autofocus :disabled="loading" @click="handleComplete">
        {{ loading ? $t('pos.orderComplete.saving') : $t('pos.orderComplete.submit') }}
      </button>
    </template>
  </PosModal>

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
</template>
