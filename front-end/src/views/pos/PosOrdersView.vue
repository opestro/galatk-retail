<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { OnlineOrder } from '@/types/api'
import OrderCompleteModal from '@/components/pos/OrderCompleteModal.vue'
import ClientPurchasesModal from '@/components/pos/ClientPurchasesModal.vue'
import PosRowMenu from '@/components/pos/PosRowMenu.vue'
import PosStatusBadge from '@/components/pos/PosStatusBadge.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { CheckCircle2, Inbox, PackageCheck, Search, ShoppingBag, Store, Truck } from 'lucide-vue-next'
import { orderStatusLabel } from '@/services/orders'
import { formatCount, formatDateTime, formatMoney } from '@/utils/formatMoney'

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

async function loadOrders() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  // Skeleton only on first load; later refreshes update the table in place.
  loading.value = !orders.value.length
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

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

async function markReady(order: OnlineOrder) {
  const shopId = auth.selectedShopId
  if (!shopId) return
  const status = order.fulfillmentType === 'PICKUP' ? 'READY_FOR_PICKUP' : 'OUT_FOR_DELIVERY'
  await api.patch(`/shops/${shopId}/orders/${order.id}/status`, { status })
  await loadOrders()
}

function openPurchases(order: OnlineOrder) {
  if (!order.client) return
  purchasesClientId.value = order.client.id
  purchasesClientName.value = order.client.name
}

/** Payment summary chip; amounts are formatted in the active script. */
function paymentLabel(order: OnlineOrder): string {
  return t(`common.paymentStatus.${order.paymentStatus ?? 'UNPAID'}`, {
    paid: formatMoney(order.collected ?? order.amountPaid ?? '0'),
    remaining: formatMoney(order.remainingCredit ?? order.total),
  })
}

onMounted(loadOrders)
watch(() => auth.selectedShopId, loadOrders)
</script>

<template>
  <div class="pos-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="pos-page-title">{{ $t('pos.orders.title') }}</h1>
        <p class="pos-page-sub pos-num">{{ $t('pos.orders.subtitle', { n: formatCount(pendingCount) }) }}</p>
      </div>
      <div class="flex w-full flex-wrap items-center gap-3 sm:w-auto">
        <div class="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
          <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pos-faint" aria-hidden="true" />
          <input
            v-model="search"
            type="search"
            :placeholder="$t('pos.orders.searchPlaceholder')"
            :aria-label="$t('pos.orders.searchPlaceholder')"
            class="pos-input pos-input-icon h-10"
          />
        </div>
        <div class="pos-segmented bg-black/[0.045]" role="group" :aria-label="$t('pos.table.status')">
          <button type="button" class="pos-segment" :aria-pressed="filter === 'active'" @click="filter = 'active'">
            {{ $t('pos.orders.filterActive') }}
            <span class="pos-num text-pos-muted">{{ formatCount(pendingCount) }}</span>
          </button>
          <button type="button" class="pos-segment" :aria-pressed="filter === 'all'" @click="filter = 'all'">{{ $t('pos.orders.filterAll') }}</button>
        </div>
      </div>
    </div>

    <div class="pos-surface overflow-hidden">
      <div v-if="loading" class="flex flex-col gap-3 p-5" role="status">
        <span class="sr-only">{{ $t('common.loading') }}</span>
        <div v-for="i in 5" :key="i" class="flex items-center gap-6">
          <div class="pos-skeleton h-4 w-24" />
          <div class="pos-skeleton h-4 w-24" />
          <div class="pos-skeleton h-4 flex-1" />
          <div class="pos-skeleton h-4 w-24" />
          <div class="pos-skeleton h-8 w-28 rounded-xl" />
        </div>
      </div>

      <div v-else-if="displayed.length" class="overflow-x-auto">
        <table class="pos-table min-w-[900px]">
          <thead>
            <tr>
              <th scope="col">{{ $t('pos.table.date') }}</th>
              <th scope="col">{{ $t('pos.table.reference') }}</th>
              <th scope="col">{{ $t('pos.table.client') }}</th>
              <th scope="col" class="pos-cell-num">{{ $t('pos.table.amount') }}</th>
              <th scope="col">{{ $t('pos.table.status') }}</th>
              <th scope="col">{{ $t('pos.table.payment') }}</th>
              <th scope="col" class="pos-cell-actions"><span class="sr-only">{{ $t('pos.table.actions') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in displayed" :key="order.id">
              <td class="whitespace-nowrap">
                <span class="block text-pos-ink pos-num">{{ formatDateTime(order.createdAt).date }}</span>
                <span class="block text-[12px] text-pos-muted pos-num">{{ formatDateTime(order.createdAt).time }}</span>
              </td>
              <td class="whitespace-nowrap">
                <span class="block font-medium text-pos-ink" dir="ltr" style="font-family: var(--font-pos-mono); font-size: 12.5px">{{ order.orderNumber }}</span>
                <span class="mt-0.5 inline-flex items-center gap-1 text-[12px] text-pos-muted">
                  <Store v-if="order.fulfillmentType === 'PICKUP'" class="h-3.5 w-3.5" />
                  <Truck v-else class="h-3.5 w-3.5" />
                  {{ $t(`common.fulfillment.${order.fulfillmentType}`) }}
                  <template v-if="order.lines?.length"> · {{ $t('pos.orders.items', { n: formatCount(order.lines.length) }, order.lines.length) }}</template>
                </span>
              </td>
              <td class="whitespace-nowrap">
                <span class="block text-pos-ink">{{ order.customerName }}</span>
                <span class="block text-[12px] text-pos-muted"><bdi>{{ order.customerPhone }}</bdi></span>
                <span v-if="order.client && Number(order.client.balance) > 0" class="mt-0.5 block text-[12px] text-pos-warn pos-num">
                  {{ $t('pos.orders.owes', { amount: formatMoney(order.client.balance) }) }}
                </span>
              </td>
              <td class="pos-cell-num font-semibold text-pos-ink">{{ formatMoney(order.total) }}</td>
              <td><PosStatusBadge :status="order.status" :label="orderStatusLabel(order.status)" /></td>
              <td>
                <PosStatusBadge
                  v-if="order.paymentStatus !== 'NONE'"
                  :status="order.paymentStatus ?? 'UNPAID'"
                  :label="paymentLabel(order)"
                />
              </td>
              <td class="pos-cell-actions">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    v-if="order.status === 'PLACED'"
                    type="button"
                    class="pos-btn-soft pos-btn-sm"
                    @click="markReady(order)"
                  >
                    <PackageCheck class="h-4 w-4" />
                    {{ $t('pos.orders.markReady') }}
                  </button>
                  <button
                    v-if="activeStatuses.includes(order.status)"
                    type="button"
                    class="pos-btn-primary pos-btn-sm"
                    @click="completingOrder = order"
                  >
                    <CheckCircle2 class="h-4 w-4" />
                    {{ $t('pos.orders.complete') }}
                  </button>
                  <PosRowMenu v-if="order.client" :label="$t('pos.table.moreActions')">
                    <button type="button" role="menuitem" class="pos-menu-item" @click="openPurchases(order)">
                      <ShoppingBag class="h-4 w-4 text-pos-muted" />
                      {{ $t('pos.orders.viewPurchases') }}
                    </button>
                  </PosRowMenu>
                  <span v-else class="inline-block w-9" aria-hidden="true" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PosEmptyState v-else :icon="Inbox" :title="$t('pos.orders.empty')" :body="$t('pos.orders.emptyBody')" />
    </div>

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
