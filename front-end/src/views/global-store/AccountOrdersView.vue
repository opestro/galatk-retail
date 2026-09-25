<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useCustomerAuthStore } from '@/stores/customerAuth'
import { listMyOrders } from '@/services/customerAccount'
import { orderStatusLabel } from '@/services/orders'
import { formatDzd } from '@/utils/formatMoney'
import type { CustomerOrder } from '@/types/api'
import { Package } from 'lucide-vue-next'

const router = useRouter()
const customerAuth = useCustomerAuthStore()
const orders = ref<CustomerOrder[]>([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    orders.value = await listMyOrders()
  } catch {
    error.value = 'Could not load your orders. Please try again.'
  } finally {
    loading.value = false
  }
})

function statusClass(status: string) {
  if (status === 'COMPLETED') return 'bg-green-50 text-green-700'
  if (status === 'CANCELLED') return 'bg-red-50 text-red-700'
  return 'bg-gray-100 text-gray-700'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold text-gray-900">My orders</h1>
        <p v-if="customerAuth.customer" class="mt-1 text-sm text-gray-600">
          {{ customerAuth.customer.name }} · {{ customerAuth.customer.phone }}
        </p>
      </div>
      <button type="button" class="btn-secondary" @click="customerAuth.logout(); void router.push('/store')">
        Sign out
      </button>
    </div>

    <div v-if="loading" class="flex flex-col gap-3">
      <div v-for="n in 3" :key="n" class="skeleton h-24 rounded-xl" />
    </div>

    <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div
      v-else-if="orders.length === 0"
      class="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-16 text-center"
    >
      <Package class="h-10 w-10 text-gray-300" />
      <p class="text-gray-500">You have no orders yet.</p>
      <RouterLink to="/store" class="btn-primary mt-2">Browse products</RouterLink>
    </div>

    <ul v-else class="flex flex-col gap-3">
      <li v-for="order in orders" :key="order.id">
        <RouterLink
          :to="`/store/account/orders/${order.id}`"
          class="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-4 hover:border-gray-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <div class="min-w-0">
            <p class="font-medium text-gray-900">{{ order.orderNumber }}</p>
            <p class="text-sm text-gray-500">{{ order.shop.name }} · {{ new Date(order.createdAt).toLocaleDateString() }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="statusClass(order.status)">
              {{ orderStatusLabel(order.status) }}
            </span>
            <p class="text-sm font-semibold text-gray-900">{{ formatDzd(order.total) }}</p>
          </div>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
