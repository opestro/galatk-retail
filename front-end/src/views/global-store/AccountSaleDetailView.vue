<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getMySale, hasUnpaidCredit } from '@/services/customerAccount'
import { formatDzd } from '@/utils/formatMoney'
import type { CustomerInStorePurchase } from '@/types/api'
import { ArrowLeft } from 'lucide-vue-next'

const { t } = useI18n()
const route = useRoute()
const sale = ref<CustomerInStorePurchase | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    sale.value = await getMySale(String(route.params.saleId))
  } catch {
    error.value = t('shop.account.purchaseNotFound')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <RouterLink to="/store/account" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
      <ArrowLeft class="h-4 w-4" />
      {{ $t('shop.account.allPurchases') }}
    </RouterLink>

    <div v-if="loading" class="skeleton h-48 rounded-xl" />
    <p v-else-if="error || !sale" class="text-sm text-red-600">{{ error || $t('shop.account.purchaseNotFound') }}</p>

    <div v-else class="flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-semibold text-gray-900">{{ $t('shop.account.inStorePurchase') }}</h1>
          <p class="mt-1 text-sm text-gray-600">{{ sale.shop.name }} · {{ new Date(sale.createdAt).toLocaleString() }}</p>
        </div>
        <span class="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {{ $t(`common.saleStatus.${sale.status}`) }}
        </span>
      </div>

      <p
        v-if="hasUnpaidCredit(sale.remainingCredit)"
        class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
      >
        {{ $t('shop.account.remaining') }} {{ formatDzd(sale.remainingCredit) }}
      </p>

      <section class="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <ul class="divide-y divide-gray-100">
          <li v-for="line in sale.lines" :key="line.productId" class="flex items-center justify-between gap-4 px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900">{{ line.productName }}</p>
              <p class="text-xs text-gray-500">{{ $t('shop.account.lineQty', { n: line.quantity }) }}</p>
            </div>
            <p class="text-sm font-medium text-gray-900">{{ formatDzd(line.lineTotal) }}</p>
          </li>
        </ul>
        <div class="flex flex-col gap-1 border-t border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900">
          <div class="flex items-center justify-between font-semibold">
            <span>{{ $t('shop.account.total') }}</span>
            <span>{{ formatDzd(sale.total) }}</span>
          </div>
          <div class="flex items-center justify-between text-gray-600">
            <span>{{ $t('shop.account.paid') }}</span>
            <span>{{ formatDzd(sale.amountPaid) }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
