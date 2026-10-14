<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ShopStockItem } from '@/types/api'
import { Boxes, ChevronDown, ChevronsDownUp, ChevronsUpDown } from 'lucide-vue-next'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { formatCount, formatMoney } from '@/utils/formatMoney'

type QtyState = 'idle' | 'saving' | 'error'

interface SizeRow {
  item: ShopStockItem
  size: string
}

interface ColorGroup {
  key: string
  label: string
  rows: SizeRow[]
  units: number
  out: number
  low: number
}

interface FamilyGroup {
  key: string
  name: string
  colors: ColorGroup[]
  sizeCount: number
  units: number
  out: number
  low: number
  price: [number, number]
}

const props = defineProps<{
  items: ShopStockItem[]
  /** Free-text query; a non-empty value opens every matching group. */
  query: string
  canEdit: boolean
  lowStock: number
  draft: Record<string, string>
  state: Record<string, QtyState>
}>()

const emit = defineEmits<{
  'update:draft': [value: Record<string, string>]
  save: [item: ShopStockItem]
}>()

const { t } = useI18n()
const expanded = ref<Set<string>>(new Set())

const SIZE_ORDER = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl']

function compareSize(a: string, b: string): number {
  const rank = (value: string) => {
    const i = SIZE_ORDER.indexOf(value.toLowerCase())
    return i >= 0 ? i : Number.isFinite(Number(value)) && value.trim() !== '' ? 100 + Number(value) : 1000
  }
  return rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true })
}

function tally(rows: SizeRow[]) {
  let units = 0
  let out = 0
  let low = 0
  for (const { item } of rows) {
    units += Math.max(0, item.quantity)
    if (item.quantity <= 0) out++
    else if (item.quantity <= props.lowStock) low++
  }
  return { units, out, low }
}

