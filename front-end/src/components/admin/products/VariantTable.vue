<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Product } from '@/types/api'
import { formatMarginPercent, variantInStock } from '@/services/products'
import { PRIMARY_ATTRIBUTE_KEYS } from './variantDraft'
import { Check, Minus, Pencil, Trash2, Layers } from 'lucide-vue-next'
import PosRowMenu from '@/components/pos/PosRowMenu.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { formatMoney, formatCount } from '@/utils/formatMoney'

const { t } = useI18n()

const props = defineProps<{
  variants: Product[]
  canManage?: boolean
  stockDraft?: Record<string, string>
  stockState?: Record<string, 'idle' | 'saving' | 'error'>
}>()

const emit = defineEmits<{
  'update:stockDraft': [value: Record<string, string>]
  'save-stock': [variant: Product]
  edit: [variantId: string]
  delete: [variantId: string]
}>()

const extraKeys = computed(() => {
  const keys = new Set<string>()
  for (const variant of props.variants) {
    for (const key of Object.keys(variant.attributes ?? {})) {
      if (!(PRIMARY_ATTRIBUTE_KEYS as readonly string[]).includes(key)) keys.add(key)
    }
  }
  return [...keys].sort()
})

function attr(variant: Product, key: string): string {
  return variant.attributes?.[key] || t('common.emDash')
}

function patchStock(id: string, value: string) {
  emit('update:stockDraft', { ...(props.stockDraft ?? {}), [id]: value })
}
</script>

<template>
  <div v-if="variants.length" class="-mx-6 overflow-x-auto">
    <table class="pos-table min-w-[760px]">
      <thead>
        <tr>
          <th scope="col" class="ps-6">{{ t('admin.variant.color') }}</th>
          <th scope="col">{{ t('admin.variant.size') }}</th>
          <th v-for="key in extraKeys" :key="key" scope="col" class="capitalize">{{ key }}</th>
          <th scope="col" class="pos-cell-num">{{ t('admin.variant.cost') }}</th>
          <th scope="col" class="pos-cell-num">{{ t('admin.variant.price') }}</th>
          <th scope="col" class="pos-cell-num">{{ t('admin.variant.margin') }}</th>
          <th scope="col">{{ t('admin.variant.stock') }}</th>
          <th scope="col" class="text-center">{{ t('admin.variant.online') }}</th>
          <th scope="col" class="text-center">{{ t('admin.variant.active') }}</th>
          <th v-if="canManage" scope="col" class="pos-cell-actions pe-6"><span class="sr-only">{{ t('common.actions') }}</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="variant in variants" :key="variant.id" :class="variantInStock(variant) ? '' : 'opacity-70'">
          <td class="ps-6">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="font-medium text-pos-ink">{{ attr(variant, 'color') }}</span>
              <span v-if="variant.galatkProductRef" class="pos-badge-neutral h-5 px-2 text-[11px]">{{ t('admin.variant.factoryBadge') }}</span>
              <span v-if="!variantInStock(variant)" class="pos-badge-err h-5 px-2 text-[11px]">{{ t('admin.variant.unavailable') }}</span>
            </div>
          </td>
          <td class="text-pos-ink-2">{{ attr(variant, 'size') }}</td>
          <td v-for="key in extraKeys" :key="`${variant.id}-${key}`" class="text-pos-ink-2">{{ attr(variant, key) }}</td>
          <td class="pos-cell-num text-pos-muted">{{ formatMoney(variant.unitCost) }}</td>
          <td class="pos-cell-num font-medium text-pos-ink">{{ formatMoney(variant.sellPrice) }}</td>
          <td class="pos-cell-num text-pos-ink-2">{{ formatMarginPercent(variant.sellPrice, variant.unitCost) }}</td>
          <td>
            <div v-if="canManage && stockDraft" class="relative w-24">
              <input
                :value="stockDraft[variant.id]"
                type="number"
                inputmode="numeric"
                min="0"
                step="1"
                class="pos-input h-9 pos-num"
                :class="stockState?.[variant.id] === 'error' ? 'border-pos-err' : ''"
                :disabled="stockState?.[variant.id] === 'saving'"
                :aria-label="t('admin.variant.stockFor', { name: `${attr(variant, 'color')} ${attr(variant, 'size')}` })"
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
          <td v-if="canManage" class="pos-cell-actions pe-6">
            <div class="flex items-center justify-end gap-1">
              <button type="button" class="pos-icon-btn h-9 w-9" :aria-label="t('common.edit')" :title="t('common.edit')" @click="emit('edit', variant.id)">
                <Pencil class="h-4 w-4" />
              </button>
              <PosRowMenu :label="t('pos.table.moreActions')">
                <button type="button" role="menuitem" class="pos-menu-item" @click="emit('edit', variant.id)">
                  <Pencil class="h-4 w-4 text-pos-muted" />
                  {{ t('common.edit') }}
                </button>
                <div class="my-1 h-px bg-pos-line" role="separator" />
                <button type="button" role="menuitem" class="pos-menu-item pos-menu-item-danger" @click="emit('delete', variant.id)">
                  <Trash2 class="h-4 w-4" />
                  {{ t('common.delete') }}
                </button>
              </PosRowMenu>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <PosEmptyState v-else :icon="Layers" :title="t('admin.variant.empty')" compact />
</template>
