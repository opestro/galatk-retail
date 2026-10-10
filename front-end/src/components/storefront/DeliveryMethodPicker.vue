<script setup lang="ts" generic="T extends string">
import type { Component } from 'vue'
import { Home, MapPin, Store } from 'lucide-vue-next'

export interface DeliveryMethodOption<V extends string = string> {
  value: V
  label: string
  hint: string
  /** Fee label, e.g. "450 DZD", "Free" or an em dash before a wilaya is chosen. */
  fee: string
}

defineProps<{
  modelValue: T
  options: DeliveryMethodOption<T>[]
  name: string
  legend: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: T] }>()

const icons: Record<string, Component> = { PICKUP: Store, STOPDESK: MapPin, HOME: Home }
</script>

<template>
  <fieldset>
    <legend class="sr-only">{{ legend }}</legend>
    <div class="flex flex-col gap-2">
      <label
        v-for="option in options"
        :key="option.value"
        class="flex cursor-pointer items-center gap-4 border bg-paper px-4 py-4 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink"
        :class="modelValue === option.value ? 'border-ink' : 'border-line hover:border-taupe'"
      >
        <input
          type="radio"
          class="sr-only"
          :name="name"
          :value="option.value"
          :checked="modelValue === option.value"
          @change="emit('update:modelValue', option.value)"
        />
        <span
          class="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border"
          :class="modelValue === option.value ? 'border-ink' : 'border-line'"
          aria-hidden="true"
        >
          <span v-if="modelValue === option.value" class="h-2 w-2 rounded-full bg-ink" />
        </span>
        <component :is="icons[option.value]" v-if="icons[option.value]" class="h-5 w-5 shrink-0 text-taupe" stroke-width="1.25" />
        <span class="min-w-0 flex-1">
          <span class="block text-sm font-medium text-ink">{{ option.label }}</span>
          <span class="block text-xs text-mute">{{ option.hint }}</span>
        </span>
        <span class="shrink-0 text-sm text-ink tabular-nums">{{ option.fee }}</span>
      </label>
    </div>
  </fieldset>
</template>
