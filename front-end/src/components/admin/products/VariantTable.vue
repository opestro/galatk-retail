<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Product } from '@/types/api'
import { compareSizes, formatMarginPercent, variantInStock } from '@/services/products'
import { PRIMARY_ATTRIBUTE_KEYS } from './variantDraft'
import { Check, ChevronDown, ChevronsDownUp, ChevronsUpDown, Minus, Pencil, Search, SearchX, Trash2, Layers, X } from 'lucide-vue-next'
import PosRowMenu from '@/components/pos/PosRowMenu.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { formatMoney, formatCount } from '@/utils/formatMoney'

const { t } = useI18n()

const props = defineProps<{
  variants: Product[]
  /** Edit variant details. */
  canManage?: boolean
  canDelete?: boolean
  /** Change stock quantities inline. */
  canStock?: boolean
  stockDraft?: Record<string, string>
  stockState?: Record<string, 'idle' | 'saving' | 'error'>
}>()

const emit = defineEmits<{
  'update:stockDraft': [value: Record<string, string>]
  'save-stock': [variant: Product]
  edit: [variantId: string]
  delete: [variantId: string]
  'delete-many': [payload: { ids: string[]; label: string; kind?: 'size' }]
}>()

interface ColorGroup {
  key: string
  label: string
  variants: Product[]
  stock: number
  inStock: boolean
  online: number
  active: number
  cost: [number, number]
  price: [number, number]
}

const query = ref('')
const expanded = ref<Set<string>>(new Set())

const extraKeys = computed(() => {
  const keys = new Set<string>()
  for (const variant of props.variants) {
    for (const key of Object.keys(variant.attributes ?? {})) {
      if (!(PRIMARY_ATTRIBUTE_KEYS as readonly string[]).includes(key)) keys.add(key)
    }
  }
  return [...keys].sort()
})

const searching = computed(() => query.value.trim().length > 0)

const visibleVariants = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return props.variants
  return props.variants.filter((variant) =>
    Object.values(variant.attributes ?? {}).some((value) => String(value).toLowerCase().includes(needle)),
  )
})

const groups = computed<ColorGroup[]>(() => {
  const byColor = new Map<string, Product[]>()
  for (const variant of visibleVariants.value) {
    const key = (variant.attributes?.color ?? '').trim().toLowerCase()
    const list = byColor.get(key)
    if (list) list.push(variant)
    else byColor.set(key, [variant])
  }
  return [...byColor.entries()].map(([key, unsorted]) => {
    const variants = [...unsorted].sort((a, b) => compareSizes(a.attributes?.size, b.attributes?.size))
    const costs = variants.map((v) => Number(v.unitCost))
    const prices = variants.map((v) => Number(v.sellPrice))
    return {
      key,
      label: variants[0]?.attributes?.color?.trim() || t('admin.variant.noColor'),
      variants,
      stock: variants.reduce((sum, v) => sum + (v.shopQuantity ?? 0), 0),
      inStock: variants.some((v) => variantInStock(v)),
      online: variants.filter((v) => v.availableOnline).length,
      active: variants.filter((v) => v.isActive).length,
      cost: [Math.min(...costs), Math.max(...costs)],
      price: [Math.min(...prices), Math.max(...prices)],
    }
  })
})

const allOpen = computed(() => groups.value.length > 0 && groups.value.every((g) => expanded.value.has(g.key)))

// While searching, open every matching color so the matching sizes are visible right away.
watch(query, (value) => {
  if (value.trim()) expanded.value = new Set(groups.value.map((g) => g.key))
})

function toggle(key: string) {
  const next = new Set(expanded.value)
  if (!next.delete(key)) next.add(key)
  expanded.value = next
}

function toggleAll() {
  expanded.value = allOpen.value ? new Set() : new Set(groups.value.map((g) => g.key))
}

