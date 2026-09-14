<script setup lang="ts">
import { colorSwatch } from '@/utils/colorSwatch'

defineProps<{
  optionKey: string
  label: string
  values: string[]
  modelValue?: string
  disabledValues: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <fieldset class="flex flex-col gap-2">
    <legend class="text-sm font-medium text-gray-900">{{ label }}</legend>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="value in values"
        :key="value"
        type="button"
        :disabled="disabledValues.includes(value)"
        class="inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
        :class="
          modelValue === value
            ? 'border-gray-900 bg-gray-900 text-white'
            : 'border-gray-300 text-gray-800 hover:border-gray-400'
        "
        @click="emit('update:modelValue', value)"
      >
        <span
          v-if="optionKey === 'color' && colorSwatch(value)"
          class="h-3.5 w-3.5 rounded-full border border-black/10"
          :style="{ backgroundColor: colorSwatch(value) ?? undefined }"
        />
        {{ value }}
      </button>
    </div>
  </fieldset>
</template>
