<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { OnlineOrder } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'
import OrderCompleteModal from '@/components/pos/OrderCompleteModal.vue'
import {
  cancelShopOrder,
  getShopOrder,
  orderStatusLabel,
  updateShopOrderStatus,
} from '@/services/orders'
import { formatDzd } from '@/utils/formatMoney'

const route = useRoute()
const auth = useAuthStore()
const order = ref<OnlineOrder | null>(null)
const loading = ref(true)
const error = ref('')
const completing = ref(false)

const orderId = computed(() => String(route.params.orderId))

async function load() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    order.value = await getShopOrder(shopId, orderId.value)
  } catch {
    error.value = 'Order not found.'
    order.value = null
  } finally {
    loading.value = false
  }
}

async function confirmOrder() {
  const shopId = auth.selectedShopId
  if (!shopId || !order.value) return
  const status = order.value.fulfillmentType === 'PICKUP' ? 'READY_FOR_PICKUP' : 'OUT_FOR_DELIVERY'
  await updateShopOrderStatus(shopId, order.value.id, status)
  await load()
}

async function cancel() {
  const shopId = auth.selectedShopId
  if (!shopId || !order.value) return
  await cancelShopOrder(shopId, order.value.id, 'Staff cancelled')
  await load()
}

onMounted(load)
watch(() => [auth.selectedShopId, orderId.value], load)
</script>

<template>
  <div class="page-shell">
    <PageHeader title="Order details">
      <template #actions>
        <RouterLink to="/admin/orders" class="btn-secondary text-sm">Back to orders</RouterLink>
      </template>
    </PageHeader>

    <SkeletonForm v-if="loading" :fields="6" />
    <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div v-else-if="order" class="flex flex-col gap-5">
      <section class="card flex flex-col gap-2">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h2 class="text-lg font-semibold text-gray-900">{{ order.orderNumber }}</h2>
          <span class="text-sm text-gray-600">{{ orderStatusLabel(order.status) }}</span>
        </div>
        <p class="text-xs text-gray-500">{{ new Date(order.createdAt).toLocaleString() }}</p>
      </section>

      <section class="card flex flex-col gap-2">
        <h3 class="text-sm font-semibold text-gray-900">Customer</h3>
        <p class="text-sm text-gray-800"><span class="text-gray-500">Full name:</span> {{ order.customerName }}</p>
        <p class="text-sm text-gray-800"><span class="text-gray-500">Phone:</span> {{ order.customerPhone }}</p>
        <p class="text-sm text-gray-800">
          <span class="text-gray-500">Wilaya:</span> {{ order.customerWilaya || order.deliveryCity || '—' }}
        </p>
      </section>

      <section class="overflow-hidden rounded-lg border border-gray-200">
        <h3 class="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">Products</h3>
        <ul class="divide-y divide-gray-100">
          <li v-for="line in order.lines" :key="line.id" class="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="font-medium text-gray-900">{{ line.productName }}</p>
              <p class="text-sm text-gray-500">{{ line.variantLabel }}</p>
              <p class="text-xs text-gray-500">Qty {{ line.quantity }} · {{ formatDzd(line.unitPrice) }} each</p>
            </div>
            <p class="text-sm font-medium text-gray-900">{{ formatDzd(line.lineTotal) }}</p>
          </li>
        </ul>
        <div class="flex justify-between border-t border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">
          <span>Total</span>
          <span>{{ formatDzd(order.total) }}</span>
        </div>
      </section>

      <div class="flex flex-wrap gap-2">
        <button
          v-if="order.status === 'PLACED'"
          type="button"
          class="btn-primary"
          @click="confirmOrder"
        >
          Confirm
        </button>
        <button
          v-if="['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(order.status)"
          type="button"
          class="btn-primary"
          @click="completing = true"
        >
          Complete with payment
        </button>
        <button
          v-if="auth.isManager && !['COMPLETED', 'CANCELLED'].includes(order.status)"
          type="button"
          class="btn-danger"
          @click="cancel"
        >
          Cancel
        </button>
      </div>
    </div>

    <OrderCompleteModal
      v-if="completing && order"
      :order="order"
      @close="completing = false"
      @completed="completing = false; load()"
    />
  </div>
</template>
