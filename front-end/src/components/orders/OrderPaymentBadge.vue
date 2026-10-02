<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatDzd } from '@/utils/formatMoney'
import type { OnlineOrder, OrderPaymentStatus } from '@/types/api'

const props = defineProps<{
  order: OnlineOrder
}>()

const { t } = useI18n()

const status = computed<OrderPaymentStatus>(() => props.order.paymentStatus ?? 'UNPAID')

const label = computed(() =>
  t(`common.paymentStatus.${status.value}`, {
    paid: formatDzd(props.order.collected ?? props.order.amountPaid ?? '0'),
    remaining: formatDzd(props.order.remainingCredit ?? props.order.total),
  }),
)

const tone = computed(() => {
  switch (status.value) {
    case 'PAID':
      return 'border-green-200 bg-green-50 text-green-800'
    case 'PARTIAL':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    case 'CREDIT':
      return 'border-orange-200 bg-orange-50 text-orange-900'
    case 'UNPAID':
      return 'border-gray-200 bg-gray-50 text-gray-700'
    default:
      return 'border-gray-200 text-gray-500'
  }
})
</script>

<template>
  <span
    v-if="status !== 'NONE'"
    class="inline-flex max-w-full rounded-md border px-2 py-1 text-xs font-medium"
    :class="tone"
  >
    {{ label }}
  </span>
</template>
