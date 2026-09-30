<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getMyOrder } from '@/services/customerAccount'
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
  <div class="flex flex-col gap-6">
    <RouterLink to="/store/account" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
      <ArrowLeft class="h-4 w-4" />
      {{ $t('shop.account.allOrders') }}
    </RouterLink>

    <div v-if="loading" class="skeleton h-48 rounded-xl" />
    <p v-else-if="error || !order" class="text-sm text-red-600">{{ error || $t('shop.account.orderNotFoundFallback') }}</p>

    <div v-else class="flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">{{ order.orderNumber }}</h1>
          <p class="mt-1 text-sm text-gray-600">{{ order.shop.name }} · {{ new Date(order.createdAt).toLocaleString() }}</p>
        </div>
        <span class="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {{ orderStatusLabel(order.status) }}
        </span>
      </div>

      <section class="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <ul class="divide-y divide-gray-100">
          <li v-for="line in order.lines" :key="line.id" class="flex items-center justify-between gap-4 px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900">{{ line.productName }}</p>
              <p v-if="line.variantLabel" class="text-xs text-gray-500">{{ line.variantLabel }}</p>
              <p class="text-xs text-gray-500">{{ $t('shop.account.lineQty', { n: line.quantity }) }}</p>
            </div>
            <p class="text-sm font-medium text-gray-900">{{ formatDzd(line.lineTotal) }}</p>
          </li>
        </ul>
        <div class="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
          <span>{{ $t('shop.account.total') }}</span>
          <span>{{ formatDzd(order.total) }}</span>
        </div>
      </section>

      <p class="text-sm text-gray-500">
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