function range([min, max]: [number, number]): string {
  return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`
}

function attr(variant: Product, key: string): string {
  return variant.attributes?.[key] || t('common.emDash')
}

/** Every variant of a color, even those hidden by the current search. */
function deleteColor(group: ColorGroup) {
  const ids = props.variants
    .filter((v) => (v.attributes?.color ?? '').trim().toLowerCase() === group.key)
    .map((v) => v.id)
  emit('delete-many', { ids, label: group.label })
}

const sizes = computed(() => {
  const unique = new Map<string, string>()
  for (const v of props.variants) {
    const size = (v.attributes?.size ?? '').trim()
    if (size) unique.set(size.toLowerCase(), size)
  }
  return [...unique.values()].sort(compareSizes)
})

function deleteSize(event: Event) {
  const select = event.target as HTMLSelectElement
  const size = select.value
  select.value = ''
  if (!size) return
  const ids = props.variants
    .filter((v) => (v.attributes?.size ?? '').trim().toLowerCase() === size.toLowerCase())
    .map((v) => v.id)
  emit('delete-many', { ids, label: size, kind: 'size' })
}

function deleteAll() {
  emit('delete-many', { ids: props.variants.map((v) => v.id), label: '' })
}

function patchStock(id: string, value: string) {
  emit('update:stockDraft', { ...(props.stockDraft ?? {}), [id]: value })
}
</script>

<template>
  <div v-if="variants.length" class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-0 flex-1 sm:max-w-sm">
        <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pos-faint" aria-hidden="true" />
        <input
          v-model="query"
          type="search"
          class="pos-input pos-input-icon pe-10 [&::-webkit-search-cancel-button]:hidden"
          :placeholder="t('admin.variant.searchPlaceholder')"
          :aria-label="t('admin.variant.searchPlaceholder')"
          @keydown.esc="query = ''"
        />
        <button
          v-if="searching"
          type="button"
          class="pos-icon-btn absolute end-1.5 top-1/2 h-8 w-8 -translate-y-1/2"
          :aria-label="t('admin.variant.clearSearch')"
          @click="query = ''"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
      <select
        v-if="canDelete && sizes.length"
        class="pos-input h-9 w-auto text-[13px] text-pos-err"
        :aria-label="t('admin.variant.deleteSize')"
        @change="deleteSize"
      >
        <option value="">{{ t('admin.variant.deleteSize') }}</option>
        <option v-for="size in sizes" :key="size" :value="size">{{ size }}</option>
      </select>
      <button v-if="canDelete" type="button" class="pos-btn-ghost pos-btn-sm text-pos-err" @click="deleteAll">
        <Trash2 class="h-4 w-4" />
        {{ t('admin.variant.deleteAll') }}
      </button>
      <button v-if="groups.length > 1" type="button" class="pos-btn-ghost pos-btn-sm" @click="toggleAll">
        <component :is="allOpen ? ChevronsDownUp : ChevronsUpDown" class="h-4 w-4" />
        {{ allOpen ? t('admin.variant.collapseAll') : t('admin.variant.expandAll') }}
      </button>
      <p class="ms-auto text-[12.5px] text-pos-muted" aria-live="polite">
        {{ t('admin.variant.colorsSummary', { n: formatCount(groups.length), sizes: formatCount(visibleVariants.length) }, groups.length) }}
      </p>
    </div>

    <div v-if="groups.length" class="-mx-6 overflow-x-auto">
      <table class="pos-table min-w-[760px]">
        <thead>
          <tr>
            <th scope="col" class="ps-6">{{ t('admin.variant.colorAndSize') }}</th>
            <th v-for="key in extraKeys" :key="key" scope="col" class="capitalize">{{ key }}</th>
            <th scope="col" class="pos-cell-num">{{ t('admin.variant.cost') }}</th>
            <th scope="col" class="pos-cell-num">{{ t('admin.variant.price') }}</th>
            <th scope="col" class="pos-cell-num">{{ t('admin.variant.margin') }}</th>
            <th scope="col">{{ t('admin.variant.stock') }}</th>
            <th scope="col" class="text-center">{{ t('admin.variant.online') }}</th>
            <th scope="col" class="text-center">{{ t('admin.variant.active') }}</th>
            <th v-if="canManage || canDelete" scope="col" class="pos-cell-actions pe-6"><span class="sr-only">{{ t('common.actions') }}</span></th>
          </tr>
        </thead>
        <tbody v-for="group in groups" :key="group.key">
          <tr class="cursor-pointer select-none" :class="group.inStock ? '' : 'opacity-70'" @click="toggle(group.key)">
            <td class="ps-6">
              <button
                type="button"
                class="flex w-full items-center gap-2.5 rounded-lg text-start focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pos-accent-glow"
                :aria-expanded="expanded.has(group.key)"
                :aria-label="t('admin.variant.toggleColor', { color: group.label })"
                @click.stop="toggle(group.key)"
              >
                <ChevronDown
                  class="h-4 w-4 shrink-0 text-pos-muted transition-transform duration-200"
                  :class="expanded.has(group.key) ? 'rotate-0' : '-rotate-90 rtl:rotate-90'"
                  aria-hidden="true"
                />
                <span class="font-semibold text-pos-ink">{{ group.label }}</span>
                <span class="pos-badge-neutral h-5 px-2 text-[11px]">{{ t('admin.variant.sizesCount', { n: formatCount(group.variants.length) }, group.variants.length) }}</span>
                <span v-if="!group.inStock" class="pos-badge-err h-5 px-2 text-[11px]">{{ t('admin.variant.unavailable') }}</span>
              </button>
            </td>
            <td v-for="key in extraKeys" :key="`${group.key}-${key}`" />
            <td class="pos-cell-num text-pos-muted">{{ range(group.cost) }}</td>
            <td class="pos-cell-num font-medium text-pos-ink">{{ range(group.price) }}</td>
            <td class="pos-cell-num text-pos-faint">{{ t('common.emDash') }}</td>
            <td class="pos-num font-medium text-pos-ink">{{ formatCount(group.stock) }}</td>
            <td class="text-center">
              <Check v-if="group.online === group.variants.length" class="mx-auto h-4 w-4 text-pos-ok" :aria-label="t('common.yes')" />
              <Minus v-else-if="group.online === 0" class="mx-auto h-4 w-4 text-pos-faint" :aria-label="t('common.no')" />
              <span v-else class="pos-num text-[12.5px] text-pos-muted">{{ group.online }}/{{ group.variants.length }}</span>
            </td>
            <td class="text-center">
              <Check v-if="group.active === group.variants.length" class="mx-auto h-4 w-4 text-pos-ok" :aria-label="t('common.yes')" />
              <Minus v-else-if="group.active === 0" class="mx-auto h-4 w-4 text-pos-faint" :aria-label="t('common.no')" />
              <span v-else class="pos-num text-[12.5px] text-pos-muted">{{ group.active }}/{{ group.variants.length }}</span>
            </td>
            <td v-if="canManage || canDelete" class="pos-cell-actions pe-6" @click.stop>
              <div v-if="canDelete" class="flex items-center justify-end">
                <PosRowMenu :label="t('pos.table.moreActions')">
                  <button type="button" role="menuitem" class="pos-menu-item pos-menu-item-danger" @click="deleteColor(group)">
                    <Trash2 class="h-4 w-4" />
                    {{ t('admin.variant.deleteColor') }}
                  </button>
                </PosRowMenu>
              </div>
            </td>
          </tr>

          <template v-if="expanded.has(group.key)">
            <tr v-for="variant in group.variants" :key="variant.id" class="variant-size-row bg-[#fcfcfb]" :class="variantInStock(variant) ? '' : 'opacity-70'">
              <td class="ps-6">
                <div class="flex flex-wrap items-center gap-1.5 ps-[26px]">
                  <span class="text-pos-ink-2">{{ attr(variant, 'size') }}</span>
                  <span v-if="variant.galatkProductRef" class="pos-badge-neutral h-5 px-2 text-[11px]">{{ t('admin.variant.factoryBadge') }}</span>
                  <span v-if="!variantInStock(variant)" class="pos-badge-err h-5 px-2 text-[11px]">{{ t('admin.variant.unavailable') }}</span>
                </div>
              </td>
              <td v-for="key in extraKeys" :key="`${variant.id}-${key}`" class="text-pos-ink-2">{{ attr(variant, key) }}</td>
              <td class="pos-cell-num text-pos-muted">{{ formatMoney(variant.unitCost) }}</td>
              <td class="pos-cell-num font-medium text-pos-ink">{{ formatMoney(variant.sellPrice) }}</td>
              <td class="pos-cell-num text-pos-ink-2">{{ formatMarginPercent(variant.sellPrice, variant.unitCost) }}</td>
              <td>
                <div v-if="canStock && stockDraft" class="relative w-24">
                  <input
                    :value="stockDraft[variant.id]"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    step="1"
                    class="pos-input h-9 pos-num"
                    :class="stockState?.[variant.id] === 'error' ? 'border-pos-err' : ''"
                    :disabled="stockState?.[variant.id] === 'saving'"
                    :aria-label="t('admin.variant.stockFor', { name: `${group.label} ${attr(variant, 'size')}` })"
                    @input="patchStock(variant.id, ($event.target as HTMLInputElement).value)"
                    @keydown.enter="($event.target as HTMLInputElement).blur()"
                    @blur="emit('save-stock', variant)"
                  />
                  <span v-if="stockState?.[variant.id] === 'saving'" class="absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-pos-line border-t-pos-ink" aria-hidden="true" />
                </div>
                <span v-else class="pos-num">{{ formatCount(variant.shopQuantity ?? 0) }}</span>
              </td>
              <td class="text-center">
                <Check v-if="variant.availableOnline" class="mx-auto h-4 w-4 text-pos-ok" :aria-label="t('common.yes')" />
                <Minus v-else class="mx-auto h-4 w-4 text-pos-faint" :aria-label="t('common.no')" />
              </td>
              <td class="text-center">
                <Check v-if="variant.isActive" class="mx-auto h-4 w-4 text-pos-ok" :aria-label="t('common.yes')" />
                <Minus v-else class="mx-auto h-4 w-4 text-pos-faint" :aria-label="t('common.no')" />
              </td>
              <td v-if="canManage || canDelete" class="pos-cell-actions pe-6">
                <div class="flex items-center justify-end gap-1">
                  <button v-if="canManage" type="button" class="pos-icon-btn h-9 w-9" :aria-label="t('common.edit')" :title="t('common.edit')" @click="emit('edit', variant.id)">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <PosRowMenu :label="t('pos.table.moreActions')">
                    <template v-if="canManage">
                      <button type="button" role="menuitem" class="pos-menu-item" @click="emit('edit', variant.id)">
                        <Pencil class="h-4 w-4 text-pos-muted" />
                        {{ t('common.edit') }}
                      </button>
                      <div v-if="canDelete" class="my-1 h-px bg-pos-line" role="separator" />
                    </template>
                    <button v-if="canDelete" type="button" role="menuitem" class="pos-menu-item pos-menu-item-danger" @click="emit('delete', variant.id)">
                      <Trash2 class="h-4 w-4" />
                      {{ t('common.delete') }}
                    </button>
                  </PosRowMenu>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <PosEmptyState v-else :icon="SearchX" :title="t('admin.variant.noMatch', { q: query.trim() })" compact />
  </div>
  <PosEmptyState v-else :icon="Layers" :title="t('admin.variant.empty')" compact />
</template>

<style scoped>
@keyframes variant-size-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}

/* Each color is its own <tbody>, so keep the divider that :last-child would drop. */
.pos-table tbody:not(:last-of-type) tr:last-child td {
  border-bottom: 1px solid #f3f3f3;
}

.variant-size-row {
  animation: variant-size-in 180ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .variant-size-row {
    animation: none;
  }
}
</style>
