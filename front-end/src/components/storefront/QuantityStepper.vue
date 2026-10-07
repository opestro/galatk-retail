<script setup lang="ts">
import { Minus, Plus } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    label?: string
    size?: 'md' | 'sm'
  }>(),
  { min: 1, max: 99, size: 'md' },
)

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function set(value: number) {
  emit('update:modelValue', Math.min(props.max, Math.max(props.min, value)))
}
</script>

<template>
  <div
    class="inline-flex items-stretch border border-ink/25"
    :class="size === 'sm' ? 'h-10' : 'h-[3.25rem]'"
    role="group"
    :aria-label="label ?? $t('shop.cart.qtyLabel')"
  >
    <button
      type="button"
      class="flex cursor-pointer items-center justify-center text-ink transition-opacity hover:opacity-60 disabled:cursor-not-allowed disabled:opacity-30"
      :class="size === 'sm' ? 'w-9' : 'w-11'"
      :disabled="modelValue <= min"
      :aria-label="$t('shop.cart.decrease')"
      @click="set(modelValue - 1)"
    >
      <Minus class="h-3.5 w-3.5" />
    </button>
    <output class="sf-figure flex min-w-8 items-center justify-center text-sm text-ink" aria-live="polite">
      {{ modelValue }}
    </output>
    <button
      type="button"
      class="flex cursor-pointer items-center justify-center text-ink transition-opacity hover:opacity-60 disabled:cursor-not-allowed disabled:opacity-30"
      :class="size === 'sm' ? 'w-9' : 'w-11'"
      :disabled="modelValue >= max"
      :aria-label="$t('shop.cart.increase')"
      @click="set(modelValue + 1)"
    >
      <Plus class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
