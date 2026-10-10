<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import type { OnlineOrder } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import PosStatusBadge from '@/components/pos/PosStatusBadge.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { listShopOrders, orderStatusLabel } from '@/services/orders'
import { ALGERIA_WILAYAS } from '@/data/algeriaWilayas'
import { formatCount, formatDateTime, formatMoney } from '@/utils/formatMoney'
import { ChevronRight, Inbox, Search, Store, Truck } from 'lucide-vue-next'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const orders = ref<OnlineOrder[]>([])
const loading = ref(true)
/** Background refresh after the first load (search / filters). */
const refreshing = ref(false)
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
  // Skeleton only on first load; filters refresh the table in place.
  loading.value = !orders.value.length
  refreshing.value = !loading.value
  try {
    orders.value = await listShopOrders(shopId, {
      q: search.value.trim() || undefined,
      status: statusFilter.value || undefined,
      wilaya: wilayaFilter.value || undefined,
    })
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function paymentLabel(order: OnlineOrder): string {
  return t(`common.paymentStatus.${order.paymentStatus ?? 'UNPAID'}`, {
    paid: formatMoney(order.collected ?? order.amountPaid ?? '0'),
    remaining: formatMoney(order.remainingCredit ?? order.total),
  })
}

const statuses = ['PLACED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED']

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
    <PageHeader
      :title="t('admin.orders.title')"
      :subtitle="loading ? '' : t('admin.orders.subtitle', { n: formatCount(orders.length) }, orders.length)"
    />

    <div class="flex flex-col gap-3 md:flex-row md:items-center">
      <div class="relative min-w-0 flex-1">
        <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pos-faint" aria-hidden="true" />
        <input
          v-model="search"
          type="search"
          :placeholder="t('admin.orders.searchPlaceholder')"
          :aria-label="t('admin.orders.searchPlaceholder')"
          class="pos-input pos-input-icon"
        />
      </div>
      <select v-model="statusFilter" class="pos-input md:w-52" :aria-label="t('admin.orders.colStatus')">
        <option value="">{{ t('admin.orders.allStatuses') }}</option>
        <option v-for="status in statuses" :key="status" :value="status">{{ t(`common.orderStatus.${status}`) }}</option>
      </select>
      <select v-model="wilayaFilter" class="pos-input md:w-52" :aria-label="t('admin.orders.colWilaya')">
        <option value="">{{ t('admin.orders.allWilayas') }}</option>
        <option v-for="wilaya in ALGERIA_WILAYAS" :key="wilaya" :value="wilaya">{{ wilaya }}</option>
      </select>
    </div>

    <div class="pos-surface overflow-hidden transition-opacity duration-200" :class="refreshing ? 'opacity-60' : ''" :aria-busy="loading || refreshing">
      <div v-if="loading" class="flex flex-col gap-4 p-5" role="status">
        <span class="sr-only">{{ t('common.loading') }}</span>
        <div v-for="i in 6" :key="i" class="flex items-center gap-6">
          <div class="pos-skeleton h-4 w-24" />
          <div class="pos-skeleton h-4 flex-1" />
          <div class="pos-skeleton h-4 w-24" />
          <div class="pos-skeleton h-6 w-24 rounded-full" />
        </div>
      </div>

      <div v-else-if="orders.length" class="overflow-x-auto">
        <table class="pos-table min-w-[900px]">
          <thead>
            <tr>
              <th scope="col">{{ t('admin.orders.colOrder') }}</th>
              <th scope="col">{{ t('pos.table.date') }}</th>
              <th scope="col">{{ t('admin.orders.colCustomer') }}</th>
              <th scope="col">{{ t('admin.orders.colWilaya') }}</th>
              <th scope="col" class="pos-cell-num">{{ t('admin.orders.colTotal') }}</th>
              <th scope="col">{{ t('admin.orders.colPayment') }}</th>
              <th scope="col">{{ t('admin.orders.colStatus') }}</th>
              <th scope="col" class="pos-cell-actions"><span class="sr-only">{{ t('common.actions') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id" class="pos-row-link" @click="openOrder(order.id)">
              <td class="whitespace-nowrap">
                <RouterLink
                  :to="`/admin/orders/${order.id}`"
                  class="font-medium text-pos-ink hover:underline"
                  dir="ltr"
                  style="font-family: var(--font-pos-mono); font-size: 12.5px"
                  @click.stop
                >
                  {{ order.orderNumber }}
                </RouterLink>
                <span class="mt-0.5 flex items-center gap-1 text-[12px] text-pos-muted">
                  <Store v-if="order.fulfillmentType === 'PICKUP'" class="h-3.5 w-3.5" />
                  <Truck v-else class="h-3.5 w-3.5" />
                  {{ t(`common.fulfillment.${order.fulfillmentType}`) }}
                </span>
              </td>
              <td class="whitespace-nowrap">
                <span class="block text-pos-ink pos-num">{{ formatDateTime(order.createdAt).date }}</span>
                <span class="block text-[12px] text-pos-muted pos-num">{{ formatDateTime(order.createdAt).time }}</span>
              </td>
              <td class="whitespace-nowrap">
                <span class="block text-pos-ink">{{ order.customerName }}</span>
                <span class="block text-[12px] text-pos-muted"><bdi>{{ order.customerPhone }}</bdi></span>
              </td>
              <td class="text-pos-ink-2">{{ order.customerWilaya || order.deliveryCity || t('common.emDash') }}</td>
              <td class="pos-cell-num font-semibold text-pos-ink">{{ formatMoney(order.total) }}</td>
              <td>
                <PosStatusBadge v-if="order.paymentStatus !== 'NONE'" :status="order.paymentStatus ?? 'UNPAID'" :label="paymentLabel(order)" />
              </td>
              <td><PosStatusBadge :status="order.status" :label="orderStatusLabel(order.status)" /></td>
              <td class="pos-cell-actions">
                <ChevronRight class="ms-auto h-4 w-4 text-pos-faint rtl:rotate-180" aria-hidden="true" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PosEmptyState v-else :icon="Inbox" :title="t('admin.orders.empty')" :body="search || statusFilter || wilayaFilter ? t('admin.orders.emptyFiltered') : ''" />
    </div>
  </div>
</template>
