<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { OnlineOrder } from '@/types/api'
import OrderCompleteModal from '@/components/pos/OrderCompleteModal.vue'
import ClientPurchasesModal from '@/components/pos/ClientPurchasesModal.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'
import { ShoppingBag } from 'lucide-vue-next'
import { orderStatusLabel } from '@/services/orders'
import OrderPaymentBadge from '@/components/orders/OrderPaymentBadge.vue'

const { t } = useI18n()
const auth = useAuthStore()
const orders = ref<OnlineOrder[]>([])
const loading = ref(true)
const completingOrder = ref<OnlineOrder | null>(null)
const purchasesClientId = ref<string | null>(null)
const purchasesClientName = ref('')
const filter = ref<'active' | 'all'>('active')
const search = ref('')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const activeStatuses = ['PLACED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY']

const displayed = computed(() =>
  filter.value === 'active'
    ? orders.value.filter((o) => activeStatuses.includes(o.status))
    : orders.value,
)

const pendingCount = computed(
  () => orders.value.filter((o) => activeStatuses.includes(o.status)).length,
)

function fulfillmentLabel(type: string): string {
  return t(`common.fulfillment.${type}`)
}

async function loadOrders() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const q = search.value.trim() || undefined
    const { data } = await api.get<{ data: OnlineOrder[] }>(`/shops/${shopId}/orders`, {
      params: { q },
    })
    orders.value = data.data
  } finally {
    loading.value = false
  }
}

watch(search, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(loadOrders, 400)
})

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

function openPurchases(order: OnlineOrder) {
  if (!order.client) return
  purchasesClientId.value = order.client.id
  purchasesClientName.value = order.client.name
}

onMounted(loadOrders)
watch(() => auth.selectedShopId, loadOrders)
</script>

<template>
  <div class="page-shell max-w-full">
    <div class="page-header">
      <div>
        <h2 class="page-title">{{ $t('pos.orders.title') }}</h2>
        <p class="text-sm text-gray-500">{{ $t('pos.orders.subtitle', { n: pendingCount }) }}</p>
      </div>
      <select v-model="filter" class="input w-auto">
        <option value="active">{{ $t('pos.orders.filterActive') }}</option>
        <option value="all">{{ $t('pos.orders.filterAll') }}</option>
      </select>
    </div>

    <input v-model="search" :placeholder="$t('pos.orders.searchPlaceholder')" class="input max-w-sm" />

    <SkeletonList v-if="loading" :rows="4" />
    <ul v-else class="flex flex-col gap-4">
      <li v-for="order in displayed" :key="order.id" class="card flex flex-col gap-3">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p class="font-semibold text-gray-900">{{ order.orderNumber }}</p>
            <p class="text-sm text-gray-600">{{ order.customerName }} · {{ order.customerPhone }}</p>
            <p v-if="order.client" class="text-xs text-gray-500">
              {{ $t('pos.orders.clientRegister', { name: order.client.name, balance: order.client.balance }) }}
            </p>
          </div>
          <div class="flex flex-col items-end gap-1">
            <span class="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600">
              {{ orderStatusLabel(order.status) }}
            </span>
            <OrderPaymentBadge :order="order" />
          </div>
        </div>

        <p class="text-sm text-gray-700">
          {{ $t('pos.orders.orderMeta', { total: order.total, fulfillment: fulfillmentLabel(order.fulfillmentType) }) }}
          <span v-if="order.lines?.length"> {{ $t('pos.orders.itemCount', { n: order.lines.length }) }}</span>
        </p>

        <div class="flex flex-wrap gap-2">
          <button
            v-if="order.status === 'PLACED'"
            class="btn-primary px-3 py-1.5 text-xs"
            @click="markReady(order)"
          >
            {{ $t('pos.orders.acceptReady') }}
          </button>
            <button
            v-if="['PLACED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(order.status)"
            class="btn-primary px-3 py-1.5 text-xs"
            @click="openComplete(order)"
          >
            {{ $t('pos.orders.completeCollect') }}
          </button>
          <button
            v-if="order.client"
            type="button"
            class="btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs"
            @click="openPurchases(order)"
          >
            <ShoppingBag class="h-3.5 w-3.5" />
            {{ $t('pos.orders.viewPurchases') }}
          </button>
        </div>
      </li>
      <li v-if="!displayed.length" class="card text-sm text-gray-500">{{ $t('pos.orders.empty') }}</li>
    </ul>

    <OrderCompleteModal
      v-if="completingOrder"
      :order="completingOrder"
      @close="completingOrder = null"
      @completed="completingOrder = null; loadOrders()"
    />

    <ClientPurchasesModal
      v-if="purchasesClientId"
      :client-id="purchasesClientId"
      :client-name="purchasesClientName"
      @close="purchasesClientId = null"
    />
  </div>
</template>
