<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getClientPurchases } from '@/services/clientApi'
import type { ClientPurchases } from '@/types/api'
import { Package, ShoppingBag, Store } from 'lucide-vue-next'
import PosModal from '@/components/pos/PosModal.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { formatCount, formatMoney } from '@/utils/formatMoney'
import { orderStatusLabel } from '@/services/orders'
import { numberLocale } from '@/i18n/translate'

const props = defineProps<{
  clientId: string
  clientName: string
}>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const purchases = ref<ClientPurchases | null>(null)
const loading = ref(true)
const error = ref('')

type CombinedEntry =
  | { kind: 'SALE'; id: string; createdAt: string; total: string; label: string; sub: string; lines: ClientPurchases['sales'][number]['lines'] }
  | { kind: 'ONLINE_ORDER'; id: string; createdAt: string; total: string; label: string; sub: string; lines: ClientPurchases['onlineOrders'][number]['lines'] }

/**
 * Built as a computed so labels follow locale changes after load.
 */
const combined = computed<CombinedEntry[]>(() => {
  const data = purchases.value
  if (!data) return []

  const sales: CombinedEntry[] = data.sales.map((s) => ({
    kind: 'SALE',
    id: s.id,
    createdAt: s.createdAt,
    total: s.total,
    label: t('pos.purchases.inStore'),
    sub: t('pos.purchases.saleSub', {
      paymentMethod: t(`common.paymentMethod.${s.paymentMethod}`),
      name: s.cashier.name,
    }),
    lines: s.lines,
  }))

  const orders: CombinedEntry[] = data.onlineOrders.map((o) => ({
    kind: 'ONLINE_ORDER',
    id: o.id,
    createdAt: o.createdAt,
    total: o.total,
    label: t('pos.purchases.onlineOrder', { orderNumber: o.orderNumber }),
    sub: t('pos.purchases.orderSub', {
      fulfillment: t(`common.fulfillment.${o.fulfillmentType}`),
      status: orderStatusLabel(o.status),
    }),
    lines: o.lines,
  }))

  return [...sales, ...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
})

onMounted(async () => {
  try {
    const { data } = await getClientPurchases(props.clientId)
    purchases.value = data.data
  } catch {
    error.value = t('pos.purchases.errorLoad')
  } finally {
    loading.value = false
  }
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(numberLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
</script>

<template>
  <PosModal :title="$t('pos.purchases.title')" :subtitle="clientName" size="lg" @close="emit('close')">
    <div v-if="loading" class="flex flex-col gap-3" role="status">
      <span class="sr-only">{{ $t('common.loading') }}</span>
      <div v-for="i in 3" :key="i" class="pos-skeleton h-24 rounded-2xl" />
    </div>
    <p v-else-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">{{ error }}</p>

    <ol v-else-if="combined.length" class="flex flex-col gap-3">
      <li
        v-for="(entry, index) in combined"
        :key="`${entry.kind}-${entry.id}`"
        class="pos-rise overflow-hidden rounded-2xl border border-pos-line"
        :style="{ '--i': Math.min(index, 8) }"
      >
        <div class="flex items-center justify-between gap-3 bg-pos-sunken px-4 py-3">
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-pos-muted">
              <Store v-if="entry.kind === 'SALE'" class="h-4 w-4" />
              <ShoppingBag v-else class="h-4 w-4" />
            </span>
            <div class="min-w-0">
              <p class="truncate text-[14px] font-medium text-pos-ink">{{ entry.label }}</p>
              <p class="truncate text-[12px] text-pos-muted">{{ formatDate(entry.createdAt) }} · {{ entry.sub }}</p>
            </div>
          </div>
          <p class="shrink-0 text-[14px] font-semibold text-pos-ink pos-num">{{ formatMoney(entry.total) }}</p>
        </div>
        <ul>
          <li
            v-for="line in entry.lines"
            :key="line.productId"
            class="flex items-center justify-between gap-3 border-t border-pos-line/70 px-4 py-2.5 text-[13px]"
          >
            <span class="min-w-0 truncate text-pos-ink-2">
              {{ line.productName }}
              <span class="text-pos-muted pos-num">× {{ formatCount(line.quantity) }}</span>
            </span>
            <span class="shrink-0 text-pos-muted pos-num">{{ formatMoney(line.lineTotal) }}</span>
          </li>
        </ul>
      </li>
    </ol>

    <PosEmptyState v-else :icon="Package" :title="$t('pos.purchases.empty')" compact />
  </PosModal>
</template>
