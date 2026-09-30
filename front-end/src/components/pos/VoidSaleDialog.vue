<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Sale } from '@/types/api'

const props = defineProps<{ sale: Sale }>()
const emit = defineEmits<{ close: []; voided: [] }>()

const { t } = useI18n()
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
    error.value = t('pos.void.errorDenied')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
    <div class="flex w-full max-w-md flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
      <div class="flex flex-col gap-2">
        <h3 class="text-lg font-medium text-gray-900">{{ $t('pos.void.title') }}</h3>
        <p class="text-sm text-gray-600">
          {{ $t('pos.void.confirmBody', { total: sale.total, cashier: sale.cashier.name }) }}
        </p>
      </div>
      <textarea
        v-model="reason"
        :placeholder="$t('pos.void.reasonPlaceholder')"
        class="input min-h-20"
      />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <div class="flex justify-end gap-3">
        <button class="btn-secondary" @click="emit('close')">{{ $t('common.cancel') }}</button>
        <button :disabled="loading" class="btn-danger" @click="confirmVoid">
          {{ loading ? $t('pos.void.voiding') : $t('pos.void.submit') }}
        </button>
      </div>
    </div>
  </div>
</template>
