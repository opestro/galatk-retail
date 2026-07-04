<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getClientPurchases } from '@/services/clientApi'
import type { ClientPurchases } from '@/types/api'
import { Package, ShoppingBag, Store, X } from 'lucide-vue-next'
import SkeletonList from '@/components/ui/SkeletonList.vue'

const props = defineProps<{
  clientId: string
  clientName: string
}>()

const emit = defineEmits<{ close: [] }>()

const purchases = ref<ClientPurchases | null>(null)
const loading = ref(true)
const error = ref('')

type CombinedEntry =
  | { kind: 'SALE'; id: string; createdAt: string; total: string; label: string; sub: string; lines: ClientPurchases['sales'][number]['lines'] }
  | { kind: 'ONLINE_ORDER'; id: string; createdAt: string; total: string; label: string; sub: string; lines: ClientPurchases['onlineOrders'][number]['lines'] }

const combined = ref<CombinedEntry[]>([])

onMounted(async () => {
  try {
    const { data } = await getClientPurchases(props.clientId)
    purchases.value = data.data

    const sales: CombinedEntry[] = data.data.sales.map((s) => ({
      kind: 'SALE',
      id: s.id,
      createdAt: s.createdAt,
      total: s.total,
      label: 'In-store purchase',
      sub: `${s.paymentMethod} · cashier ${s.cashier.name}`,
      lines: s.lines,
    }))

    const orders: CombinedEntry[] = data.data.onlineOrders.map((o) => ({
      kind: 'ONLINE_ORDER',
      id: o.id,
      createdAt: o.createdAt,
      total: o.total,
      label: `Online order ${o.orderNumber}`,
      sub: `${o.fulfillmentType} · ${o.status.replace(/_/g, ' ').toLowerCase()}`,
      lines: o.lines,
    }))

    combined.value = [...sales, ...orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  } catch {
    error.value = 'Could not load purchase history'
  } finally {
    loading.value = false
  }
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div class="card flex max-h-[85vh] w-full max-w-2xl flex-col gap-4">
      <div class="flex items-start justify-between">
        <div>
          <h3 class="text-lg font-semibold text-gray-900">Purchase history</h3>
          <p class="text-sm text-gray-500">{{ clientName }}</p>
        </div>
        <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center text-gray-400 hover:text-gray-700" @click="emit('close')">
          <X class="h-5 w-5" />
        </button>
      </div>

      <SkeletonList v-if="loading" :rows="3" />
      <p v-else-if="error" class="text-sm text-red-600">{{ error }}</p>

      <div v-else class="flex flex-col gap-3 overflow-y-auto">
        <div
          v-for="entry in combined"
          :key="`${entry.kind}-${entry.id}`"
          class="rounded-lg border border-gray-200"
        >
          <div class="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
            <div class="flex items-center gap-2">
              <Store v-if="entry.kind === 'SALE'" class="h-4 w-4 text-gray-500" />
              <ShoppingBag v-else class="h-4 w-4 text-gray-500" />
              <div>
                <p class="text-sm font-medium text-gray-900">{{ entry.label }}</p>
                <p class="text-xs text-gray-500">{{ formatDate(entry.createdAt) }} · {{ entry.sub }}</p>
              </div>
            </div>
            <p class="text-sm font-semibold text-gray-900">{{ entry.total }} DZD</p>
          </div>
          <ul class="divide-y divide-gray-100">
            <li
              v-for="line in entry.lines"
              :key="line.productId"
              class="flex items-center justify-between px-4 py-2 text-sm"
            >
              <span class="text-gray-700">{{ line.productName }} × {{ line.quantity }}</span>
              <span class="text-gray-500">{{ line.lineTotal }} DZD</span>
            </li>
          </ul>
        </div>

        <div v-if="!combined.length" class="flex flex-col items-center gap-2 py-10 text-center text-sm text-gray-500">
          <Package class="h-8 w-8 text-gray-300" />
          No purchases yet.
        </div>
      </div>
    </div>
  </div>
</template>
