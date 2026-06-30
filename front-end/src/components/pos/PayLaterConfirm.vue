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
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
    <div class="flex w-full max-w-md flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
      <div class="flex flex-col gap-2">
        <h3 class="text-lg font-medium text-gray-900">
          {{ limitOverride ? 'Credit limit exceeded' : 'Confirm pay later' }}
        </h3>
        <p class="text-sm text-gray-600">
          {{ client.name }} will owe {{ amountOnCredit.toFixed(2) }} DZD
          <span v-if="amountPaid > 0"> ({{ amountPaid.toFixed(2) }} DZD paid now)</span>.
        </p>
        <p v-if="client.creditLimit" class="text-sm text-gray-500">
          Current balance: {{ client.balance }} DZD · Limit: {{ client.creditLimit }} DZD
        </p>
      </div>
      <label v-if="limitOverride" class="flex items-center gap-2 text-sm text-gray-700">
        <input v-model="override" type="checkbox" />
        Manager override — allow sale over credit limit
      </label>
      <div class="flex justify-end gap-3">
        <button class="btn-secondary" @click="emit('close')">Cancel</button>
        <button
          class="btn-primary"
          :disabled="limitOverride && !override"
          @click="emit('confirm', limitOverride ? override : false)"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
</template>
