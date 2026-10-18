<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ArrowDownToLine, Search, Trash2, X } from 'lucide-vue-next'
import { api } from '@/services/api'
import { apiErrorMessage, deleteProduct, setVariantStock } from '@/services/products'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import type { ShopStockItem } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import AdminConfirm from '@/components/admin/AdminConfirm.vue'
import StockGroupTable from '@/components/admin/stock/StockGroupTable.vue'
import { formatCount } from '@/utils/formatMoney'

/** At or below this many units a line reads as "low". */
const LOW_STOCK = 5

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToast()
const stock = ref<ShopStockItem[]>([])
const loading = ref(true)
const search = ref('')
const filter = ref<'all' | 'low' | 'out'>('all')
const draft = ref<Record<string, string>>({})
const confirmAll = ref(false)
const deleting = ref(false)
const qtyState = ref<Record<string, 'idle' | 'saving' | 'error'>>({})

const lowCount = computed(() => stock.value.filter((item) => item.quantity > 0 && item.quantity <= LOW_STOCK).length)
const outCount = computed(() => stock.value.filter((item) => item.quantity <= 0).length)
const totalUnits = computed(() => stock.value.reduce((sum, item) => sum + Math.max(0, item.quantity), 0))

/** Every typed word must match the product, color or size, so "baggy rouge m" narrows all three. */
function matchesQuery(item: ShopStockItem, terms: string[]): boolean {
  if (!terms.length) return true
  const { product } = item
  const haystack = [product.familyName, product.name, ...Object.values(product.attributes ?? {})].join(' ').toLowerCase()
  return terms.every((term) => haystack.includes(term))
}

const displayed = computed(() => {
  const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return stock.value
    .filter((item) => matchesQuery(item, terms))
    .filter((item) => {
      if (filter.value === 'low') return item.quantity > 0 && item.quantity <= LOW_STOCK
      if (filter.value === 'out') return item.quantity <= 0
      return true
    })
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
    draft.value = {}
  } finally {
    loading.value = false
  }
}

async function saveQuantity(item: ShopStockItem) {
  const shopId = auth.selectedShopId
  const raw = draft.value[item.id]
  if (!shopId || raw === undefined) return
  const parsed = Number(raw)
  if (raw.trim() === '' || !Number.isInteger(parsed) || parsed < 0) {
    delete draft.value[item.id]
    toast.error(t('admin.product.stockInvalid'))
    return
  }
  if (parsed === item.quantity) {
    delete draft.value[item.id]
    return
  }
  qtyState.value[item.id] = 'saving'
  try {
    await setVariantStock(item.productId, shopId, parsed)
    item.quantity = parsed
    delete draft.value[item.id]
    qtyState.value[item.id] = 'idle'
    toast.success(parsed === 0 ? t('admin.product.stockZeroFeedback') : t('admin.product.stockUpdated'))
  } catch (e) {
    delete draft.value[item.id]
    qtyState.value[item.id] = 'error'
    toast.error(apiErrorMessage(e, t('admin.product.stockUpdateError')))
  }
}

async function confirmDeleteAll() {
  const targets = displayed.value
  if (!targets.length) return
  deleting.value = true
  // One by one: variants used in sales/orders are refused by the API and simply stay.
  const results = await Promise.allSettled(targets.map((item) => deleteProduct(item.productId)))
  const gone = new Set(targets.filter((_, i) => results[i].status === 'fulfilled').map((item) => item.id))
  const kept = targets.length - gone.size
  stock.value = stock.value.filter((item) => !gone.has(item.id))
  if (kept) toast.error(t('admin.variant.bulkPartial', { removed: formatCount(gone.size), kept: formatCount(kept) }))
  else toast.success(t('admin.variant.bulkDeleted', { n: formatCount(gone.size) }, gone.size))
  confirmAll.value = false
  deleting.value = false
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
        <button v-if="auth.can('PRODUCT_DELETE') && displayed.length" type="button" class="pos-btn-ghost text-pos-err" @click="confirmAll = true">
          <Trash2 class="h-4 w-4" />
          {{ t('admin.variant.deleteAll') }}
        </button>
        <RouterLink to="/admin/inbound" class="pos-btn-primary">
          <ArrowDownToLine class="h-4 w-4" />
          {{ t('admin.dashboard.receiveStock') }}
        </RouterLink>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-3">
      <div class="relative min-w-0 flex-1 sm:max-w-md">
        <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pos-faint" aria-hidden="true" />
        <input
          v-model="search"
          type="search"
          :placeholder="t('admin.stock.searchPlaceholder')"
          :aria-label="t('admin.stock.searchPlaceholder')"
          class="pos-input pos-input-icon pe-10 [&::-webkit-search-cancel-button]:hidden"
          @keydown.esc="search = ''"
        />
        <button
          v-if="search"
          type="button"
          class="pos-icon-btn absolute end-1.5 top-1/2 h-8 w-8 -translate-y-1/2"
          :aria-label="t('admin.variant.clearSearch')"
          @click="search = ''"
        >
          <X class="h-4 w-4" />
        </button>
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
      <StockGroupTable
        v-else
        v-model:draft="draft"
        :items="displayed"
        :query="search"
        :can-edit="auth.can('STOCK_ADJUST')"
        :low-stock="LOW_STOCK"
        :state="qtyState"
        @save="saveQuantity"
      />
    </div>

    <AdminConfirm
      v-if="confirmAll"
      :title="t('admin.variant.deleteAllTitle')"
      :body="t('admin.variant.confirmDeleteMany', { n: formatCount(displayed.length) }, displayed.length)"
      :confirm-label="t('admin.variant.deleteAll')"
      danger
      :busy="deleting"
      @close="confirmAll = false"
      @confirm="confirmDeleteAll"
    />
  </div>
</template>
