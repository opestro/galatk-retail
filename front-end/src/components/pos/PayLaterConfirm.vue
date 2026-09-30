<script setup lang="ts">
import { ref } from 'vue'
import type { Client } from '@/types/api'

defineProps<{
  client: Pick<Client, 'name' | 'balance' | 'creditLimit'>
  total: number
  amountPaid: number
  amountOnCredit: number
  limitOverride?: boolean
}>()

const emit = defineEmits<{ close: []; confirm: [creditLimitOverride: boolean] }>()

const override = ref(false)
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 sm:p-6">
    <div class="flex max-h-[90vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-lg border border-gray-200 bg-white p-5 sm:p-6">
      <div class="flex flex-col gap-2">
        <h3 class="text-lg font-medium text-gray-900">
          {{ limitOverride ? $t('pos.payLater.titleLimitExceeded') : $t('pos.payLater.titleConfirm') }}
        </h3>
        <p class="text-sm text-gray-600">
          {{ $t('pos.payLater.willOwe', { name: client.name, amount: amountOnCredit.toFixed(2) }) }}
          <span v-if="amountPaid > 0"> {{ $t('pos.payLater.paidNowSuffix', { paid: amountPaid.toFixed(2) }) }}</span>.
        </p>
        <p v-if="client.creditLimit" class="text-sm text-gray-500">
          {{ $t('pos.payLater.balanceLimit', { balance: client.balance, limit: client.creditLimit }) }}
        </p>
      </div>
      <label v-if="limitOverride" class="flex min-h-11 items-center gap-3 text-sm text-gray-700">
        <input v-model="override" type="checkbox" class="h-5 w-5" />
        {{ $t('pos.payLater.managerOverride') }}
      </label>
      <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <button class="btn-secondary" @click="emit('close')">{{ $t('common.cancel') }}</button>
        <button
          class="btn-primary"
          :disabled="limitOverride && !override"
          @click="emit('confirm', limitOverride ? override : false)"
        >
          {{ $t('common.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>
