<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Ban, Printer, Receipt, Banknote, CreditCard } from 'lucide-vue-next'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { Sale } from '@/types/api'
import VoidSaleDialog from '@/components/pos/VoidSaleDialog.vue'
import PosRowMenu from '@/components/pos/PosRowMenu.vue'
import PosStatusBadge from '@/components/pos/PosStatusBadge.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { printPosReceipt, saleToReceipt } from '@/utils/printPosReceipt'
import { formatCount, formatDateTime, formatMoney } from '@/utils/formatMoney'

const { t } = useI18n()
const auth = useAuthStore()
const sales = ref<Sale[]>([])
const loading = ref(true)
const voidTarget = ref<Sale | null>(null)
const printError = ref('')
const statusFilter = ref<'all' | 'COMPLETED' | 'CANCELLED'>('all')

const displayed = computed(() =>
  statusFilter.value === 'all' ? sales.value : sales.value.filter((sale) => sale.status === statusFilter.value),
)

const completedTotal = computed(() =>
  sales.value.filter((sale) => sale.status === 'COMPLETED').reduce((sum, sale) => sum + Number(sale.total), 0),
)

async function loadSales() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  // Skeleton only on first load; later refreshes update the table in place.
  loading.value = !sales.value.length
  try {
    const { data } = await api.get<{ data: Sale[] }>(`/shops/${shopId}/pos/sales`)
    sales.value = data.data
  } finally {
    loading.value = false
  }
}

/**
 * Mirrors the backend void rule (shared/pos/voidRules.ts): managers may void
 * any completed sale; cashiers only their own sales from the same UTC day.
 */
function canVoid(sale: Sale): boolean {
  if (sale.status !== 'COMPLETED') return false
  if (auth.isManager) return true
  const created = new Date(sale.createdAt)
  const now = new Date()
  return (
    sale.cashier.id === auth.staff?.id &&
    created.getUTCFullYear() === now.getUTCFullYear() &&
    created.getUTCMonth() === now.getUTCMonth() &&
    created.getUTCDate() === now.getUTCDate()
  )
}

/** Short, human-readable sale reference derived from its id. */
function reference(sale: Sale): string {
  return `#${sale.id.slice(0, 8).toUpperCase()}`
}

function printSale(sale: Sale) {
  printError.value = ''
  try {
    printPosReceipt(saleToReceipt(sale, auth.staff?.name ?? t('common.staff')))
  } catch (err) {
    printError.value = err instanceof Error ? err.message : t('pos.receipt.printError')
  }
}

async function onVoided() {
  voidTarget.value = null
  await loadSales()
}

onMounted(loadSales)
watch(() => auth.selectedShopId, loadSales)
</script>