const families = computed<FamilyGroup[]>(() => {
  const byFamily = new Map<string, { name: string; colors: Map<string, { label: string; rows: SizeRow[] }> }>()
  for (const item of props.items) {
    const name = item.product.familyName || item.product.name
    const familyKey = item.product.familyId || name.toLowerCase()
    const color = item.product.attributes?.color?.trim() ?? ''
    const family = byFamily.get(familyKey) ?? { name, colors: new Map() }
    const group = family.colors.get(color.toLowerCase()) ?? { label: color, rows: [] }
    group.rows.push({ item, size: item.product.attributes?.size?.trim() || '' })
    family.colors.set(color.toLowerCase(), group)
    byFamily.set(familyKey, family)
  }
  return [...byFamily.entries()]
    .map(([key, family]) => {
      const colors: ColorGroup[] = [...family.colors.entries()]
        .map(([colorKey, group]) => ({
          key: `${key}|${colorKey}`,
          label: group.label || t('admin.variant.noColor'),
          rows: group.rows.sort((a, b) => compareSize(a.size, b.size)),
          ...tally(group.rows),
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
      const all = colors.flatMap((c) => c.rows)
      const prices = all.map((r) => Number(r.item.product.sellPrice))
      return {
        key,
        name: family.name,
        colors,
        sizeCount: all.length,
        price: [Math.min(...prices), Math.max(...prices)] as [number, number],
        ...tally(all),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
})

const allKeys = computed(() => families.value.flatMap((f) => [f.key, ...f.colors.map((c) => c.key)]))
const allOpen = computed(() => allKeys.value.length > 0 && allKeys.value.every((k) => expanded.value.has(k)))

watch(
  () => props.query,
  (value) => {
    if (value.trim()) expanded.value = new Set(allKeys.value)
  },
)

function toggle(key: string) {
  const next = new Set(expanded.value)
  if (!next.delete(key)) next.add(key)
  expanded.value = next
}

function toggleAll() {
  expanded.value = allOpen.value ? new Set() : new Set(allKeys.value)
}

function range([min, max]: [number, number]): string {
  return min === max ? formatMoney(min) : `${formatMoney(min)} – ${formatMoney(max)}`
}

function patchDraft(id: string, value: string) {
  emit('update:draft', { ...props.draft, [id]: value })
}

</script>

<template>
  <div v-if="families.length" class="overflow-x-auto">
    <table class="pos-table min-w-[560px]">
      <thead>
        <tr>
          <th scope="col" class="ps-5">
            <div class="flex items-center gap-2">
              {{ t('admin.stock.colProduct') }}
              <button
                type="button"
                class="inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[11.5px] font-medium text-pos-muted transition-colors hover:bg-pos-sunken hover:text-pos-ink"
                @click="toggleAll"
              >
                <component :is="allOpen ? ChevronsDownUp : ChevronsUpDown" class="h-3.5 w-3.5" aria-hidden="true" />
                {{ allOpen ? t('admin.variant.collapseAll') : t('admin.variant.expandAll') }}
              </button>
            </div>
          </th>
          <th scope="col" class="pos-cell-num">{{ t('admin.stock.colPrice') }}</th>
          <th scope="col" class="pos-cell-num pe-5">{{ t('admin.stock.colQuantity') }}</th>
        </tr>
      </thead>

      <tbody v-for="family in families" :key="family.key">
        <!-- Level 1: product -->
        <tr class="cursor-pointer select-none" @click="toggle(family.key)">
          <td class="ps-5">
            <button
              type="button"
              class="flex w-full items-center gap-2.5 rounded-lg text-start focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pos-ink"
              :aria-expanded="expanded.has(family.key)"
              :aria-label="t('admin.stock.toggleProduct', { name: family.name })"
              @click.stop="toggle(family.key)"
            >
              <ChevronDown
                class="h-4 w-4 shrink-0 text-pos-muted transition-transform duration-200"
                :class="expanded.has(family.key) ? 'rotate-0' : '-rotate-90 rtl:rotate-90'"
                aria-hidden="true"
              />
              <span class="font-semibold text-pos-ink">{{ family.name }}</span>
              <span class="pos-badge-neutral h-5 px-2 text-[11px]">
                {{ t('admin.stock.colorsCount', { n: formatCount(family.colors.length) }, family.colors.length) }}
                · {{ t('admin.variant.sizesCount', { n: formatCount(family.sizeCount) }, family.sizeCount) }}
              </span>
              <span v-if="family.out" class="pos-badge-err h-5 px-2 text-[11px]">{{ t('admin.stock.outCount', { n: formatCount(family.out) }) }}</span>
              <span v-if="family.low" class="pos-badge-warn h-5 px-2 text-[11px]">{{ t('admin.stock.lowCount', { n: formatCount(family.low) }) }}</span>
            </button>
          </td>
          <td class="pos-cell-num text-pos-ink-2">{{ range(family.price) }}</td>
          <td class="pos-cell-num pe-5 font-semibold text-pos-ink">{{ formatCount(family.units) }}</td>
        </tr>

        <template v-if="expanded.has(family.key)">
          <template v-for="color in family.colors" :key="color.key">
            <!-- Level 2: color -->
            <tr class="stock-child-row cursor-pointer select-none bg-[#fcfcfb]" @click="toggle(color.key)">
              <td class="ps-5">
                <button
                  type="button"
                  class="flex w-full items-center gap-2.5 rounded-lg ps-6 text-start focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pos-ink"
                  :aria-expanded="expanded.has(color.key)"
                  :aria-label="t('admin.variant.toggleColor', { color: color.label })"
                  @click.stop="toggle(color.key)"
                >
                  <ChevronDown
                    class="h-4 w-4 shrink-0 text-pos-muted transition-transform duration-200"
                    :class="expanded.has(color.key) ? 'rotate-0' : '-rotate-90 rtl:rotate-90'"
                    aria-hidden="true"
                  />
                  <span class="font-medium text-pos-ink">{{ color.label }}</span>
                  <span class="pos-badge-neutral h-5 px-2 text-[11px]">{{ t('admin.variant.sizesCount', { n: formatCount(color.rows.length) }, color.rows.length) }}</span>
                  <span v-if="color.out" class="pos-badge-err h-5 px-2 text-[11px]">{{ t('admin.stock.outCount', { n: formatCount(color.out) }) }}</span>
                  <span v-if="color.low" class="pos-badge-warn h-5 px-2 text-[11px]">{{ t('admin.stock.lowCount', { n: formatCount(color.low) }) }}</span>
                </button>
              </td>
              <td />
              <td class="pos-cell-num pe-5 font-medium text-pos-ink">{{ formatCount(color.units) }}</td>
            </tr>

            <!-- Level 3: size, quantity editable -->
            <template v-if="expanded.has(color.key)">
              <tr v-for="{ item, size } in color.rows" :key="item.id" class="stock-child-row">
                <td class="ps-5">
                  <div class="flex items-center gap-2 ps-[3.25rem]">
                    <span class="text-pos-ink-2">{{ size || t('common.emDash') }}</span>
                    <span v-if="item.quantity <= 0" class="pos-badge-err h-5 px-2 text-[11px]">{{ t('admin.stock.out') }}</span>
                    <span v-else-if="item.quantity <= lowStock" class="pos-badge-warn h-5 px-2 text-[11px]">{{ t('admin.stock.low') }}</span>
                  </div>
                </td>
                <td class="pos-cell-num text-pos-ink-2">{{ formatMoney(item.product.sellPrice) }}</td>
                <td class="pos-cell-num pe-5">
                  <div v-if="canEdit" class="relative ms-auto w-24">
                    <input
                      :value="draft[item.id] ?? String(item.quantity)"
                      type="number"
                      inputmode="numeric"
                      min="0"
                      step="1"
                      class="pos-input h-9 text-end pos-num"
                      :class="state[item.id] === 'error' ? 'border-pos-err' : ''"
                      :disabled="state[item.id] === 'saving'"
                      :aria-label="t('admin.variant.stockFor', { name: `${family.name} ${color.label} ${size}`.trim() })"
                      @input="patchDraft(item.id, ($event.target as HTMLInputElement).value)"
                      @keydown.enter="($event.target as HTMLInputElement).blur()"
                      @keydown.esc="patchDraft(item.id, String(item.quantity)); ($event.target as HTMLInputElement).blur()"
                      @focus="($event.target as HTMLInputElement).select()"
                      @blur="emit('save', item)"
                    />
                    <span v-if="state[item.id] === 'saving'" class="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-pos-line border-t-pos-ink" aria-hidden="true" />
                  </div>
                  <span v-else class="font-medium text-pos-ink pos-num">{{ formatCount(item.quantity) }}</span>
                </td>
              </tr>
            </template>
          </template>
        </template>
      </tbody>
    </table>
  </div>
  <PosEmptyState v-else :icon="Boxes" :title="t('admin.stock.empty')" />
</template>

<style scoped>
@keyframes stock-child-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}

.stock-child-row {
  animation: stock-child-in 180ms ease-out;
}

/* Each product is its own <tbody>, so keep the divider that :last-child would drop. */
.pos-table tbody:not(:last-of-type) tr:last-child td {
  border-bottom: 1px solid #f3f3f3;
}

@media (prefers-reduced-motion: reduce) {
  .stock-child-row {
    animation: none;
  }
}
</style>
