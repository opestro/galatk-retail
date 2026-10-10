<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ChevronRight, Package, Plus, Search, Shirt } from 'lucide-vue-next'
import type { ProductFamily } from '@/types/api'
import { listProductFamilies, mediaUrl, familyInStock } from '@/services/products'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/ui/PageHeader.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { formatCount, formatMoney } from '@/utils/formatMoney'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const families = ref<ProductFamily[]>([])
const loading = ref(true)
/** Background refresh after the first load (search / filters). */
const refreshing = ref(false)
const search = ref('')
const filter = ref<'all' | 'available' | 'unavailable'>('all')

const canManage = computed(() => auth.isManager)

const displayed = computed(() => {
  if (filter.value === 'all') return families.value
  const wantAvailable = filter.value === 'available'
  return families.value.filter((family) => familyInStock(family) === wantAvailable)
})

const availableCount = computed(() => families.value.filter(familyInStock).length)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function loadProducts() {
  // Skeleton only on first load; searches refresh the table in place.
  loading.value = !families.value.length
  refreshing.value = !loading.value
  try {
    families.value = await listProductFamilies(search.value.trim() || undefined, auth.selectedShopId ?? undefined)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function stockOf(family: ProductFamily): number {
  return family.variants.reduce((sum, variant) => sum + (variant.shopQuantity ?? 0), 0)
}

function priceOf(family: ProductFamily): string {
  const prices = family.variants.map((variant) => Number(variant.sellPrice)).filter(Number.isFinite)
  if (!prices.length) return t('common.emDash')
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`
}

function openProduct(family: ProductFamily) {
  void router.push({ name: 'admin-product-detail', params: { familyId: family.id } })
}

watch(search, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(loadProducts, 300)
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

onMounted(loadProducts)
watch(() => auth.selectedShopId, loadProducts)
</script>

<template>
  <div class="page-shell">
    <PageHeader
      :title="t('admin.products.title')"
      :subtitle="loading ? '' : t('admin.products.subtitle', { n: formatCount(families.length), available: formatCount(availableCount) }, families.length)"
    >
      <template #actions>
        <RouterLink v-if="canManage" :to="{ name: 'admin-product-create' }" class="pos-btn-primary">
          <Plus class="h-4 w-4" />
          {{ t('admin.products.add') }}
        </RouterLink>
      </template>
    </PageHeader>

    <div class="flex flex-wrap items-center gap-3">
      <div class="relative min-w-0 flex-1 sm:max-w-md">
        <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pos-faint" aria-hidden="true" />
        <input
          v-model="search"
          type="search"
          :placeholder="t('admin.products.searchPlaceholder')"
          :aria-label="t('admin.products.searchPlaceholder')"
          class="pos-input pos-input-icon"
        />
      </div>
      <div class="pos-segmented bg-black/[0.045]" role="group" :aria-label="t('admin.products.filterLabel')">
        <button type="button" class="pos-segment" :aria-pressed="filter === 'all'" @click="filter = 'all'">{{ t('admin.products.filterAll') }}</button>
        <button type="button" class="pos-segment" :aria-pressed="filter === 'available'" @click="filter = 'available'">{{ t('admin.product.statusAvailable') }}</button>
        <button type="button" class="pos-segment" :aria-pressed="filter === 'unavailable'" @click="filter = 'unavailable'">{{ t('admin.products.unavailable') }}</button>
      </div>
    </div>

    <div class="pos-surface overflow-hidden transition-opacity duration-200" :class="refreshing ? 'opacity-60' : ''" :aria-busy="loading || refreshing">
      <div v-if="loading" class="flex flex-col gap-4 p-5" role="status">
        <span class="sr-only">{{ t('common.loading') }}</span>
        <div v-for="i in 5" :key="i" class="flex items-center gap-4">
          <div class="pos-skeleton h-11 w-11 rounded-xl" />
          <div class="pos-skeleton h-4 flex-1" />
          <div class="pos-skeleton h-4 w-24" />
          <div class="pos-skeleton h-6 w-20 rounded-full" />
        </div>
      </div>

      <div v-else-if="displayed.length" class="overflow-x-auto">
        <table class="pos-table min-w-[720px]">
          <thead>
            <tr>
              <th scope="col">{{ t('admin.products.colProduct') }}</th>
              <th scope="col">{{ t('admin.products.colVariants') }}</th>
              <th scope="col" class="pos-cell-num">{{ t('admin.products.colPrice') }}</th>
              <th scope="col" class="pos-cell-num">{{ t('admin.products.colStock') }}</th>
              <th scope="col">{{ t('pos.table.status') }}</th>
              <th scope="col" class="pos-cell-actions"><span class="sr-only">{{ t('common.actions') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="family in displayed"
              :key="family.id"
              class="pos-row-link"
              @click="openProduct(family)"
            >
              <td>
                <div class="flex items-center gap-3">
                  <span class="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-pos-sunken">
                    <img v-if="family.images[0]" :src="mediaUrl(family.images[0].url)" alt="" class="h-full w-full object-cover" loading="lazy" />
                    <Shirt v-else class="h-4 w-4 text-pos-faint" aria-hidden="true" />
                  </span>
                  <div class="min-w-0">
                    <RouterLink
                      :to="{ name: 'admin-product-detail', params: { familyId: family.id } }"
                      class="block truncate font-medium text-pos-ink hover:underline"
                      @click.stop
                    >
                      {{ family.name }}
                    </RouterLink>
                    <span v-if="family.description" class="block max-w-xs truncate text-[12px] text-pos-muted">{{ family.description }}</span>
                  </div>
                </div>
              </td>
              <td class="text-pos-ink-2 pos-num">{{ t('admin.products.variantCount', { n: formatCount(family.variants.length) }, family.variants.length) }}</td>
              <td class="pos-cell-num text-pos-ink">{{ priceOf(family) }}</td>
              <td class="pos-cell-num">
                <span :class="stockOf(family) <= 0 ? 'text-pos-err' : stockOf(family) <= 5 ? 'text-pos-warn' : 'text-pos-ink'" class="font-medium">
                  {{ formatCount(stockOf(family)) }}
                </span>
              </td>
              <td>
                <span v-if="!family.isActive" class="pos-badge-neutral"><span class="pos-dot" />{{ t('admin.products.inactive') }}</span>
                <span v-else-if="familyInStock(family)" class="pos-badge-ok"><span class="pos-dot" />{{ t('admin.product.statusAvailable') }}</span>
                <span v-else class="pos-badge-err"><span class="pos-dot" />{{ t('admin.products.unavailable') }}</span>
              </td>
              <td class="pos-cell-actions">
                <ChevronRight class="ms-auto h-4 w-4 text-pos-faint rtl:rotate-180" aria-hidden="true" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PosEmptyState
        v-else
        :icon="Package"
        :title="t('admin.products.empty')"
        :body="search ? t('admin.products.emptySearch') : ''"
      >
        <RouterLink v-if="canManage && !search" :to="{ name: 'admin-product-create' }" class="pos-btn-soft pos-btn-sm mt-1">
          <Plus class="h-4 w-4" />
          {{ t('admin.products.add') }}
        </RouterLink>
      </PosEmptyState>
    </div>
  </div>
</template>
