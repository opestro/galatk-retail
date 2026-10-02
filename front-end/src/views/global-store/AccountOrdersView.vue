<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCustomerAuthStore } from '@/stores/customerAuth'
import { getMyCredit, hasUnpaidCredit, listMyOrders, listMySales } from '@/services/customerAccount'
import { orderStatusLabel } from '@/services/orders'
import { formatDzd } from '@/utils/formatMoney'
import type { CustomerCredit, CustomerInStorePurchase, CustomerOrder } from '@/types/api'
import { Package, Store, Wallet } from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const customerAuth = useCustomerAuthStore()
const orders = ref<CustomerOrder[]>([])
const sales = ref<CustomerInStorePurchase[]>([])
const credit = ref<CustomerCredit | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const [orderRows, saleRows, creditData] = await Promise.all([
      listMyOrders(),
      listMySales(),
      getMyCredit(),
    ])
    orders.value = orderRows
    sales.value = saleRows
    credit.value = creditData
  } catch {
    error.value = t('shop.account.ordersLoadError')
  } finally {
    loading.value = false
  }
})

type HistoryEntry =
  | { kind: 'ORDER'; id: string; createdAt: string; to: string; order: CustomerOrder }
  | { kind: 'SALE'; id: string; createdAt: string; to: string; sale: CustomerInStorePurchase }

const history = computed<HistoryEntry[]>(() => {
  const orderEntries: HistoryEntry[] = orders.value.map((order) => ({
    kind: 'ORDER',
    id: order.id,
    createdAt: order.createdAt,
    to: `/store/account/orders/${order.id}`,
    order,
  }))
  const saleEntries: HistoryEntry[] = sales.value.map((sale) => ({
    kind: 'SALE',
    id: sale.id,
    createdAt: sale.createdAt,
    to: `/store/account/purchases/${sale.id}`,
    sale,
  }))
  return [...orderEntries, ...saleEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
})

const outstanding = computed(() => Number(credit.value?.totalOutstanding ?? 0))

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
        <h1 class="text-2xl font-semibold text-gray-900">{{ $t('shop.account.myOrders') }}</h1>
        <p v-if="customerAuth.customer" class="mt-1 text-sm text-gray-600">
          {{ customerAuth.customer.name }} · {{ customerAuth.customer.phone }}
        </p>
      </div>
      <button type="button" class="btn-secondary" @click="customerAuth.logout(); void router.push('/store')">
        {{ $t('shop.account.signOut') }}
      </button>
    </div>

    <div v-if="loading" class="flex flex-col gap-3">
      <div class="skeleton h-28 rounded-xl" />
      <div v-for="n in 3" :key="n" class="skeleton h-24 rounded-xl" />
    </div>

    <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>

    <template v-else>
      <!-- Summary only — each order/sale appears once in the history list below. -->
      <section
        class="rounded-xl border px-4 py-4"
        :class="outstanding > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'"
      >
        <div class="flex items-start gap-3">
          <Wallet class="mt-0.5 h-5 w-5 shrink-0" :class="outstanding > 0 ? 'text-amber-700' : 'text-gray-400'" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900">{{ $t('shop.account.unpaidCredit') }}</p>
            <p class="mt-0.5 text-xs text-gray-600">{{ $t('shop.account.unpaidCreditHint') }}</p>
            <p class="mt-2 text-2xl font-semibold text-gray-900">{{ formatDzd(credit?.totalOutstanding ?? '0') }}</p>
            <ul v-if="credit && credit.shops.length > 0" class="mt-2 flex flex-col gap-1 text-sm text-gray-700">
              <li v-for="shop in credit.shops" :key="shop.shopId">
                {{ $t('shop.account.shopBalance', { shop: shop.shopName, amount: formatDzd(shop.balance) }) }}
              </li>
            </ul>
            <p v-else class="mt-2 text-sm text-gray-500">{{ $t('shop.account.noUnpaidCredit') }}</p>
          </div>
        </div>
      </section>

      <div
        v-if="history.length === 0"
        class="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white py-16 text-center"
      >
        <Package class="h-10 w-10 text-gray-300" />
        <p class="text-gray-500">{{ $t('shop.account.historyEmpty') }}</p>
        <RouterLink to="/store" class="btn-primary mt-2">{{ $t('shop.account.browseProducts') }}</RouterLink>
      </div>

      <ul v-else class="flex flex-col gap-3">
        <li v-for="entry in history" :key="`${entry.kind}-${entry.id}`">
          <RouterLink
            :to="entry.to"
            class="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white px-4 py-4 hover:border-gray-300 sm:flex-row sm:items-center sm:justify-between"
          >
            <template v-if="entry.kind === 'ORDER'">
              <div class="min-w-0">
                <p class="font-medium text-gray-900">{{ entry.order.orderNumber }}</p>
                <p class="text-sm text-gray-500">
                  {{ entry.order.shop.name }} · {{ new Date(entry.createdAt).toLocaleDateString() }}
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="statusClass(entry.order.status)">
                  {{ orderStatusLabel(entry.order.status) }}
                </span>
                <span
                  v-if="hasUnpaidCredit(entry.order.remainingCredit)"
                  class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
                >
                  {{ $t('shop.account.remaining') }} {{ formatDzd(entry.order.remainingCredit!) }}
                </span>
                <p class="text-sm font-semibold text-gray-900">{{ formatDzd(entry.order.total) }}</p>
              </div>
            </template>
            <template v-else>
              <div class="min-w-0">
                <p class="flex items-center gap-2 font-medium text-gray-900">
                  <Store class="h-4 w-4 text-gray-400" />
                  {{ $t('shop.account.inStorePurchase') }}
                </p>
                <p class="text-sm text-gray-500">
                  {{ entry.sale.shop.name }} · {{ new Date(entry.createdAt).toLocaleDateString() }}
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2.5 py-1 text-xs font-medium" :class="statusClass(entry.sale.status)">
                  {{ $t(`common.saleStatus.${entry.sale.status}`) }}
                </span>
                <span
                  v-if="hasUnpaidCredit(entry.sale.remainingCredit)"
                  class="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
                >
                  {{ $t('shop.account.remaining') }} {{ formatDzd(entry.sale.remainingCredit) }}
                </span>
                <p class="text-sm font-semibold text-gray-900">{{ formatDzd(entry.sale.total) }}</p>
              </div>
            </template>
          </RouterLink>
        </li>
      </ul>
    </template>
  </div>
</template>
