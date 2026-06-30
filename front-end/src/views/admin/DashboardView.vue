<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { getFinancialSummary } from '@/services/clientApi'
import type { DashboardSummary, FinancialSummary } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonStatCards from '@/components/ui/SkeletonStatCards.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'

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
    <PageHeader title="Dashboard">
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <input v-model="dateRange.from" type="date" class="input max-w-36" />
          <input v-model="dateRange.to" type="date" class="input max-w-36" />
          <button class="btn-secondary" @click="load">Apply</button>
        </div>
      </template>
    </PageHeader>

    <SkeletonStatCards v-if="loading" />

    <div v-else-if="summary" class="grid gap-6 md:grid-cols-3">
      <div class="card">
        <p class="text-sm text-gray-500">Today's sales</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.todaySalesCount }}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">Today's revenue</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.todayRevenue }} DZD</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">Low stock items</p>
        <p class="mt-2 text-2xl font-semibold">{{ summary.lowStock.length }}</p>
      </div>
    </div>

    <div v-if="financial && !loading" class="flex flex-col gap-4">
      <h3 class="section-title">Financial summary</h3>
      <div class="grid gap-6 md:grid-cols-3 lg:grid-cols-5">
        <div class="card">
          <p class="text-sm text-gray-500">POS collected</p>
          <p class="mt-2 text-xl font-semibold">{{ financial.posCollected }} DZD</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">Client payments</p>
          <p class="mt-2 text-xl font-semibold">{{ financial.clientPaymentsReceived }} DZD</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">Total cash in</p>
          <p class="mt-2 text-xl font-semibold">{{ financial.totalCashIn }} DZD</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">Outstanding credit</p>
          <p class="mt-2 text-xl font-semibold">{{ financial.outstandingCredit }} DZD</p>
        </div>
        <div class="card">
          <p class="text-sm text-gray-500">Total charges</p>
          <p class="mt-2 text-xl font-semibold">{{ financial.totalCharges }} DZD</p>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col gap-4">
      <h3 class="section-title">Low stock alerts</h3>
      <SkeletonList :rows="3" />
    </div>

    <div v-else-if="summary?.lowStock.length" class="flex flex-col gap-4">
      <h3 class="section-title">Low stock alerts</h3>
      <ul class="list-panel">
        <li v-for="item in summary.lowStock" :key="item.productId" class="list-row">
          <span>{{ item.productName }}</span>
          <span class="font-medium text-red-600">{{ item.quantity }} left</span>
        </li>
      </ul>
    </div>
  </div>
</template>
