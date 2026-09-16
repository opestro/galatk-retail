<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { OnlineOrder, Shop } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'
import OrderCompleteModal from '@/components/pos/OrderCompleteModal.vue'
import {
  cancelShopOrder,
  getShopOrder,
  orderStatusLabel,
  selectableOrderStatuses,
  updateShopOrderStatus,
} from '@/services/orders'
import { apiErrorMessage, mediaUrl } from '@/services/products'
import { api } from '@/services/api'
import { formatDzd } from '@/utils/formatMoney'
import { saveOrderReceiptPdf } from '@/utils/orderReceiptPdf'

const route = useRoute()
const auth = useAuthStore()
const order = ref<OnlineOrder | null>(null)
const shop = ref<Shop | null>(null)
const loading = ref(true)
const error = ref('')
const actionError = ref('')
const savingStatus = ref(false)
const completing = ref(false)
const draftStatus = ref('')

const orderId = computed(() => String(route.params.orderId))

const statusChoices = computed(() => {
  if (!order.value) return []
  const current = order.value.status
  const unique = new Set([current, ...selectableOrderStatuses(current)])
  return [...unique]
})

const canSaveStatus = computed(() => {
  if (!order.value) return false
  return draftStatus.value !== order.value.status && !savingStatus.value
})

const terminal = computed(() =>
  order.value ? ['COMPLETED', 'CANCELLED'].includes(order.value.status) : true,
)

function attributeEntries(attrs: Record<string, string> | undefined) {
  return Object.entries(attrs ?? {}).filter(([, value]) => value?.trim())
}

async function load() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    const [loaded, shopRes] = await Promise.all([
      getShopOrder(shopId, orderId.value),
      api.get<{ data: Shop }>(`/shops/${shopId}`).catch(() => null),
    ])
    order.value = loaded
    draftStatus.value = loaded.status
    shop.value = shopRes?.data.data ?? null
  } catch {
    error.value = 'Order not found.'
    order.value = null
  } finally {
    loading.value = false
  }
}

async function saveStatus() {
  const shopId = auth.selectedShopId
  if (!shopId || !order.value) return

  const next = draftStatus.value
  actionError.value = ''

  if (next === 'COMPLETED') {
    completing.value = true
    draftStatus.value = order.value.status
    return
  }

  if (next === 'CANCELLED') {
    if (!auth.isManager) {
      actionError.value = 'Only a manager can cancel an order.'
      draftStatus.value = order.value.status
      return
    }
    if (!window.confirm('Cancel this order and restore stock?')) {
      draftStatus.value = order.value.status
      return
    }
  }

  savingStatus.value = true
  try {
    if (next === 'CANCELLED') {
      order.value = await cancelShopOrder(shopId, order.value.id, 'Staff cancelled')
    } else {
      order.value = await updateShopOrderStatus(shopId, order.value.id, next)
    }
    draftStatus.value = order.value.status
  } catch (err) {
    actionError.value = apiErrorMessage(err, 'Could not update order status.')
    draftStatus.value = order.value.status
  } finally {
    savingStatus.value = false
  }
}

function downloadReceipt() {
  if (!order.value) return
  try {
    saveOrderReceiptPdf(order.value, shop.value)
  } catch (err) {
    actionError.value = err instanceof Error ? err.message : 'Could not open the receipt.'
  }
}

onMounted(load)
watch(() => [auth.selectedShopId, orderId.value], load)
</script>

