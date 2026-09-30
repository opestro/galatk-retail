<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Product } from '@/types/api'
import { formatMarginPercent, variantInStock } from '@/services/products'
import { PRIMARY_ATTRIBUTE_KEYS } from './variantDraft'

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

const colCount = computed(() => 8 + extraKeys.value.length + (props.canManage ? 1 : 0))

function attr(variant: Product, key: string): string {
  return variant.attributes?.[key] || t('common.emDash')
}

function patchStock(id: string, value: string) {
  emit('update:stockDraft', { ...(props.stockDraft ?? {}), [id]: value })
}
</script>

<template>
  <div class="max-h-[28rem] overflow-auto rounded-lg border border-gray-200">
    <table class="min-w-full text-sm">
      <thead class="sticky top-0 bg-gray-50 text-start text-xs font-semibold uppercase tracking-wide text-gray-500">
        <tr>
          <th class="px-4 py-2">{{ t('admin.variant.color') }}</th>
          <th class="px-4 py-2">{{ t('admin.variant.size') }}</th>
          <th v-for="key in extraKeys" :key="key" class="px-4 py-2 capitalize">{{ key }}</th>
          <th class="px-4 py-2">{{ t('admin.variant.cost') }}</th>
          <th class="px-4 py-2">{{ t('admin.variant.price') }}</th>
          <th class="px-4 py-2">{{ t('admin.variant.margin') }}</th>
          <th class="px-4 py-2">{{ t('admin.variant.stock') }}</th>
          <th class="px-4 py-2">{{ t('admin.variant.online') }}</th>
          <th class="px-4 py-2">{{ t('admin.variant.active') }}</th>
          <th v-if="canManage" class="px-4 py-2">{{ t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white">
        <tr v-if="variants.length === 0">
          <td :colspan="colCount" class="px-4 py-8 text-center text-gray-500">
            {{ t('admin.variant.empty') }}
          </td>
        </tr>
        <tr
          v-for="variant in variants"
          :key="variant.id"
          :class="variantInStock(variant) ? '' : 'bg-gray-50 text-gray-500'"
        >
          <td class="px-4 py-3 font-medium text-gray-900">
            {{ attr(variant, 'color') }}
            <span
              v-if="variant.galatkProductRef"
              class="ms-2 rounded-full border border-gray-300 px-2 py-0.5 text-xs font-normal text-gray-600"
            >
              {{ t('admin.variant.factoryBadge') }}
            </span>
            <span
              v-if="!variantInStock(variant)"
              class="ms-2 rounded-full border border-gray-300 px-2 py-0.5 text-xs font-normal text-gray-600"
            >
              {{ t('admin.variant.unavailable') }}
            </span>
          </td>
          <td class="px-4 py-3">{{ attr(variant, 'size') }}</td>
          <td v-for="key in extraKeys" :key="`${variant.id}-${key}`" class="px-4 py-3">
            {{ attr(variant, key) }}
          </td>
          <td class="px-4 py-3 tabular-nums">{{ variant.unitCost }}</td>
          <td class="px-4 py-3 tabular-nums">{{ variant.sellPrice }}</td>
          <td class="px-4 py-3 tabular-nums">{{ formatMarginPercent(variant.sellPrice, variant.unitCost) }}</td>
          <td class="px-4 py-3">
            <input
              v-if="canManage && stockDraft"
              :value="stockDraft[variant.id]"
              type="number"
              min="0"
              step="1"
              class="input w-24"
              :disabled="stockState?.[variant.id] === 'saving'"
              @input="patchStock(variant.id, ($event.target as HTMLInputElement).value)"
              @keydown.enter="emit('save-stock', variant)"
              @blur="emit('save-stock', variant)"
            />
            <span v-else class="tabular-nums">{{ variant.shopQuantity ?? 0 }}</span>
          </td>
          <td class="px-4 py-3">{{ variant.availableOnline ? '✓' : t('common.emDash') }}</td>
          <td class="px-4 py-3">{{ variant.isActive ? '✓' : t('common.emDash') }}</td>
          <td v-if="canManage" class="px-4 py-3">
            <div class="flex flex-wrap gap-2">
              <button type="button" class="text-sm text-gray-700 underline" @click="emit('edit', variant.id)">
                {{ t('common.edit') }}
              </button>
              <button type="button" class="text-sm text-red-600 underline" @click="emit('delete', variant.id)">
                {{ t('common.delete') }}
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
