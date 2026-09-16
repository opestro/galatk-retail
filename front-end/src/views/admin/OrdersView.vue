<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { OnlineOrder } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'
import { listShopOrders, orderStatusLabel } from '@/services/orders'
import { ALGERIA_WILAYAS } from '@/data/algeriaWilayas'
import { formatDzd } from '@/utils/formatMoney'

const auth = useAuthStore()
const router = useRouter()
const orders = ref<OnlineOrder[]>([])
const loading = ref(true)
const search = ref('')
const statusFilter = ref('')
const wilayaFilter = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function loadOrders() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    orders.value = await listShopOrders(shopId, {
      q: search.value.trim() || undefined,
      status: statusFilter.value || undefined,
      wilaya: wilayaFilter.value || undefined,
    })
  } finally {
    loading.value = false
  }
}

function openOrder(orderId: string) {
  void router.push(`/admin/orders/${orderId}`)
}

watch([search], () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(loadOrders, 350)
})

watch([statusFilter, wilayaFilter], loadOrders)
onMounted(loadOrders)
watch(() => auth.selectedShopId, loadOrders)
</script>

<template>
  <div class="page-shell">
    <PageHeader title="Orders" />

    <div class="flex flex-col gap-3 md:flex-row">
      <input
        v-model="search"
        type="search"
        placeholder="Search order #, name, or phone…"
        class="input flex-1"
      />
      <select v-model="statusFilter" class="input md:w-48">
        <option value="">All statuses</option>
        <option value="PLACED">Pending</option>
        <option value="READY_FOR_PICKUP">Ready for pickup</option>
        <option value="OUT_FOR_DELIVERY">Out for delivery</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <select v-model="wilayaFilter" class="input md:w-48">
        <option value="">All wilayas</option>
        <option v-for="wilaya in ALGERIA_WILAYAS" :key="wilaya" :value="wilaya">{{ wilaya }}</option>
      </select>
    </div>

    <SkeletonList v-if="loading" :rows="5" />

    <div v-else class="overflow-x-auto rounded-lg border border-gray-200">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
          <tr>
            <th class="px-4 py-3">Order</th>
            <th class="px-4 py-3">Customer</th>
            <th class="px-4 py-3">Phone</th>
            <th class="px-4 py-3">Wilaya</th>
            <th class="px-4 py-3">Total</th>
            <th class="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-if="orders.length === 0">
            <td colspan="6" class="px-4 py-10 text-center text-gray-500">No orders found.</td>
          </tr>
          <tr
            v-for="order in orders"
            :key="order.id"
            class="cursor-pointer hover:bg-gray-50"
            @click="openOrder(order.id)"
          >
            <td class="px-4 py-3 font-medium text-gray-900">
              <RouterLink :to="`/admin/orders/${order.id}`" class="hover:underline">
                {{ order.orderNumber }}
              </RouterLink>
            </td>
            <td class="px-4 py-3 text-gray-700">{{ order.customerName }}</td>
            <td class="px-4 py-3 text-gray-700">{{ order.customerPhone }}</td>
            <td class="px-4 py-3 text-gray-700">{{ order.customerWilaya || order.deliveryCity || '—' }}</td>
            <td class="px-4 py-3 font-medium text-gray-900">{{ formatDzd(order.total) }}</td>
            <td class="px-4 py-3 text-gray-600">{{ orderStatusLabel(order.status) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
