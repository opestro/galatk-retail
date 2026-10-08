<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { recordClientPayment } from '@/services/clientApi'
import { playPosErrorSound, playPosSuccessSound } from '@/composables/usePosSounds'
import { printPosReceipt, type PaymentReceiptData } from '@/utils/printPosReceipt'
import { AlertCircle, Banknote, CreditCard } from 'lucide-vue-next'
import ClientPicker from '@/components/pos/ClientPicker.vue'
import PosModal from '@/components/pos/PosModal.vue'
import PosSuccessDialog from '@/components/pos/PosSuccessDialog.vue'
import { formatMoney } from '@/utils/formatMoney'
import type { Client, ClientPayment } from '@/types/api'

const props = defineProps<{ initialClient?: Client | null }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const auth = useAuthStore()
const client = ref<Client | null>(props.initialClient ?? null)
const amount = ref(0)
const paymentMethod = ref<'CASH' | 'CARD'>('CASH')
const error = ref('')
const loading = ref(false)
const successReceipt = ref<PaymentReceiptData | null>(null)
const amountInput = ref<HTMLInputElement | null>(null)

const methods = [
  { id: 'CASH' as const, icon: Banknote },
  { id: 'CARD' as const, icon: CreditCard },
]

const balance = computed(() => (client.value ? Number(client.value.balance) : 0))
const maxAmount = computed(() => balance.value)

watch(
  () => props.initialClient,
  (value) => {
    if (value) {
      client.value = value
    }
  },
  { immediate: true },
)

watch(client, (value) => {
  if (value && amount.value > Number(value.balance)) {
    amount.value = Number(value.balance)
  }
  // Picking a client moves the cashier straight to the amount.
  if (value) nextTick(() => amountInput.value?.focus())
})

function payFullBalance() {
  if (client.value) {
    amount.value = Number(client.value.balance)
  }
}

async function submit() {
  const shopId = auth.selectedShopId
  if (!shopId || !client.value || amount.value <= 0) return
  if (amount.value > balance.value) {
    error.value = t('pos.paymentModal.errorExceedsBalance')
    playPosErrorSound()
    return
  }
  loading.value = true
  error.value = ''
  const previousBalance = client.value.balance
  try {
    const { data } = await recordClientPayment(shopId, client.value.id, {
      amount: amount.value,
      paymentMethod: paymentMethod.value,
    })
    const payment = data.data as ClientPayment
    const newBalance = (Number(previousBalance) - amount.value).toFixed(2)
    playPosSuccessSound()
    successReceipt.value = {
      type: 'payment',
      paymentId: payment.id,
      createdAt: payment.createdAt,
      cashierName: payment.recordedBy?.name ?? auth.staff?.name ?? t('common.staff'),
      paymentMethod: paymentMethod.value,
      clientName: client.value.name,
      clientPhone: client.value.phone,
      amount: amount.value.toFixed(2),
      previousBalance: Number(previousBalance).toFixed(2),
      newBalance,
    }
  } catch {
    error.value = t('pos.paymentModal.errorFailed')
    playPosErrorSound()
  } finally {
    loading.value = false
  }
}

function onSuccessClose() {
  successReceipt.value = null
  emit('close')
}

function onPrint() {
  if (successReceipt.value) {
    printPosReceipt(successReceipt.value)
  }
}
</script>

<template>
  <PosModal
    v-if="!successReceipt"
    :title="$t('pos.paymentModal.title')"
    :subtitle="$t('pos.paymentModal.subtitle')"
    @close="emit('close')"
  >
    <form id="pos-payment-form" class="flex flex-col gap-5" @submit.prevent="submit">
      <ClientPicker v-model="client" debt-only />

      <div v-if="client" class="flex items-center justify-between rounded-xl bg-pos-warn-bg px-4 py-3 text-pos-warn">
        <span class="text-[13px] font-medium">{{ $t('pos.paymentModal.outstandingLabel') }}</span>
        <span class="text-[15px] font-semibold pos-num">{{ formatMoney(client.balance) }}</span>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label for="pos-payment-amount" class="pos-label">{{ $t('pos.paymentModal.amountLabel') }}</label>
          <button
            v-if="client && balance > 0"
            type="button"
            class="rounded-md text-[12px] font-medium text-pos-ink underline decoration-pos-line underline-offset-4 transition-colors hover:decoration-pos-ink"
            @click="payFullBalance"
          >
            {{ $t('pos.paymentModal.payFullBalance') }}
          </button>
        </div>
        <div class="relative">
          <input
            id="pos-payment-amount"
            ref="amountInput"
            v-model.number="amount"
            type="number"
            inputmode="decimal"
            min="0"
            :max="maxAmount"
            step="0.01"
            :data-autofocus="client ? '' : undefined"
            class="pos-input h-16 pe-16 text-[28px] font-semibold tracking-[-0.02em] pos-num"
            :aria-describedby="'pos-payment-preview'"
            @focus="($event.target as HTMLInputElement).select()"
          />
          <span class="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-[15px] font-medium text-pos-muted">{{ $t('common.currency') }}</span>
        </div>
        <p id="pos-payment-preview" class="min-h-5 text-[12.5px] text-pos-muted pos-num" aria-live="polite">
          <template v-if="amount > 0">{{ formatMoney(amount) }}</template>
          <template v-if="client && amount > 0 && amount <= maxAmount">
            · {{ $t('pos.paymentModal.remainingAfter', { amount: formatMoney(balance - amount) }) }}
          </template>
        </p>
      </div>

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
    </form>

    <template #footer>
      <button type="button" class="pos-btn-ghost" @click="emit('close')">{{ $t('common.cancel') }}</button>
      <button
        type="submit"
        form="pos-payment-form"
        :disabled="loading || !client || amount <= 0 || amount > maxAmount"
        class="pos-btn-primary min-w-40"
      >
        <span v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
        {{ loading ? $t('pos.paymentModal.processing') : $t('pos.paymentModal.submit') }}
      </button>
    </template>
  </PosModal>

  <PosSuccessDialog
    v-else
    :title="$t('pos.paymentModal.successTitle')"
    :message="$t('pos.paymentModal.successMessage', { amount: formatMoney(successReceipt.amount), clientName: successReceipt.clientName, newBalance: formatMoney(successReceipt.newBalance) })"
    @close="onSuccessClose"
    @print="onPrint"
  />
</template>
