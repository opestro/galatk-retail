<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Sale } from '@/types/api'

const props = defineProps<{ sale: Sale }>()
const emit = defineEmits<{ close: []; voided: [] }>()

const auth = useAuthStore()
const reason = ref('')
const error = ref('')
const loading = ref(false)

async function confirmVoid() {
  const shopId = auth.selectedShopId
  if (!shopId) return
  loading.value = true
  error.value = ''
  try {
    await api.post(`/shops/${shopId}/pos/sales/${props.sale.id}/void`, { reason: reason.value || undefined })
    emit('voided')
  } catch {
    error.value = 'Void denied — check same-day and ownership rules'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
    <div class="flex w-full max-w-md flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
      <div class="flex flex-col gap-2">
        <h3 class="text-lg font-medium text-gray-900">Void sale</h3>
        <p class="text-sm text-gray-600">
          Void {{ sale.total }} DZD sale by {{ sale.cashier.name }}?
        </p>
      </div>
      <textarea
        v-model="reason"
        placeholder="Reason (optional)"
        class="input min-h-20"
      />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <div class="flex justify-end gap-3">
        <button class="btn-secondary" @click="emit('close')">Cancel</button>
        <button :disabled="loading" class="btn-danger" @click="confirmVoid">Void sale</button>
      </div>
    </div>
  </div>
</template>
