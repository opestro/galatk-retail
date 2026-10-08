<script setup lang="ts">
import { ref } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import PosModal from '@/components/pos/PosModal.vue'
import { formatMoney } from '@/utils/formatMoney'
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
  <PosModal
    :title="limitOverride ? $t('pos.payLater.titleLimitExceeded') : $t('pos.payLater.titleConfirm')"
    size="sm"
    raised
    @close="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <div class="rounded-2xl bg-pos-sunken p-4 text-center">
        <p class="text-[12px] font-medium text-pos-muted">{{ $t('pos.payLater.onCreditLabel') }}</p>
        <p class="mt-1 text-[26px] leading-tight font-semibold tracking-[-0.02em] text-pos-ink pos-num">{{ formatMoney(amountOnCredit) }}</p>
        <p class="mt-1 text-[13px] text-pos-muted">
          {{ $t('pos.payLater.willOwe', { name: client.name, amount: formatMoney(amountOnCredit) }) }}<span v-if="amountPaid > 0"> {{ $t('pos.payLater.paidNowSuffix', { paid: formatMoney(amountPaid) }) }}</span>.
        </p>
      </div>
      <p v-if="client.creditLimit" class="text-[13px] text-pos-muted pos-num">
        {{ $t('pos.payLater.balanceLimit', { balance: formatMoney(client.balance), limit: formatMoney(client.creditLimit) }) }}
      </p>
      <label v-if="limitOverride" class="pos-notice cursor-pointer items-center bg-pos-warn-bg text-pos-warn">
        <AlertTriangle class="h-4 w-4 shrink-0" />
        <span class="flex-1">{{ $t('pos.payLater.managerOverride') }}</span>
        <input v-model="override" type="checkbox" class="h-5 w-5 accent-pos-espresso" />
      </label>
    </div>
    <template #footer>
      <button type="button" class="pos-btn-ghost" @click="emit('close')">{{ $t('common.cancel') }}</button>
      <button
        type="button"
        class="pos-btn-primary"
        data-autofocus
        :disabled="limitOverride && !override"
        @click="emit('confirm', limitOverride ? override : false)"
      >
        {{ $t('common.confirm') }}
      </button>
    </template>
  </PosModal>
</template>
