<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getMyOrder, hasUnpaidCredit } from '@/services/customerAccount'
import { orderStatusLabel } from '@/services/orders'
import { formatDzd } from '@/utils/formatMoney'
import type { CustomerOrder } from '@/types/api'
import { ArrowLeft } from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const order = ref<CustomerOrder | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    order.value = await getMyOrder(String(route.params.orderId))
  } catch {
    error.value = t('shop.account.orderNotFound')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="sf-container max-w-4xl pb-24 pt-8 md:pt-12">
    <RouterLink to="/store/account" class="inline-flex items-center gap-2 text-sm text-mute transition-colors hover:text-ink">
      <ArrowLeft class="h-4 w-4 rtl:-scale-x-100" />
      {{ $t('shop.account.allOrders') }}
    </RouterLink>

    <div v-if="loading" class="sf-skeleton mt-8 h-64" />
    <p v-else-if="error || !order" class="mt-8 border-s-2 border-alert bg-paper px-4 py-3 text-sm text-alert" role="alert">
      {{ error || $t('shop.account.orderNotFoundFallback') }}
    </p>

    <div v-else class="mt-8 flex flex-col gap-8">
      <div class="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
        <div>
          <p class="sf-eyebrow">{{ order.shop.name }}</p>
          <h1 class="sf-display mt-3 text-5xl tabular-nums md:text-6xl">{{ order.orderNumber }}</h1>
          <p class="mt-3 text-sm text-mute">{{ new Date(order.createdAt).toLocaleString() }}</p>
        </div>
        <span class="border border-line bg-paper px-3 py-1.5 text-sm text-ink">{{ orderStatusLabel(order.status) }}</span>
      </div>

      <p
        v-if="hasUnpaidCredit(order.remainingCredit)"
        class="border-s-2 border-clay bg-blush/60 px-4 py-3 text-sm font-medium text-clay"
      >
        {{ $t('shop.account.remaining') }} {{ formatDzd(order.remainingCredit!) }}
      </p>

      <section class="sf-panel">
        <ul class="divide-y divide-line">
          <li v-for="line in order.lines" :key="line.id" class="flex items-center justify-between gap-4 px-5 py-4 md:px-7">
            <div class="min-w-0">
              <p class="truncate text-[15px] font-medium text-ink">{{ line.productName }}</p>
              <p v-if="line.variantLabel" class="text-xs text-mute">{{ line.variantLabel }}</p>
              <p class="text-xs text-mute">{{ $t('shop.account.lineQty', { n: line.quantity }) }}</p>
            </div>
            <p class="text-sm text-ink tabular-nums">{{ formatDzd(line.lineTotal) }}</p>
          </li>
        </ul>
        <div class="flex items-center justify-between border-t border-line px-5 py-5 md:px-7">
          <span class="text-base font-medium text-ink">{{ $t('shop.account.total') }}</span>
          <span class="text-lg font-medium text-ink tabular-nums">{{ formatDzd(order.total) }}</span>
        </div>
      </section>

      <p class="text-sm text-mute">
        {{
          $t('shop.account.fulfillmentNote', {
            wilaya: order.customerWilaya || $t('shop.account.yourWilayaFallback'),
            phone: order.customerPhone,
          })
        }}
      </p>
    </div>
  </div>
</template>
