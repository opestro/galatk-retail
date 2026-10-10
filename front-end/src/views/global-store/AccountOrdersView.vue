<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCustomerAuthStore } from '@/stores/customerAuth'
import { getMyCredit, hasUnpaidCredit, listMyOrders, listMySales } from '@/services/customerAccount'
import { orderStatusLabel } from '@/services/orders'
import { formatDzd } from '@/utils/formatMoney'
import type { CustomerCredit, CustomerInStorePurchase, CustomerOrder } from '@/types/api'
import { ChevronRight, Package, RefreshCw, Store, Wallet } from 'lucide-vue-next'
import StoreEmptyState from '@/components/storefront/StoreEmptyState.vue'

const { t } = useI18n()
const router = useRouter()
const customerAuth = useCustomerAuthStore()
const orders = ref<CustomerOrder[]>([])
const sales = ref<CustomerInStorePurchase[]>([])
const credit = ref<CustomerCredit | null>(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
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
}

onMounted(load)

function signInAgain() {
  customerAuth.logout()
  void router.push({ path: '/login', query: { next: '/store/account' } })
}

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
  if (status === 'COMPLETED') return 'border-ok/30 text-ok'
  if (status === 'CANCELLED') return 'border-alert/30 text-alert'
  return 'border-line text-ink-soft'
}

const firstName = computed(() => customerAuth.customer?.name.trim().split(/\s+/)[0] ?? '')
</script>

<template>
  <div class="sf-container pb-24 pt-8 md:pt-12">
    <div class="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8 md:pb-10">
      <div>
        <p class="sf-eyebrow">{{ $t('shop.account.eyebrow') }}</p>
        <h1 class="sf-display mt-4 text-5xl md:text-7xl rtl:text-4xl rtl:md:text-6xl">
          {{ firstName ? $t('shop.account.hello', { name: firstName }) : $t('shop.account.myOrders') }}
        </h1>
        <p v-if="customerAuth.customer" class="mt-3 text-sm text-mute">
          {{ customerAuth.customer.email || customerAuth.customer.name }} · <span dir="ltr">{{ customerAuth.customer.phone }}</span>
        </p>
      </div>
      <button type="button" class="sf-btn-outline" @click="customerAuth.logout(); void router.push('/store')">
        {{ $t('shop.account.signOut') }}
      </button>
    </div>

    <div v-if="loading" class="mt-10 flex flex-col gap-3" role="status">
      <span class="sr-only">{{ $t('common.loading') }}</span>
      <div class="sf-skeleton h-32" />
      <div v-for="n in 3" :key="n" class="sf-skeleton h-20" />
    </div>

    <StoreEmptyState v-else-if="error" :icon="RefreshCw" :title="$t('shop.product.loadErrorTitle')" :body="error">
      <button type="button" class="sf-btn" @click="load">{{ $t('shop.catalog.retry') }}</button>
      <button type="button" class="sf-btn-outline" @click="signInAgain">{{ $t('shop.account.signInAgain') }}</button>
    </StoreEmptyState>

    <div v-else class="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
      <!-- Summary only — each order/sale appears once in the history list. -->
      <section class="lg:order-2 lg:col-span-4">
        <div class="p-6 md:p-7" :class="outstanding > 0 ? 'border border-clay/30 bg-blush/60' : 'sf-panel'">
          <div class="flex items-center gap-2">
            <Wallet class="h-4 w-4 text-taupe" stroke-width="1.25" />
            <h2 class="sf-eyebrow">{{ $t('shop.account.unpaidCredit') }}</h2>
          </div>
          <p class="sf-figure mt-4 text-3xl text-ink">{{ formatDzd(credit?.totalOutstanding ?? '0') }}</p>
          <p class="mt-3 text-xs leading-relaxed text-mute">{{ $t('shop.account.unpaidCreditHint') }}</p>
          <ul v-if="credit && credit.shops.length > 0" class="mt-5 flex flex-col gap-2 border-t border-line pt-5 text-sm text-ink-soft">
            <li v-for="shop in credit.shops" :key="shop.shopId">
              {{ $t('shop.account.shopBalance', { shop: shop.shopName, amount: formatDzd(shop.balance) }) }}
            </li>
          </ul>
          <p v-else class="mt-5 border-t border-line pt-5 text-sm text-mute">{{ $t('shop.account.noUnpaidCredit') }}</p>
        </div>
      </section>

      <section class="lg:order-1 lg:col-span-8">
        <h2 class="sf-title text-2xl">{{ $t('shop.account.history') }}</h2>

        <StoreEmptyState v-if="history.length === 0" :icon="Package" :title="$t('shop.account.historyEmpty')">
          <RouterLink :to="{ name: 'global-store-shop' }" class="sf-btn">{{ $t('shop.account.browseProducts') }}</RouterLink>
        </StoreEmptyState>

        <ul v-else class="mt-6 border-t border-line">
          <li v-for="entry in history" :key="`${entry.kind}-${entry.id}`" class="border-b border-line">
            <RouterLink
              :to="entry.to"
              class="group flex flex-col gap-3 py-5 transition-colors hover:bg-cream/60 sm:flex-row sm:items-center sm:justify-between sm:px-3"
            >
              <template v-if="entry.kind === 'ORDER'">
                <div class="min-w-0">
                  <p class="font-medium text-ink tabular-nums">{{ entry.order.orderNumber }}</p>
                  <p class="mt-0.5 text-sm text-mute">
                    {{ entry.order.shop.name }} · {{ new Date(entry.createdAt).toLocaleDateString() }}
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <span class="border px-2.5 py-1 text-xs" :class="statusClass(entry.order.status)">
                    {{ orderStatusLabel(entry.order.status) }}
                  </span>
                  <span
                    v-if="hasUnpaidCredit(entry.order.remainingCredit)"
                    class="border border-clay/30 bg-blush/60 px-2.5 py-1 text-xs text-clay"
                  >
                    {{ $t('shop.account.remaining') }} {{ formatDzd(entry.order.remainingCredit!) }}
                  </span>
                  <p class="text-sm font-medium text-ink tabular-nums">{{ formatDzd(entry.order.total) }}</p>
                  <ChevronRight class="hidden h-4 w-4 text-mute transition-transform group-hover:translate-x-0.5 sm:block rtl:-scale-x-100" />
                </div>
              </template>
              <template v-else>
                <div class="min-w-0">
                  <p class="flex items-center gap-2 font-medium text-ink">
                    <Store class="h-4 w-4 text-taupe" stroke-width="1.25" />
                    {{ $t('shop.account.inStorePurchase') }}
                  </p>
                  <p class="mt-0.5 text-sm text-mute">
                    {{ entry.sale.shop.name }} · {{ new Date(entry.createdAt).toLocaleDateString() }}
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <span class="border px-2.5 py-1 text-xs" :class="statusClass(entry.sale.status)">
                    {{ $t(`common.saleStatus.${entry.sale.status}`) }}
                  </span>
                  <span
                    v-if="hasUnpaidCredit(entry.sale.remainingCredit)"
                    class="border border-clay/30 bg-blush/60 px-2.5 py-1 text-xs text-clay"
                  >
                    {{ $t('shop.account.remaining') }} {{ formatDzd(entry.sale.remainingCredit) }}
                  </span>
                  <p class="text-sm font-medium text-ink tabular-nums">{{ formatDzd(entry.sale.total) }}</p>
                  <ChevronRight class="hidden h-4 w-4 text-mute transition-transform group-hover:translate-x-0.5 sm:block rtl:-scale-x-100" />
                </div>
              </template>
            </RouterLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
