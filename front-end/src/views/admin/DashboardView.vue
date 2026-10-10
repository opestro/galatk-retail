<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  AlertTriangle,
  ArrowDownToLine,
  Banknote,
  CircleDollarSign,
  HandCoins,
  PackageCheck,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Wallet,
  Boxes,
  Scale,
} from 'lucide-vue-next'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { getFinancialSummary } from '@/services/clientApi'
import type { DashboardSummary, FinancialSummary } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import AdminStat from '@/components/admin/AdminStat.vue'
import AdminDateRange from '@/components/admin/AdminDateRange.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { formatAmount, formatCount } from '@/utils/formatMoney'
import { numberLocale } from '@/i18n/translate'

const { t } = useI18n()
const auth = useAuthStore()
const summary = ref<DashboardSummary | null>(null)
const financial = ref<FinancialSummary | null>(null)
const loading = ref(true)
const financialLoading = ref(false)
const dateRange = ref({ from: '', to: '' })

const currency = computed(() => t('common.currency'))

const today = computed(() =>
  new Date().toLocaleDateString(numberLocale() === 'ar-DZ' ? 'ar-DZ-u-nu-arab' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }),
)

const marginHint = computed(() => {
  if (!financial.value) return ''
  const revenue = Number(financial.value.grossRevenue)
  if (!revenue) return ''
  const margin = (Number(financial.value.grossProfit) / revenue) * 100
  return t('admin.dashboard.marginHint', { n: formatCount(Math.round(margin)) })
})

const outOfStock = computed(() => summary.value?.lowStock.filter((item) => item.quantity <= 0).length ?? 0)

async function loadFinancial() {
  const shopId = auth.selectedShopId
  if (!shopId) return
  financialLoading.value = true
  try {
    const { data } = await getFinancialSummary(shopId, dateRange.value.from || undefined, dateRange.value.to || undefined)
    financial.value = data.data
  } finally {
    financialLoading.value = false
  }
}

async function load() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const [summaryRes] = await Promise.all([
      api.get<{ data: DashboardSummary }>(`/shops/${shopId}/dashboard/summary`),
      loadFinancial(),
    ])
    summary.value = summaryRes.data.data
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => auth.selectedShopId, load)
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="t('admin.dashboard.title')" :subtitle="today" />

    <!-- Today -->
    <section class="flex flex-col gap-3" :aria-label="t('admin.dashboard.todaySection')">
      <h2 class="pos-section-label">{{ t('admin.dashboard.todaySection') }}</h2>
      <div v-if="loading" class="grid gap-4 sm:grid-cols-3">
        <div v-for="i in 3" :key="i" class="pos-skeleton h-[92px] rounded-2xl" />
      </div>
      <div v-else-if="summary" class="grid gap-4 sm:grid-cols-3">
        <AdminStat :icon="ShoppingBag" :label="t('admin.dashboard.todaySales')" :value="formatCount(summary.todaySalesCount)" />
        <AdminStat :icon="CircleDollarSign" :label="t('admin.dashboard.todayRevenue')" :value="formatAmount(summary.todayRevenue)" :unit="currency" />
        <AdminStat
          :icon="AlertTriangle"
          :tone="summary.lowStock.length ? 'warn' : 'neutral'"
          :label="t('admin.dashboard.lowStockItems')"
          :value="formatCount(summary.lowStock.length)"
          :hint="outOfStock ? t('admin.dashboard.outOfStockHint', { n: formatCount(outOfStock) }) : ''"
        />
      </div>
    </section>

    <!-- Period performance -->
    <section class="flex flex-col gap-3">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <h2 class="pos-section-label">{{ t('admin.dashboard.financialSummary') }}</h2>
        <AdminDateRange v-model="dateRange" @change="loadFinancial" />
      </div>

      <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="i in 8" :key="i" class="pos-skeleton h-[92px] rounded-2xl" />
      </div>

      <div v-else-if="financial" class="flex flex-col gap-4 transition-opacity duration-200" :class="financialLoading ? 'opacity-60' : ''" :aria-busy="financialLoading">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStat :icon="TrendingUp" :label="t('admin.dashboard.grossRevenue')" :value="formatAmount(financial.grossRevenue)" :unit="currency" />
          <AdminStat :icon="Boxes" :label="t('admin.dashboard.costOfGoods')" :value="formatAmount(financial.costOfGoodsSold)" :unit="currency" />
          <AdminStat
            :icon="Scale"
            tone="ok"
            :label="t('admin.dashboard.grossProfit')"
            :value="formatAmount(financial.grossProfit)"
            :unit="currency"
            :hint="marginHint"
          />
          <AdminStat
            :icon="HandCoins"
            :tone="Number(financial.outstandingCredit) > 0 ? 'warn' : 'neutral'"
            :label="t('admin.dashboard.outstandingCredit')"
            :value="formatAmount(financial.outstandingCredit)"
            :unit="currency"
          />
        </div>

        <h2 class="pos-section-label mt-2">{{ t('admin.dashboard.cashFlow') }}</h2>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AdminStat :icon="Banknote" :label="t('admin.dashboard.posCollected')" :value="formatAmount(financial.posCollected)" :unit="currency" />
          <AdminStat :icon="Wallet" :label="t('admin.dashboard.clientPayments')" :value="formatAmount(financial.clientPaymentsReceived)" :unit="currency" />
          <AdminStat :icon="PackageCheck" :label="t('admin.dashboard.totalCashIn')" :value="formatAmount(financial.totalCashIn)" :unit="currency" />
          <AdminStat :icon="Receipt" :label="t('admin.dashboard.totalCharges')" :value="formatAmount(financial.totalCharges)" :unit="currency" />
        </div>
      </div>
    </section>

    <!-- Low stock -->
    <section class="flex flex-col gap-3">
      <div class="flex items-end justify-between gap-3">
        <h2 class="pos-section-label">{{ t('admin.dashboard.lowStockAlerts') }}</h2>
        <RouterLink v-if="summary?.lowStock.length" to="/admin/inbound" class="pos-btn-soft pos-btn-sm">
          <ArrowDownToLine class="h-4 w-4" />
          {{ t('admin.dashboard.receiveStock') }}
        </RouterLink>
      </div>
      <div class="pos-surface overflow-hidden">
        <div v-if="loading" class="flex flex-col gap-3 p-5" role="status">
          <span class="sr-only">{{ t('common.loading') }}</span>
          <div v-for="i in 3" :key="i" class="pos-skeleton h-5" />
        </div>
        <table v-else-if="summary?.lowStock.length" class="pos-table">
          <thead>
            <tr>
              <th scope="col">{{ t('admin.stock.colProduct') }}</th>
              <th scope="col" class="pos-cell-num">{{ t('admin.stock.colQuantity') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in summary.lowStock" :key="item.productId">
              <td class="font-medium text-pos-ink">{{ item.productName }}</td>
              <td class="pos-cell-num">
                <span :class="item.quantity <= 0 ? 'pos-badge-err' : 'pos-badge-warn'">
                  {{ item.quantity <= 0 ? t('admin.stock.out') : t('admin.dashboard.quantityLeft', { n: formatCount(item.quantity) }) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <PosEmptyState v-else :icon="PackageCheck" :title="t('admin.dashboard.stockHealthy')" compact />
      </div>
    </section>
  </div>
</template>
