<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Sale } from '@/types/api'
import { AlertCircle } from 'lucide-vue-next'
import PosModal from '@/components/pos/PosModal.vue'
import { formatMoney } from '@/utils/formatMoney'

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
  <PosModal :title="$t('pos.void.title')" size="sm" @close="emit('close')">
    <div class="flex flex-col gap-4">
      <p class="text-[14px] text-pos-ink-2 pos-num">
        {{ $t('pos.void.confirmBody', { total: formatMoney(sale.total), cashier: sale.cashier.name }) }}
      </p>
      <p class="pos-notice bg-pos-err-bg text-pos-err">
        <AlertCircle class="mt-px h-4 w-4 shrink-0" />
        {{ $t('pos.void.warning') }}
      </p>
      <div class="flex flex-col gap-2">
        <label for="pos-void-reason" class="pos-label">{{ $t('pos.void.reasonLabel') }}</label>
        <textarea
          id="pos-void-reason"
          v-model="reason"
          data-autofocus
          :placeholder="$t('pos.void.reasonPlaceholder')"
          class="pos-input h-auto min-h-24 resize-none py-3"
        />
      </div>
      <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">{{ error }}</p>
    </div>
    <template #footer>
      <button type="button" class="pos-btn-ghost" @click="emit('close')">{{ $t('common.cancel') }}</button>
      <button type="button" :disabled="loading" class="pos-btn-danger" @click="confirmVoid">
        {{ loading ? $t('pos.void.voiding') : $t('pos.void.submit') }}
      </button>
    </template>
  </PosModal>
</template>