<template>
  <div class="page-shell">
    <PageHeader title="Order details">
      <template #actions>
        <button type="button" class="btn-secondary text-sm" :disabled="!order" @click="downloadReceipt">
          Save receipt as PDF
        </button>
        <RouterLink to="/admin/orders" class="btn-secondary text-sm">Back to orders</RouterLink>
      </template>
    </PageHeader>

    <SkeletonForm v-if="loading" :fields="6" />
    <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>

    <div v-else-if="order" class="flex flex-col gap-5">
      <section class="card flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">{{ order.orderNumber }}</h2>
            <p class="text-xs text-gray-500">{{ new Date(order.createdAt).toLocaleString() }}</p>
            <p class="mt-1 text-xs text-gray-500">
              {{ order.fulfillmentType === 'PICKUP' ? 'Pickup' : 'Delivery' }}
              <span v-if="order.paymentMethod"> · {{ order.paymentMethod.replace(/_/g, ' ') }}</span>
            </p>
          </div>
          <span class="rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700">
            {{ orderStatusLabel(order.status) }}
          </span>
        </div>

        <div v-if="!terminal" class="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label class="flex flex-1 flex-col gap-1.5 text-sm text-gray-700">
            Change status
            <select v-model="draftStatus" class="input">
              <option v-for="status in statusChoices" :key="status" :value="status">
                {{ orderStatusLabel(status) }}{{ status === 'COMPLETED' ? ' (collect payment)' : '' }}
              </option>
            </select>
          </label>
          <button
            type="button"
            class="btn-primary"
            :disabled="!canSaveStatus"
            @click="saveStatus"
          >
            {{ savingStatus ? 'Saving…' : 'Save status' }}
          </button>
        </div>
        <p v-if="actionError" class="text-sm text-red-600">{{ actionError }}</p>
      </section>

      <section class="card flex flex-col gap-2">
        <h3 class="text-sm font-semibold text-gray-900">Customer</h3>
        <p class="text-sm text-gray-800"><span class="text-gray-500">Full name:</span> {{ order.customerName }}</p>
        <p class="text-sm text-gray-800"><span class="text-gray-500">Phone:</span> {{ order.customerPhone }}</p>
        <p v-if="order.customerEmail" class="text-sm text-gray-800">
          <span class="text-gray-500">Email:</span> {{ order.customerEmail }}
        </p>
        <p class="text-sm text-gray-800">
          <span class="text-gray-500">Wilaya:</span> {{ order.customerWilaya || order.deliveryCity || '—' }}
        </p>
        <p v-if="order.deliveryAddress" class="text-sm text-gray-800">
          <span class="text-gray-500">Address:</span> {{ order.deliveryAddress }}
        </p>
      </section>

      <section class="overflow-hidden rounded-lg border border-gray-200">
        <h3 class="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900">
          Products
        </h3>
        <ul class="divide-y divide-gray-100">
          <li
            v-for="line in order.lines"
            :key="line.id"
            class="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
          >
            <div class="flex min-w-0 gap-3">
              <div class="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
                <img
                  v-if="line.imageUrl"
                  :src="mediaUrl(line.imageUrl)"
                  :alt="line.productName"
                  class="h-full w-full object-cover"
                />
              </div>
              <div class="min-w-0">
                <p class="font-medium text-gray-900">
                  <RouterLink
                    v-if="line.familyId"
                    :to="`/admin/products/${line.familyId}`"
                    class="hover:underline"
                  >
                    {{ line.productName }}
                  </RouterLink>
                  <span v-else>{{ line.productName }}</span>
                </p>
                <p v-if="line.variantLabel" class="text-sm text-gray-600">{{ line.variantLabel }}</p>
                <p v-if="line.sku" class="text-xs text-gray-500">SKU {{ line.sku }}</p>
                <p v-if="attributeEntries(line.attributes).length" class="mt-1 flex flex-wrap gap-1">
                  <span
                    v-for="[key, value] in attributeEntries(line.attributes)"
                    :key="key"
                    class="rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-600"
                  >
                    {{ key }}: {{ value }}
                  </span>
                </p>
                <p class="mt-1 text-xs text-gray-500">Qty {{ line.quantity }} · {{ formatDzd(line.unitPrice) }} each</p>
              </div>
            </div>
            <p class="text-sm font-medium text-gray-900">{{ formatDzd(line.lineTotal) }}</p>
          </li>
        </ul>
        <div class="flex flex-col gap-1 border-t border-gray-200 px-4 py-3 text-sm text-gray-700">
          <div v-if="order.subtotal" class="flex justify-between">
            <span>Subtotal</span>
            <span>{{ formatDzd(order.subtotal) }}</span>
          </div>
          <div v-if="order.deliveryFee && Number(order.deliveryFee) > 0" class="flex justify-between">
            <span>Delivery</span>
            <span>{{ formatDzd(order.deliveryFee) }}</span>
          </div>
          <div class="flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>{{ formatDzd(order.total) }}</span>
          </div>
        </div>
      </section>
    </div>

    <OrderCompleteModal
      v-if="completing && order"
      :order="order"
      @close="completing = false"
      @completed="completing = false; load()"
    />
  </div>
</template>
