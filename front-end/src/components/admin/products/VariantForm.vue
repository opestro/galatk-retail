<script setup lang="ts">
import { computed, useId } from 'vue'
import { DEFAULT_COLORS, DEFAULT_SIZES } from '@/services/products'

export interface VariantDraft {
  color: string
  size: string
  unitCost: number | string
  sellPrice: number | string
  quantity: number | string
  availableOnline: boolean
  isActive: boolean
}

const props = defineProps<{
  modelValue: VariantDraft
  extraColors?: string[]
  extraSizes?: string[]
  showQuantity?: boolean
  quantityLabel?: string
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

const uid = useId()
const colorListId = computed(() => `variant-colors-${uid}`)
const sizeListId = computed(() => `variant-sizes-${uid}`)

function patch(partial: Partial<VariantDraft>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
    <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
      Color
      <input
        :list="colorListId"
        class="input"
        :value="modelValue.color"
        placeholder="Vert"
        @input="patch({ color: ($event.target as HTMLInputElement).value })"
      />
      <datalist :id="colorListId">
        <option v-for="color in colors" :key="color" :value="color" />
      </datalist>
    </label>
    <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
      Size
      <input
        :list="sizeListId"
        class="input"
        :value="modelValue.size"
        placeholder="M"
        @input="patch({ size: ($event.target as HTMLInputElement).value })"
      />
      <datalist :id="sizeListId">
        <option v-for="size in sizes" :key="size" :value="size" />
      </datalist>
    </label>
    <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
      Unit cost
      <input
        :value="modelValue.unitCost"
        type="number"
        min="0"
        step="0.01"
        class="input"
        @input="patch({ unitCost: ($event.target as HTMLInputElement).value })"
      />
    </label>
    <label class="flex flex-col gap-1 text-xs font-medium text-gray-600">
      Sell price
      <input
        :value="modelValue.sellPrice"
        type="number"
        min="0"
        step="0.01"
        class="input"
        @input="patch({ sellPrice: ($event.target as HTMLInputElement).value })"
      />
    </label>
    <label v-if="showQuantity !== false" class="flex flex-col gap-1 text-xs font-medium text-gray-600">
      {{ quantityLabel ?? 'Quantity' }}
      <input
        :value="modelValue.quantity"
        type="number"
        min="0"
        step="1"
        class="input"
        @input="patch({ quantity: ($event.target as HTMLInputElement).value })"
      />
    </label>
    <div class="flex items-end gap-4 pb-2">
      <label class="inline-flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          class="size-4 rounded border-gray-300"
          :checked="modelValue.availableOnline"
          @change="patch({ availableOnline: ($event.target as HTMLInputElement).checked })"
        />
        Online
      </label>
      <label class="inline-flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          class="size-4 rounded border-gray-300"
          :checked="modelValue.isActive"
          @change="patch({ isActive: ($event.target as HTMLInputElement).checked })"
        />
        Active
      </label>
    </div>
  </div>
</template>
