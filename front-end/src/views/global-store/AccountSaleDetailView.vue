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
  <div class="sf-container max-w-4xl pb-24 pt-8 md:pt-12">
    <RouterLink to="/store/account" class="inline-flex items-center gap-2 text-sm text-mute transition-colors hover:text-ink">
      <ArrowLeft class="h-4 w-4 rtl:-scale-x-100" />
      {{ $t('shop.account.allPurchases') }}
    </RouterLink>

    <div v-if="loading" class="sf-skeleton mt-8 h-64" />
    <p v-else-if="error || !sale" class="mt-8 border-s-2 border-alert bg-paper px-4 py-3 text-sm text-alert" role="alert">
      {{ error || $t('shop.account.purchaseNotFound') }}
    </p>

    <div v-else class="mt-8 flex flex-col gap-8">
      <div class="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-8">
        <div>
          <p class="sf-eyebrow">{{ sale.shop.name }}</p>
          <h1 class="sf-display mt-3 text-5xl md:text-6xl rtl:text-4xl rtl:md:text-5xl">{{ $t('shop.account.inStorePurchase') }}</h1>
          <p class="mt-3 text-sm text-mute">{{ new Date(sale.createdAt).toLocaleString() }}</p>
        </div>
        <span class="border border-line bg-paper px-3 py-1.5 text-sm text-ink">{{ $t(`common.saleStatus.${sale.status}`) }}</span>
      </div>

      <p
        v-if="hasUnpaidCredit(sale.remainingCredit)"
        class="border-s-2 border-clay bg-blush/60 px-4 py-3 text-sm font-medium text-clay"
      >
        {{ $t('shop.account.remaining') }} {{ formatDzd(sale.remainingCredit) }}
      </p>

      <section class="sf-panel">
        <ul class="divide-y divide-line">
          <li v-for="line in sale.lines" :key="line.productId" class="flex items-center justify-between gap-4 px-5 py-4 md:px-7">
            <div class="min-w-0">
              <p class="truncate text-[15px] font-medium text-ink">{{ line.productName }}</p>
              <p class="text-xs text-mute">{{ $t('shop.account.lineQty', { n: line.quantity }) }}</p>
            </div>
            <p class="text-sm text-ink tabular-nums">{{ formatDzd(line.lineTotal) }}</p>
          </li>
        </ul>
        <dl class="flex flex-col gap-2 border-t border-line px-5 py-5 md:px-7">
          <div class="flex items-center justify-between">
            <dt class="text-base font-medium text-ink">{{ $t('shop.account.total') }}</dt>
            <dd class="text-lg font-medium text-ink tabular-nums">{{ formatDzd(sale.total) }}</dd>
          </div>
          <div class="flex items-center justify-between text-sm text-mute">
            <dt>{{ $t('shop.account.paid') }}</dt>
            <dd class="tabular-nums">{{ formatDzd(sale.amountPaid) }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>
