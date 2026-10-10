<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDownToLine, Boxes, Search } from 'lucide-vue-next'
import { api } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type { ShopStockItem } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { formatCount, formatMoney } from '@/utils/formatMoney'

/** At or below this many units a line reads as "low". */
const LOW_STOCK = 5

const { t } = useI18n()
const auth = useAuthStore()
const stock = ref<ShopStockItem[]>([])
const loading = ref(true)
const search = ref('')
const filter = ref<'all' | 'low' | 'out'>('all')

const lowCount = computed(() => stock.value.filter((item) => item.quantity > 0 && item.quantity <= LOW_STOCK).length)
const outCount = computed(() => stock.value.filter((item) => item.quantity <= 0).length)
const totalUnits = computed(() => stock.value.reduce((sum, item) => sum + Math.max(0, item.quantity), 0))

const displayed = computed(() => {
  const q = search.value.trim().toLowerCase()
  return stock.value
    .filter((item) => !q || item.product.name.toLowerCase().includes(q))
    .filter((item) => {
      if (filter.value === 'low') return item.quantity > 0 && item.quantity <= LOW_STOCK
      if (filter.value === 'out') return item.quantity <= 0
      return true
    })
    .sort((a, b) => a.quantity - b.quantity || a.product.name.localeCompare(b.product.name))
})

async function loadStock() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = !stock.value.length
  try {
    const { data } = await api.get<{ data: ShopStockItem[] }>(`/shops/${shopId}/stock`)
    stock.value = data.data
  } finally {
    loading.value = false
  }
}

onMounted(loadStock)
watch(() => auth.selectedShopId, loadStock)
</script>

<template>
  <div class="page-shell">
    <PageHeader
      :title="t('admin.stock.title')"
      :subtitle="loading ? '' : t('admin.stock.subtitle', { n: formatCount(stock.length), units: formatCount(totalUnits) })"
    >
      <template #actions>
        <RouterLink to="/admin/inbound" class="pos-btn-primary">
          <ArrowDownToLine class="h-4 w-4" />
          {{ t('admin.dashboard.receiveStock') }}
        </RouterLink>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-3">
      <div class="relative min-w-0 flex-1 sm:max-w-md">
        <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pos-faint" aria-hidden="true" />
        <input v-model="search" type="search" :placeholder="t('admin.stock.searchPlaceholder')" :aria-label="t('admin.stock.searchPlaceholder')" class="pos-input pos-input-icon" />
      </div>
      <div class="pos-segmented bg-black/[0.045]" role="group" :aria-label="t('admin.products.filterLabel')">
        <button type="button" class="pos-segment" :aria-pressed="filter === 'all'" @click="filter = 'all'">{{ t('admin.products.filterAll') }}</button>
        <button type="button" class="pos-segment" :aria-pressed="filter === 'low'" @click="filter = 'low'">
          {{ t('admin.stock.low') }} <span class="text-pos-muted pos-num">{{ formatCount(lowCount) }}</span>
        </button>
        <button type="button" class="pos-segment" :aria-pressed="filter === 'out'" @click="filter = 'out'">
          {{ t('admin.stock.out') }} <span class="text-pos-muted pos-num">{{ formatCount(outCount) }}</span>
        </button>
      </div>
    </div>

    <div class="pos-surface overflow-hidden">
      <div v-if="loading" class="flex flex-col gap-4 p-5" role="status">
        <span class="sr-only">{{ t('common.loading') }}</span>
        <div v-for="i in 6" :key="i" class="flex items-center gap-6">
          <div class="pos-skeleton h-4 flex-1" />
          <div class="pos-skeleton h-4 w-24" />
          <div class="pos-skeleton h-6 w-20 rounded-full" />
        </div>
      </div>
      <div v-else-if="displayed.length" class="overflow-x-auto">
        <table class="pos-table min-w-[520px]">
          <thead>
            <tr>
              <th scope="col">{{ t('admin.stock.colProduct') }}</th>
              <th scope="col" class="pos-cell-num">{{ t('admin.stock.colPrice') }}</th>
              <th scope="col" class="pos-cell-num">{{ t('admin.stock.colQuantity') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in displayed" :key="item.id">
              <td class="font-medium text-pos-ink">{{ item.product.name }}</td>
              <td class="pos-cell-num text-pos-ink-2">{{ formatMoney(item.product.sellPrice) }}</td>
              <td class="pos-cell-num">
                <span v-if="item.quantity <= 0" class="pos-badge-err">{{ t('admin.stock.out') }}</span>
                <span v-else-if="item.quantity <= LOW_STOCK" class="pos-badge-warn pos-num">{{ formatCount(item.quantity) }}</span>
                <span v-else class="font-medium text-pos-ink pos-num">{{ formatCount(item.quantity) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <PosEmptyState v-else :icon="Boxes" :title="t('admin.stock.empty')" />
    </div>
  </div>
</template>
