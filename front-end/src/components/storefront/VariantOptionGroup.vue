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
  <fieldset class="flex flex-col gap-3">
    <legend class="mb-4 flex items-baseline gap-3">
      <span class="sf-eyebrow text-ink">{{ label }}</span>
      <span v-if="modelValue" class="text-[13px] text-mute">{{ modelValue }}</span>
    </legend>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="value in values"
        :key="value"
        type="button"
        :disabled="disabledValues.includes(value)"
        :aria-pressed="modelValue === value"
        class="inline-flex h-11 min-w-12 cursor-pointer items-center justify-center gap-2 border px-4 text-[12.5px] tracking-[0.04em] transition-colors duration-200 disabled:cursor-not-allowed disabled:border-dashed disabled:text-mute/60 disabled:line-through"
        :class="
          modelValue === value
            ? 'border-ink bg-ink text-ivory'
            : 'border-line bg-paper text-ink hover:border-ink'
        "
        @click="emit('update:modelValue', value)"
      >
        <span
          v-if="optionKey === 'color' && colorSwatch(value)"
          class="h-4 w-4 rounded-full border"
          :class="modelValue === value ? 'border-ivory/60' : 'border-black/10'"
          :style="{ backgroundColor: colorSwatch(value) ?? undefined }"
        />
        {{ value }}
      </button>
    </div>
  </fieldset>
</template>