<template>
  <div class="pos-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="pos-page-title">{{ $t('pos.history.title') }}</h1>
        <p class="pos-page-sub pos-num">
          {{ $t('pos.history.subtitle', { n: formatCount(sales.length), total: formatMoney(completedTotal) }, sales.length) }}
        </p>
      </div>
      <div class="pos-segmented bg-black/[0.045]" role="group" :aria-label="$t('pos.table.status')">
        <button type="button" class="pos-segment" :aria-pressed="statusFilter === 'all'" @click="statusFilter = 'all'">{{ $t('pos.history.filterAll') }}</button>
        <button type="button" class="pos-segment" :aria-pressed="statusFilter === 'COMPLETED'" @click="statusFilter = 'COMPLETED'">{{ $t('common.saleStatus.COMPLETED') }}</button>
        <button type="button" class="pos-segment" :aria-pressed="statusFilter === 'CANCELLED'" @click="statusFilter = 'CANCELLED'">{{ $t('common.saleStatus.CANCELLED') }}</button>
      </div>
    </div>

    <p v-if="printError" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">{{ printError }}</p>

    <div class="pos-surface overflow-hidden">
      <div v-if="loading" class="flex flex-col gap-3 p-5" role="status">
        <span class="sr-only">{{ $t('common.loading') }}</span>
        <div v-for="i in 6" :key="i" class="flex items-center gap-6">
          <div class="pos-skeleton h-4 w-28" />
          <div class="pos-skeleton h-4 w-20" />
          <div class="pos-skeleton h-4 flex-1" />
          <div class="pos-skeleton h-4 w-24" />
          <div class="pos-skeleton h-6 w-24 rounded-full" />
        </div>
      </div>

      <div v-else-if="displayed.length" class="overflow-x-auto">
        <table class="pos-table min-w-[760px]">
          <thead>
            <tr>
              <th scope="col">{{ $t('pos.table.date') }}</th>
              <th scope="col">{{ $t('pos.table.reference') }}</th>
              <th scope="col">{{ $t('pos.table.client') }}</th>
              <th scope="col">{{ $t('pos.table.method') }}</th>
              <th scope="col" class="pos-cell-num">{{ $t('pos.table.amount') }}</th>
              <th scope="col">{{ $t('pos.table.status') }}</th>
              <th scope="col" class="pos-cell-actions"><span class="sr-only">{{ $t('pos.table.actions') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sale in displayed" :key="sale.id">
              <td class="whitespace-nowrap">
                <span class="block text-pos-ink pos-num">{{ formatDateTime(sale.createdAt).date }}</span>
                <span class="block text-[12px] text-pos-muted pos-num">{{ formatDateTime(sale.createdAt).time }}</span>
              </td>
              <td class="whitespace-nowrap font-medium text-pos-ink" dir="ltr" style="font-family: var(--font-pos-mono); font-size: 12.5px">{{ reference(sale) }}</td>
              <td class="whitespace-nowrap">
                <span class="block text-pos-ink">{{ sale.client?.name ?? $t('pos.table.walkIn') }}</span>
                <span class="block text-[12px] text-pos-muted">{{ $t('pos.history.byCashier', { name: sale.cashier.name }) }}</span>
              </td>
              <td class="whitespace-nowrap">
                <span class="inline-flex items-center gap-1.5 text-pos-ink-2">
                  <Banknote v-if="sale.paymentMethod === 'CASH'" class="h-4 w-4 text-pos-muted" />
                  <CreditCard v-else class="h-4 w-4 text-pos-muted" />
                  {{ $t(`common.paymentMethod.${sale.paymentMethod}`) }}
                </span>
              </td>
              <td class="pos-cell-num">
                <span class="font-semibold text-pos-ink" :class="sale.status === 'CANCELLED' ? 'text-pos-muted line-through' : ''">{{ formatMoney(sale.total) }}</span>
                <span v-if="Number(sale.amountOnCredit) > 0 && sale.status !== 'CANCELLED'" class="block text-[12px] text-pos-warn">
                  {{ $t('pos.history.onCredit', { amount: formatMoney(sale.amountOnCredit ?? 0) }) }}
                </span>
              </td>
              <td><PosStatusBadge :status="sale.status" :label="$t(`common.saleStatus.${sale.status}`)" /></td>
              <td class="pos-cell-actions">
                <div class="flex items-center justify-end gap-1">
                  <button type="button" class="pos-icon-btn h-9 w-9" :aria-label="$t('pos.history.print')" :title="$t('pos.history.print')" @click="printSale(sale)">
                    <Printer class="h-4 w-4" />
                  </button>
                  <PosRowMenu :label="$t('pos.table.moreActions')">
                    <button type="button" role="menuitem" class="pos-menu-item" @click="printSale(sale)">
                      <Printer class="h-4 w-4 text-pos-muted" />
                      {{ $t('pos.history.printReceipt') }}
                    </button>
                    <template v-if="canVoid(sale)">
                      <div class="my-1 h-px bg-pos-line" role="separator" />
                      <button type="button" role="menuitem" class="pos-menu-item pos-menu-item-danger" @click="voidTarget = sale">
                        <Ban class="h-4 w-4" />
                        {{ $t('pos.history.void') }}
                      </button>
                    </template>
                  </PosRowMenu>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PosEmptyState v-else :icon="Receipt" :title="$t('pos.history.empty')" :body="$t('pos.history.emptyBody')" />
    </div>

    <VoidSaleDialog v-if="voidTarget" :sale="voidTarget" @close="voidTarget = null" @voided="onVoided" />
  </div>
</template>
