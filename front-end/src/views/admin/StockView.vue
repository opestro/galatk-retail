<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { ShopStockItem } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'

const auth = useAuthStore()
const stock = ref<ShopStockItem[]>([])
const loading = ref(true)

async function loadStock() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const { data } = await api.get<{ data: ShopStockItem[] }>(`/shops/${shopId}/stock`)
    stock.value = data.data
  } finally {
    loading.value = false
  }
}

onMounted(loadStock)
watch(() => auth.selectedShopId, loadStock)
</script>

<template>
  <div class="page-shell">
    <PageHeader title="Stock overview" />

    <SkeletonTable v-if="loading" />
    <div v-else class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table class="min-w-full text-sm">
        <thead class="border-b border-gray-200 bg-gray-50">
          <tr>
            <th class="px-5 py-3 text-left font-medium text-gray-700">Product</th>
            <th class="px-5 py-3 text-right font-medium text-gray-700">Price</th>
            <th class="px-5 py-3 text-right font-medium text-gray-700">Quantity</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr v-for="item in stock" :key="item.id">
            <td class="px-5 py-4">{{ item.product.name }}</td>
            <td class="px-5 py-4 text-right">{{ item.product.sellPrice }} DZD</td>
            <td
              class="px-5 py-4 text-right"
              :class="item.quantity <= 5 ? 'font-medium text-red-600' : ''"
            >
              {{ item.quantity }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
