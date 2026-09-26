<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { getNetworkFinancialSummary } from '@/services/clientApi'
import type { DashboardSummary, NetworkFinancialSummary } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonStatCards from '@/components/ui/SkeletonStatCards.vue'

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
  loading.value = true
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
    <PageHeader :title="t('admin.network.title')">
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <input v-model="dateRange.from" type="date" class="input max-w-36" />
          <input v-model="dateRange.to" type="date" class="input max-w-36" />
          <button class="btn-secondary" @click="load">{{ t('common.apply') }}</button>
        </div>
      </template>
    </PageHeader>

    <SkeletonStatCards v-if="loading" :count="2" />

    <div v-else-if="financial?.totals" class="card flex flex-col gap-4">
      <h3 class="font-medium text-gray-900">{{ t('admin.network.totals') }}</h3>
      <div class="grid grid-cols-2 gap-4 text-sm md:grid-cols-4 lg:grid-cols-8">
        <div>
          <p class="text-gray-500">{{ t('admin.network.grossRevenue') }}</p>
          <p class="mt-1 font-semibold">{{ financial.totals.grossRevenue }} {{ t('common.currency') }}</p>
        </div>
        <div>
          <p class="text-gray-500">{{ t('admin.network.cogs') }}</p>
          <p class="mt-1 font-semibold">{{ financial.totals.costOfGoodsSold }} {{ t('common.currency') }}</p>
        </div>
        <div>
          <p class="text-gray-500">{{ t('admin.network.grossProfit') }}</p>
          <p class="mt-1 font-semibold text-green-700">{{ financial.totals.grossProfit }} {{ t('common.currency') }}</p>
        </div>
        <div>
          <p class="text-gray-500">{{ t('admin.network.posCollected') }}</p>
          <p class="mt-1 font-semibold">{{ financial.totals.posCollected }} {{ t('common.currency') }}</p>
        </div>
        <div>
          <p class="text-gray-500">{{ t('admin.network.clientPayments') }}</p>
          <p class="mt-1 font-semibold">{{ financial.totals.clientPaymentsReceived }} {{ t('common.currency') }}</p>
        </div>
        <div>
          <p class="text-gray-500">{{ t('admin.network.totalCashIn') }}</p>
          <p class="mt-1 font-semibold">{{ financial.totals.totalCashIn }} {{ t('common.currency') }}</p>
        </div>
        <div>
          <p class="text-gray-500">{{ t('admin.network.outstandingCredit') }}</p>
          <p class="mt-1 font-semibold">{{ financial.totals.outstandingCredit }} {{ t('common.currency') }}</p>
        </div>
        <div>
          <p class="text-gray-500">{{ t('admin.network.totalCharges') }}</p>
          <p class="mt-1 font-semibold">{{ financial.totals.totalCharges }} {{ t('common.currency') }}</p>
        </div>
      </div>
    </div>

    <div v-if="!loading" class="grid gap-6 md:grid-cols-2">
      <div v-for="shop in financial?.shops ?? []" :key="shop.shopId" class="card flex flex-col gap-4">
        <div>
          <h3 class="font-medium text-gray-900">{{ shop.shopName }}</h3>
          <p class="text-sm text-gray-500">
            {{ shops.find((s) => s.shopId === shop.shopId)?.shopSlug }}
          </p>
        </div>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-500">{{ t('admin.network.grossProfit') }}</p>
            <p class="mt-1 font-semibold text-green-700">{{ shop.grossProfit }} {{ t('common.currency') }}</p>
          </div>
          <div>
            <p class="text-gray-500">{{ t('admin.network.grossRevenue') }}</p>
            <p class="mt-1 font-semibold">{{ shop.grossRevenue }} {{ t('common.currency') }}</p>
          </div>
          <div>
            <p class="text-gray-500">{{ t('admin.network.posCollected') }}</p>
            <p class="mt-1 font-semibold">{{ shop.posCollected }} {{ t('common.currency') }}</p>
          </div>
          <div>
            <p class="text-gray-500">{{ t('admin.network.clientPayments') }}</p>
            <p class="mt-1 font-semibold">{{ shop.clientPaymentsReceived }} {{ t('common.currency') }}</p>
          </div>
          <div>
            <p class="text-gray-500">{{ t('admin.network.outstandingCredit') }}</p>
            <p class="mt-1 font-semibold">{{ shop.outstandingCredit }} {{ t('common.currency') }}</p>
          </div>
          <div>
            <p class="text-gray-500">{{ t('admin.network.totalCharges') }}</p>
            <p class="mt-1 font-semibold">{{ shop.totalCharges }} {{ t('common.currency') }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
