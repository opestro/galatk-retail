<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { OnlineOrder } from '@/types/api'
import OrderCompleteModal from '@/components/pos/OrderCompleteModal.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'

const auth = useAuthStore()
const orders = ref<OnlineOrder[]>([])
const loading = ref(true)
const completingOrder = ref<OnlineOrder | null>(null)
const filter = ref<'active' | 'all'>('active')

const activeStatuses = ['PLACED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY']

const displayed = computed(() =>
  filter.value === 'active'
    ? orders.value.filter((o) => activeStatuses.includes(o.status))
    : orders.value,
)

const pendingCount = computed(
  () => orders.value.filter((o) => activeStatuses.includes(o.status)).length,
)

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

async function markReady(order: OnlineOrder) {
  const shopId = auth.selectedShopId
  if (!shopId) return
  const status = order.fulfillmentType === 'PICKUP' ? 'READY_FOR_PICKUP' : 'OUT_FOR_DELIVERY'
  await api.patch(`/shops/${shopId}/orders/${order.id}/status`, { status })
  await loadOrders()
}

function openComplete(order: OnlineOrder) {
  completingOrder.value = order
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase()
}

onMounted(loadOrders)
watch(() => auth.selectedShopId, loadOrders)
</script>

<template>
  <div class="page-shell max-w-full">
    <div class="page-header">
      <div>
        <h2 class="page-title">Online orders</h2>
        <p class="text-sm text-gray-500">{{ pendingCount }} active · accept and collect payment on handoff</p>
      </div>
      <select v-model="filter" class="input w-auto">
        <option value="active">Active only</option>
        <option value="all">All orders</option>
      </select>
    </div>

    <SkeletonList v-if="loading" :rows="4" />
    <ul v-else class="flex flex-col gap-4">
      <li v-for="order in displayed" :key="order.id" class="card flex flex-col gap-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-semibold text-gray-900">{{ order.orderNumber }}</p>
            <p class="text-sm text-gray-600">{{ order.customerName }} · {{ order.customerPhone }}</p>
            <p v-if="order.client" class="text-xs text-gray-500">
              Client register: {{ order.client.name }} ({{ order.client.balance }} DZD owed)
            </p>
          </div>
          <span class="rounded-md border border-gray-200 px-2 py-1 text-xs capitalize text-gray-600">
            {{ statusLabel(order.status) }}
          </span>
        </div>

        <p class="text-sm text-gray-700">
          {{ order.total }} DZD · {{ order.fulfillmentType }}
          <span v-if="order.lines?.length"> · {{ order.lines.length }} item(s)</span>
        </p>

        <div class="flex flex-wrap gap-2">
          <button
            v-if="order.status === 'PLACED'"
            class="btn-primary px-3 py-1.5 text-xs"
            @click="markReady(order)"
          >
            Accept & mark ready
          </button>
          <button
            v-if="['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(order.status)"
            class="btn-primary px-3 py-1.5 text-xs"
            @click="openComplete(order)"
          >
            Complete & collect payment
          </button>
        </div>
      </li>
      <li v-if="!displayed.length" class="card text-sm text-gray-500">No orders in this view.</li>
    </ul>

    <OrderCompleteModal
      v-if="completingOrder"
      :order="completingOrder"
      @close="completingOrder = null"
      @completed="completingOrder = null; loadOrders()"
    />
  </div>
</template>
