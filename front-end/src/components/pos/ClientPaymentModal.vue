<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { recordClientPayment } from '@/services/clientApi'
import ClientPicker from '@/components/pos/ClientPicker.vue'
import type { Client } from '@/types/api'

const emit = defineEmits<{ close: []; recorded: [] }>()

const auth = useAuthStore()
const client = ref<Client | null>(null)
const amount = ref(0)
const paymentMethod = ref<'CASH' | 'CARD'>('CASH')
const error = ref('')
const loading = ref(false)

async function submit() {
  const shopId = auth.selectedShopId
  if (!shopId || !client.value || amount.value <= 0) return
  loading.value = true
  error.value = ''
  try {
    await recordClientPayment(shopId, client.value.id, {
      amount: amount.value,
      paymentMethod: paymentMethod.value,
    })
    emit('recorded')
  } catch {
    error.value = 'Payment failed — check amount and try again'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
    <div class="flex w-full max-w-md flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
      <h3 class="text-lg font-medium text-gray-900">Record client payment</h3>

      <ClientPicker v-model="client" />

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Amount (DZD)</label>
        <input v-model.number="amount" type="number" min="0" step="0.01" class="input" />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">Payment method</label>
        <select v-model="paymentMethod" class="input">
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
        </select>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div class="flex justify-end gap-3">
        <button class="btn-secondary" @click="emit('close')">Cancel</button>
        <button
          :disabled="loading || !client || amount <= 0"
          class="btn-primary"
          @click="submit"
        >
          Record payment
        </button>
      </div>
    </div>
  </div>
</template>
