<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { DEFAULT_COLORS, DEFAULT_SIZES } from '@/services/products'
import type { VariantDraft } from './variantDraft'

export type { VariantDraft } from './variantDraft'

const { t } = useI18n()

const props = defineProps<{
  modelValue: VariantDraft
  extraColors?: string[]
  extraSizes?: string[]
  showQuantity?: boolean
  quantityLabel?: string
  stacked?: boolean
  layout?: 'row' | 'stacked'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: VariantDraft]
}>()

const colors = computed(() => {
  const extra = (props.extraColors ?? []).filter(Boolean)
  return [...new Set([...DEFAULT_COLORS, ...extra])]
})

const sizes = computed(() => {
  const extra = (props.extraSizes ?? []).filter(Boolean)
  return [...new Set([...DEFAULT_SIZES, ...extra])]
})

const stackedLayout = computed(() => props.stacked || props.layout === 'stacked')
const uid = useId()
const colorListId = computed(() => `variant-colors-${uid}`)
const sizeListId = computed(() => `variant-sizes-${uid}`)

function patch(partial: Partial<VariantDraft>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}
</script>

<template>
  <div class="grid gap-4" :class="stackedLayout ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-6'">
    <label class="pos-field">
      <span class="pos-label">{{ t('admin.variant.color') }}</span>
      <input
        :list="colorListId"
        class="pos-input"
        :value="modelValue.color"
        :placeholder="t('admin.variant.colorPlaceholder')"
        data-autofocus
        @input="patch({ color: ($event.target as HTMLInputElement).value })"
      />
      <datalist :id="colorListId">
        <option v-for="color in colors" :key="color" :value="color" />
      </datalist>
    </label>
    <label class="pos-field">
      <span class="pos-label">{{ t('admin.variant.size') }}</span>
      <input
        :list="sizeListId"
        class="pos-input"
        :value="modelValue.size"
        :placeholder="t('admin.variant.sizePlaceholder')"
        @input="patch({ size: ($event.target as HTMLInputElement).value })"
      />
      <datalist :id="sizeListId">
        <option v-for="size in sizes" :key="size" :value="size" />
      </datalist>
    </label>
    <label class="pos-field">
      <span class="pos-label">{{ t('admin.variant.unitCost') }}</span>
      <span class="relative">
        <input
          :value="modelValue.unitCost"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          class="pos-input pe-12 pos-num"
          @input="patch({ unitCost: ($event.target as HTMLInputElement).value })"
        />
        <span class="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[12px] text-pos-muted">{{ t('common.currency') }}</span>
      </span>
    </label>
    <label class="pos-field">
      <span class="pos-label">{{ t('admin.variant.sellPrice') }}</span>
      <span class="relative">
        <input
          :value="modelValue.sellPrice"
          type="number"
          inputmode="decimal"
          min="0"
          step="0.01"
          class="pos-input pe-12 pos-num"
          @input="patch({ sellPrice: ($event.target as HTMLInputElement).value })"
        />
        <span class="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[12px] text-pos-muted">{{ t('common.currency') }}</span>
      </span>
    </label>
    <label v-if="showQuantity !== false" class="pos-field">
      <span class="pos-label">{{ quantityLabel ?? t('admin.variant.quantity') }}</span>
      <input
        :value="modelValue.quantity"
        type="number"
        inputmode="numeric"
        min="0"
        step="1"
        class="pos-input pos-num"
        @input="patch({ quantity: ($event.target as HTMLInputElement).value })"
      />
    </label>
    <div class="flex flex-col justify-end gap-3 sm:col-span-2">
      <div class="flex items-center justify-between gap-3">
        <span :id="`${uid}-online`" class="text-[14px] text-pos-ink">{{ t('admin.variant.online') }}</span>
        <button
          type="button"
          role="switch"
          class="pos-switch"
          :aria-labelledby="`${uid}-online`"
          :aria-checked="modelValue.availableOnline"
          @click="patch({ availableOnline: !modelValue.availableOnline })"
        />
      </div>
      <div class="flex items-center justify-between gap-3">
        <span :id="`${uid}-active`" class="text-[14px] text-pos-ink">{{ t('admin.variant.active') }}</span>
        <button
          type="button"
          role="switch"
          class="pos-switch"
          :aria-labelledby="`${uid}-active`"
          :aria-checked="modelValue.isActive"
          @click="patch({ isActive: !modelValue.isActive })"
        />
      </div>
    </div>
  </div>
</template>
