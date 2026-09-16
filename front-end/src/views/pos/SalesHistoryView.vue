<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Printer } from 'lucide-vue-next'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Sale } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'
import VoidSaleDialog from '@/components/pos/VoidSaleDialog.vue'
import { printPosReceipt, saleToReceipt } from '@/utils/printPosReceipt'

const auth = useAuthStore()
const sales = ref<Sale[]>([])
const loading = ref(true)
const voidTarget = ref<Sale | null>(null)
const printError = ref('')

async function loadSales() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const { data } = await api.get<{ data: Sale[] }>(`/shops/${shopId}/pos/sales`)
    sales.value = data.data
  } finally {
    loading.value = false
  }
}

function printSale(sale: Sale) {
  printError.value = ''
  try {
    printPosReceipt(saleToReceipt(sale, auth.staff?.name ?? 'Staff'))
  } catch (err) {
    printError.value = err instanceof Error ? err.message : 'Could not print the receipt.'
  }
}

function openVoid(sale: Sale) {
  voidTarget.value = sale
}

async function onVoided() {
  voidTarget.value = null
  await loadSales()
}

onMounted(loadSales)
</script>

<template>
  <div class="page-shell max-w-full">
    <PageHeader title="Sales history" />
    <p v-if="printError" class="text-sm text-red-600">{{ printError }}</p>

    <SkeletonList v-if="loading" />
    <ul v-else class="list-panel">
      <li v-for="sale in sales" :key="sale.id" class="list-row">
        <div>
          <p class="font-medium text-gray-900">{{ sale.total }} DZD · {{ sale.paymentMethod }}</p>
          <p class="mt-0.5 text-sm text-gray-500">
            {{ sale.cashier.name }} · {{ new Date(sale.createdAt).toLocaleString() }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span
            class="rounded px-2 py-1 text-xs"
            :class="sale.status === 'CANCELLED' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'"
          >
            {{ sale.status }}
          </span>
          <button
            type="button"
            class="btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs"
            @click="printSale(sale)"
          >
            <Printer class="h-3.5 w-3.5" />
            Print
          </button>
          <button
            v-if="sale.status === 'COMPLETED'"
            class="text-sm text-red-600 underline"
            @click="openVoid(sale)"
          >
            Void
          </button>
        </div>
      </li>
    </ul>

    <VoidSaleDialog v-if="voidTarget" :sale="voidTarget" @close="voidTarget = null" @voided="onVoided" />
  </div>
</template>
