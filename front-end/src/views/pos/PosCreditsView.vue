<script setup lang="ts">
import { ref, onMounted, watch, computed, inject } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getCreditDashboard, getClient } from '@/services/clientApi'
import type { Client, CreditDashboardEntry } from '@/types/api'
import ClientPurchasesModal from '@/components/pos/ClientPurchasesModal.vue'
import PosRowMenu from '@/components/pos/PosRowMenu.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { HandCoins, Search, ShoppingBag, Wallet } from 'lucide-vue-next'
import { formatAmount, formatCount, formatMoney } from '@/utils/formatMoney'

const auth = useAuthStore()
const entries = ref<CreditDashboardEntry[]>([])
const loading = ref(true)
const search = ref('')
const purchasesClientId = ref<string | null>(null)
const purchasesClientName = ref('')
const collectingId = ref<string | null>(null)

const openPaymentForClient = inject<(client: Client) => void>('posOpenPaymentForClient')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return entries.value
  return entries.value.filter(
    (e) =>
      displayName(e).toLowerCase().includes(q) ||
      e.phone.includes(q) ||
      (e.email ?? '').toLowerCase().includes(q),
  )
})

const totalOwed = computed(() => entries.value.reduce((sum, e) => sum + Number(e.balance), 0))

function displayName(entry: CreditDashboardEntry): string {
  return entry.name ?? entry.clientName ?? entry.phone
}

function debtAge(entry: CreditDashboardEntry): number {
  return entry.oldestDebtAgeDays ?? entry.oldestDebtDays ?? 0
}

/** Debt older than a month reads as overdue, a fortnight as aging. */
function ageTone(days: number): string {
  if (days > 30) return 'pos-badge-err'
  if (days > 14) return 'pos-badge-warn'
  return 'pos-badge-neutral'
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

async function loadCredits() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  // Skeleton only on first load; later refreshes update the table in place.
  loading.value = !entries.value.length
  try {
    const { data } = await getCreditDashboard(shopId)
    entries.value = data.data
  } finally {
    loading.value = false
  }
}

async function collectPayment(entry: CreditDashboardEntry) {
  if (!openPaymentForClient || collectingId.value) return
  collectingId.value = entry.clientId
  try {
    const { data } = await getClient(entry.clientId)
    openPaymentForClient(data.data)
  } finally {
    collectingId.value = null
  }
}

function openPurchases(entry: CreditDashboardEntry) {
  purchasesClientId.value = entry.clientId
  purchasesClientName.value = displayName(entry)
}

onMounted(loadCredits)
watch(() => auth.selectedShopId, loadCredits)
</script>

<template>
  <div class="pos-page">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="pos-page-title">{{ $t('pos.credits.title') }}</h1>
        <p class="pos-page-sub">{{ $t('pos.credits.subtitle') }}</p>
      </div>
      <div class="relative w-full sm:w-80">
        <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pos-faint" aria-hidden="true" />
        <input
          v-model="search"
          type="search"
          :placeholder="$t('pos.credits.searchPlaceholder')"
          :aria-label="$t('pos.credits.searchPlaceholder')"
          class="pos-input pos-input-icon h-10"
        />
      </div>
    </div>

    <!-- Summary -->
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="pos-surface flex items-center gap-4 p-5">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-pos-warn-bg text-pos-warn"><Wallet class="h-5 w-5" /></span>
        <div>
          <p class="text-[12px] font-medium text-pos-muted">{{ $t('pos.credits.totalOwedLabel') }}</p>
          <p class="text-[24px] leading-tight font-semibold tracking-[-0.02em] text-pos-ink pos-num">
            {{ formatAmount(totalOwed) }} <span class="text-[13px] font-medium text-pos-muted">{{ $t('common.currency') }}</span>
          </p>
        </div>
      </div>
      <div class="pos-surface flex items-center gap-4 p-5">
        <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-pos-canvas text-pos-ink-2"><HandCoins class="h-5 w-5" /></span>
        <div>
          <p class="text-[12px] font-medium text-pos-muted">{{ $t('pos.credits.debtorsLabel') }}</p>
          <p class="text-[24px] leading-tight font-semibold tracking-[-0.02em] text-pos-ink pos-num">{{ formatCount(entries.length) }}</p>
        </div>
      </div>
    </div>

    <div class="pos-surface overflow-hidden">
      <div v-if="loading" class="flex flex-col gap-3 p-5" role="status">
        <span class="sr-only">{{ $t('common.loading') }}</span>
        <div v-for="i in 5" :key="i" class="flex items-center gap-6">
          <div class="pos-skeleton h-8 w-8 rounded-full" />
          <div class="pos-skeleton h-4 flex-1" />
          <div class="pos-skeleton h-4 w-24" />
          <div class="pos-skeleton h-8 w-24 rounded-xl" />
        </div>
      </div>

      <div v-else-if="filtered.length" class="overflow-x-auto">
        <table class="pos-table min-w-[680px]">
          <thead>
            <tr>
              <th scope="col">{{ $t('pos.table.client') }}</th>
              <th scope="col">{{ $t('pos.table.phone') }}</th>
              <th scope="col">{{ $t('pos.table.oldestDebt') }}</th>
              <th scope="col" class="pos-cell-num">{{ $t('pos.table.balance') }}</th>
              <th scope="col" class="pos-cell-actions"><span class="sr-only">{{ $t('pos.table.actions') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in filtered" :key="entry.clientId">
              <td>
                <div class="flex items-center gap-3">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pos-canvas text-[11.5px] font-semibold text-pos-ink-2">{{ initials(displayName(entry)) }}</span>
                  <div class="min-w-0">
                    <span class="block font-medium whitespace-nowrap text-pos-ink">{{ displayName(entry) }}</span>
                    <span v-if="entry.email" class="block truncate text-[12px] text-pos-muted">{{ entry.email }}</span>
                  </div>
                </div>
              </td>
              <td class="whitespace-nowrap text-pos-ink-2"><bdi>{{ entry.phone }}</bdi></td>
              <td>
                <span :class="ageTone(debtAge(entry))" class="pos-num">{{ $t('pos.credits.days', { n: formatCount(debtAge(entry)) }, debtAge(entry)) }}</span>
              </td>
              <td class="pos-cell-num font-semibold text-pos-ink">{{ formatMoney(entry.balance) }}</td>
              <td class="pos-cell-actions">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="pos-btn-primary pos-btn-sm"
                    :disabled="collectingId === entry.clientId"
                    :aria-busy="collectingId === entry.clientId"
                    @click="collectPayment(entry)"
                  >
                    <span v-if="collectingId === entry.clientId" class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                    {{ $t('pos.credits.collect') }}
                  </button>
                  <PosRowMenu :label="$t('pos.table.moreActions')">
                    <button type="button" role="menuitem" class="pos-menu-item" @click="openPurchases(entry)">
                      <ShoppingBag class="h-4 w-4 text-pos-muted" />
                      {{ $t('pos.credits.viewPurchases') }}
                    </button>
                  </PosRowMenu>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PosEmptyState v-else :icon="HandCoins" :title="$t('pos.credits.empty')" :body="search ? $t('pos.credits.emptySearch') : $t('pos.credits.emptyBody')" />
    </div>

    <ClientPurchasesModal
      v-if="purchasesClientId"
      :client-id="purchasesClientId"
      :client-name="purchasesClientName"
      @close="purchasesClientId = null"
    />
  </div>
</template>
