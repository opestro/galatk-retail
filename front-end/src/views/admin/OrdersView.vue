<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { OnlineOrder } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'
import OrderCompleteModal from '@/components/pos/OrderCompleteModal.vue'

const auth = useAuthStore()
const orders = ref<OnlineOrder[]>([])
const loading = ref(true)
const completingOrder = ref<OnlineOrder | null>(null)

async function loadOrders() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const { data } = await api.get<{ data: OnlineOrder[] }>(`/shops/${shopId}/orders`)
    orders.value = data.data
  } finally {
    loading.value = false
  }
}

async function updateStatus(orderId: string, status: string) {
  const shopId = auth.selectedShopId
  if (!shopId) return
  await api.patch(`/shops/${shopId}/orders/${orderId}/status`, { status })
  await loadOrders()
}

async function cancelOrder(orderId: string) {
  const shopId = auth.selectedShopId
  if (!shopId) return
  await api.post(`/shops/${shopId}/orders/${orderId}/cancel`, { reason: 'Staff cancelled' })
  await loadOrders()
}

onMounted(loadOrders)
watch(() => auth.selectedShopId, loadOrders)
</script>

<template>
  <div class="page-shell">
    <PageHeader title="Online orders" />

    <SkeletonList v-if="loading" :rows="4" />
    <ul v-else class="flex flex-col gap-4">
      <li v-for="order in orders" :key="order.id" class="card flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-medium text-gray-900">{{ order.orderNumber }}</span>
          <span class="text-sm text-gray-500">{{ order.status }}</span>
        </div>
        <p class="text-sm text-gray-600">{{ order.customerName }} · {{ order.customerPhone }}</p>
        <p v-if="order.client" class="text-xs text-gray-500">
          Client: {{ order.client.name }} ({{ order.client.balance }} DZD balance)
        </p>
        <p class="text-sm font-medium text-gray-900">{{ order.total }} DZD · {{ order.fulfillmentType }}</p>

        <div v-if="order.status === 'PLACED'" class="flex flex-wrap gap-2 pt-1">
          <button
            class="btn-secondary px-3 py-1.5 text-xs"
            @click="updateStatus(order.id, order.fulfillmentType === 'PICKUP' ? 'READY_FOR_PICKUP' : 'OUT_FOR_DELIVERY')"
          >
            Mark ready
          </button>
          <button
            v-if="auth.isManager"
            class="btn-danger px-3 py-1.5 text-xs"
            @click="cancelOrder(order.id)"
          >
            Cancel
          </button>
        </div>
        <button
          v-if="['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(order.status)"
          class="btn-primary px-3 py-1.5 text-xs"
          @click="completingOrder = order"
        >
          Complete with payment
        </button>
      </li>
    </ul>

    <OrderCompleteModal
      v-if="completingOrder"
      :order="completingOrder"
      @close="completingOrder = null"
      @completed="completingOrder = null; loadOrders()"
    />
  </div>
</template>
