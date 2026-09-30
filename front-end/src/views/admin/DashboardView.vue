<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { getFinancialSummary } from '@/services/clientApi'
import type { DashboardSummary, FinancialSummary } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonStatCards from '@/components/ui/SkeletonStatCards.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'

const { t } = useI18n()
const auth = useAuthStore()
const summary = ref<DashboardSummary | null>(null)
const financial = ref<FinancialSummary | null>(null)
const loading = ref(true)
const dateRange = ref({ from: '', to: '' })

async function load() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [summaryRes, financialRes] = await Promise.all([
      api.get<{ data: DashboardSummary }>(`/shops/${shopId}/dashboard/summary`),
      getFinancialSummary(shopId, dateRange.value.from || undefined, dateRange.value.to || undefined),
    ])
    summary.value = summaryRes.data.data
    financial.value = financialRes.data.data
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => auth.selectedShopId, load)
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="t('admin.dashboard.title')">
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <input v-model="dateRange.from" type="date" class="input max-w-36" />
          <input v-model="dateRange.to" type="date" class="input max-w-36" />
          <button class="btn-secondary" @click="load">{{ t('common.apply') }}</button>
        </div>
      </template>
    </PageHeader>

    <SkeletonStatCards v-if="loading" />

    <div v-else-if="summary" class="grid gap-6 md:grid-cols-3">
      <div class="card">
        <p class="text-sm text-gray-500">{{ t('admin.dashboard.todaySales') }}</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.todaySalesCount }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">{{ t('admin.dashboard.todayRevenue') }}</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.todayRevenue }} {{ t('common.currency') }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">{{ t('admin.dashboard.lowStockItems') }}</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.lowStock.length }}</p>
      </div>
    </div>

    <div v-if="financial && !loading" class="flex flex-col gap-4">
      <h3 class="section-title">{{ t('admin.dashboard.financialSummary') }}</h3>
      <div class="grid gap-6 md:grid-cols-3 lg:grid-cols-4">
        <div class="card">
          <p class="text-sm text-gray-500">{{ t('admin.dashboard.grossRevenue') }}</p>
          <p class="mt-2 text-xl font-semibold">{{ financial.grossRevenue }} {{ t('common.currency') }}</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">{{ t('admin.dashboard.costOfGoods') }}</p>
          <p class="mt-2 text-xl font-semibold">{{ financial.costOfGoodsSold }} {{ t('common.currency') }}</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">{{ t('admin.dashboard.grossProfit') }}</p>
          <p class="mt-2 text-xl font-semibold text-green-700">{{ financial.grossProfit }} {{ t('common.currency') }}</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">{{ t('admin.dashboard.posCollected') }}</p>
          <p class="mt-2 text-xl font-semibold">{{ financial.posCollected }} {{ t('common.currency') }}</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">{{ t('admin.dashboard.clientPayments') }}</p>
          <p class="mt-2 text-xl font-semibold">{{ financial.clientPaymentsReceived }} {{ t('common.currency') }}</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">{{ t('admin.dashboard.totalCashIn') }}</p>
          <p class="mt-2 text-xl font-semibold">{{ financial.totalCashIn }} {{ t('common.currency') }}</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">{{ t('admin.dashboard.outstandingCredit') }}</p>
          <p class="mt-2 text-xl font-semibold">{{ financial.outstandingCredit }} {{ t('common.currency') }}</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">{{ t('admin.dashboard.totalCharges') }}</p>
          <p class="mt-2 text-xl font-semibold">{{ financial.totalCharges }} {{ t('common.currency') }}</p>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col gap-4">
      <h3 class="section-title">{{ t('admin.dashboard.lowStockAlerts') }}</h3>
      <SkeletonList :rows="3" />
    </div>

    <div v-else-if="summary?.lowStock.length" class="flex flex-col gap-4">
      <h3 class="section-title">{{ t('admin.dashboard.lowStockAlerts') }}</h3>
      <ul class="list-panel">
        <li v-for="item in summary.lowStock" :key="item.productId" class="list-row">
          <span>{{ item.productName }}</span>
          <span class="font-medium text-red-600">{{ t('admin.dashboard.quantityLeft', { n: item.quantity }) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
