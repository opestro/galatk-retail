<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { getNetworkFinancialSummary } from '@/services/clientApi'
import type { DashboardSummary, NetworkFinancialSummary } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import AdminStat from '@/components/admin/AdminStat.vue'
import AdminDateRange from '@/components/admin/AdminDateRange.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { formatAmount, formatMoney } from '@/utils/formatMoney'
import { HandCoins, PackageCheck, Scale, Store, TrendingUp } from 'lucide-vue-next'

interface NetworkShop extends DashboardSummary {
  shopId: string
  shopName: string
  shopSlug: string
}

const { t } = useI18n()
const shops = ref<NetworkShop[]>([])
const financial = ref<NetworkFinancialSummary | null>(null)
const loading = ref(true)
const dateRange = ref({ from: '', to: '' })

async function load() {
  loading.value = !financial.value
  try {
    const [networkRes, financialRes] = await Promise.all([
      api.get<{ data: NetworkShop[] }>('/dashboard/network'),
      getNetworkFinancialSummary(dateRange.value.from || undefined, dateRange.value.to || undefined),
    ])
    shops.value = networkRes.data.data ?? []
    financial.value = financialRes.data.data
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="t('admin.network.title')" :subtitle="t('admin.network.subtitle')" />

    <AdminDateRange v-model="dateRange" @change="load" />

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="i in 4" :key="i" class="pos-skeleton h-[92px] rounded-2xl" />
    </div>
    <div v-else-if="financial?.totals" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <AdminStat :icon="TrendingUp" :label="t('admin.network.grossRevenue')" :value="formatAmount(financial.totals.grossRevenue)" :unit="t('common.currency')" />
      <AdminStat :icon="Scale" tone="ok" :label="t('admin.network.grossProfit')" :value="formatAmount(financial.totals.grossProfit)" :unit="t('common.currency')" />
      <AdminStat :icon="PackageCheck" :label="t('admin.network.totalCashIn')" :value="formatAmount(financial.totals.totalCashIn)" :unit="t('common.currency')" />
      <AdminStat
        :icon="HandCoins"
        :tone="Number(financial.totals.outstandingCredit) > 0 ? 'warn' : 'neutral'"
        :label="t('admin.network.outstandingCredit')"
        :value="formatAmount(financial.totals.outstandingCredit)"
        :unit="t('common.currency')"
      />
    </div>

    <section class="flex flex-col gap-3">
      <h2 class="pos-section-label">{{ t('admin.network.byShop') }}</h2>
      <div class="pos-surface overflow-hidden">
        <div v-if="loading" class="flex flex-col gap-3 p-5"><div v-for="i in 3" :key="i" class="pos-skeleton h-5" /></div>
        <div v-else-if="financial?.shops.length" class="overflow-x-auto">
          <table class="pos-table min-w-[920px]">
            <thead>
              <tr>
                <th scope="col">{{ t('admin.network.colShop') }}</th>
                <th scope="col" class="pos-cell-num">{{ t('admin.network.grossRevenue') }}</th>
                <th scope="col" class="pos-cell-num">{{ t('admin.network.cogs') }}</th>
                <th scope="col" class="pos-cell-num">{{ t('admin.network.grossProfit') }}</th>
                <th scope="col" class="pos-cell-num">{{ t('admin.network.posCollected') }}</th>
                <th scope="col" class="pos-cell-num">{{ t('admin.network.clientPayments') }}</th>
                <th scope="col" class="pos-cell-num">{{ t('admin.network.outstandingCredit') }}</th>
                <th scope="col" class="pos-cell-num">{{ t('admin.network.totalCharges') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="shop in financial.shops" :key="shop.shopId">
                <td class="whitespace-nowrap">
                  <span class="flex items-center gap-2.5">
                    <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-pos-canvas text-pos-muted"><Store class="h-4 w-4" /></span>
                    <span>
                      <span class="block font-medium text-pos-ink">{{ shop.shopName }}</span>
                      <span class="block text-[12px] text-pos-muted" dir="ltr">/{{ shops.find((s) => s.shopId === shop.shopId)?.shopSlug }}</span>
                    </span>
                  </span>
                </td>
                <td class="pos-cell-num font-medium text-pos-ink">{{ formatMoney(shop.grossRevenue) }}</td>
                <td class="pos-cell-num text-pos-muted">{{ formatMoney(shop.costOfGoodsSold) }}</td>
                <td class="pos-cell-num font-medium text-pos-ok">{{ formatMoney(shop.grossProfit) }}</td>
                <td class="pos-cell-num">{{ formatMoney(shop.posCollected) }}</td>
                <td class="pos-cell-num">{{ formatMoney(shop.clientPaymentsReceived) }}</td>
                <td class="pos-cell-num" :class="Number(shop.outstandingCredit) > 0 ? 'text-pos-warn' : ''">{{ formatMoney(shop.outstandingCredit) }}</td>
                <td class="pos-cell-num">{{ formatMoney(shop.totalCharges) }}</td>
              </tr>
            </tbody>
            <tfoot v-if="financial.shops.length > 1">
              <tr class="font-semibold text-pos-ink">
                <td class="border-t border-pos-line px-4 py-3.5">{{ t('admin.network.totals') }}</td>
                <td class="pos-cell-num border-t border-pos-line px-4 py-3.5">{{ formatMoney(financial.totals.grossRevenue) }}</td>
                <td class="pos-cell-num border-t border-pos-line px-4 py-3.5">{{ formatMoney(financial.totals.costOfGoodsSold) }}</td>
                <td class="pos-cell-num border-t border-pos-line px-4 py-3.5 text-pos-ok">{{ formatMoney(financial.totals.grossProfit) }}</td>
                <td class="pos-cell-num border-t border-pos-line px-4 py-3.5">{{ formatMoney(financial.totals.posCollected) }}</td>
                <td class="pos-cell-num border-t border-pos-line px-4 py-3.5">{{ formatMoney(financial.totals.clientPaymentsReceived) }}</td>
                <td class="pos-cell-num border-t border-pos-line px-4 py-3.5">{{ formatMoney(financial.totals.outstandingCredit) }}</td>
                <td class="pos-cell-num border-t border-pos-line px-4 py-3.5">{{ formatMoney(financial.totals.totalCharges) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <PosEmptyState v-else :icon="Store" :title="t('admin.shops.empty')" compact />
      </div>
    </section>
  </div>
</template>
