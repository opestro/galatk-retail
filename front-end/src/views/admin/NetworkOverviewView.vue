<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
    <PageHeader title="Network overview">
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <input v-model="dateRange.from" type="date" class="input max-w-36" />
          <input v-model="dateRange.to" type="date" class="input max-w-36" />
          <button class="btn-secondary" @click="load">Apply</button>
        </div>
      </template>
    </PageHeader>

    <SkeletonStatCards v-if="loading" :count="2" />

    <div v-else-if="financial?.totals" class="card flex flex-col gap-4">
      <h3 class="font-medium text-gray-900">Network totals</h3>
      <div class="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
        <div>
          <p class="text-gray-500">POS collected</p>
          <p class="mt-1 font-semibold">{{ financial.totals.posCollected }} DZD</p>
        </div>
        <div>
          <p class="text-gray-500">Client payments</p>
          <p class="mt-1 font-semibold">{{ financial.totals.clientPaymentsReceived }} DZD</p>
        </div>
        <div>
          <p class="text-gray-500">Total cash in</p>
          <p class="mt-1 font-semibold">{{ financial.totals.totalCashIn }} DZD</p>
        </div>
        <div>
          <p class="text-gray-500">Outstanding credit</p>
          <p class="mt-1 font-semibold">{{ financial.totals.outstandingCredit }} DZD</p>
        </div>
        <div>
          <p class="text-gray-500">Total charges</p>
          <p class="mt-1 font-semibold">{{ financial.totals.totalCharges }} DZD</p>
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
            <p class="text-gray-500">POS collected</p>
            <p class="mt-1 font-semibold">{{ shop.posCollected }} DZD</p>
          </div>
          <div>
            <p class="text-gray-500">Client payments</p>
            <p class="mt-1 font-semibold">{{ shop.clientPaymentsReceived }} DZD</p>
          </div>
          <div>
            <p class="text-gray-500">Outstanding credit</p>
            <p class="mt-1 font-semibold">{{ shop.outstandingCredit }} DZD</p>
          </div>
          <div>
            <p class="text-gray-500">Total charges</p>
            <p class="mt-1 font-semibold">{{ shop.totalCharges }} DZD</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
