<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { recordClientPayment } from '@/services/clientApi'
import { playPosErrorSound, playPosSuccessSound } from '@/composables/usePosSounds'
import { printPosReceipt, type PaymentReceiptData } from '@/utils/printPosReceipt'
import ClientPicker from '@/components/pos/ClientPicker.vue'
import PosSuccessDialog from '@/components/pos/PosSuccessDialog.vue'
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
  <div v-if="!successReceipt" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
    <div class="flex w-full max-w-md flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
      <h3 class="text-lg font-medium text-gray-900">{{ $t('pos.paymentModal.title') }}</h3>
      <p class="text-sm text-gray-500">{{ $t('pos.paymentModal.subtitle') }}</p>

      <ClientPicker v-model="client" debt-only />

      <div v-if="client" class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        {{ $t('pos.paymentModal.outstanding', { balance: client.balance }) }}
      </div>

      <div>
        <div class="mb-1 flex items-center justify-between">
          <label class="text-sm font-medium text-gray-700">{{ $t('pos.paymentModal.amountLabel') }}</label>
          <button
            v-if="client && balance > 0"
            type="button"
            class="text-xs font-medium text-gray-700 underline hover:text-gray-900"
            @click="payFullBalance"
          >
            {{ $t('pos.paymentModal.payFullBalance') }}
          </button>
        </div>
        <input
          v-model.number="amount"
          type="number"
          min="0"
          :max="maxAmount"
          step="0.01"
          class="input"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">{{ $t('pos.paymentModal.paymentMethod') }}</label>
        <select v-model="paymentMethod" class="input">
          <option value="CASH">{{ $t('common.paymentMethod.CASH') }}</option>
          <option value="CARD">{{ $t('common.paymentMethod.CARD') }}</option>
        </select>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex justify-end gap-3">
        <button type="button" class="btn-secondary" @click="emit('close')">{{ $t('common.cancel') }}</button>
        <button
          type="button"
          :disabled="loading || !client || amount <= 0 || amount > maxAmount"
          class="btn-primary"
          @click="submit"
        >
          {{ loading ? $t('pos.paymentModal.processing') : $t('pos.paymentModal.submit') }}
        </button>
      </div>
    </div>
  </div>

  <PosSuccessDialog
    v-else
    :title="$t('pos.paymentModal.successTitle')"
    :message="$t('pos.paymentModal.successMessage', { amount: successReceipt.amount, clientName: successReceipt.clientName, newBalance: successReceipt.newBalance })"
    @close="onSuccessClose"
    @print="onPrint"
  />
</template>
