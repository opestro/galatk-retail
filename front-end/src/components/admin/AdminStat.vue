<script setup lang="ts">
import type { Component } from 'vue'

/** KPI tile: soft icon well, small label, large tabular figure, optional hint. */
withDefaults(
  defineProps<{
    label: string
    value: string
    /** Unit shown smaller after the figure (e.g. the currency). */
    unit?: string
    icon?: Component
    tone?: 'neutral' | 'ok' | 'warn' | 'err'
    hint?: string
  }>(),
  { tone: 'neutral', unit: '', hint: '' },
)

const WELLS = {
  neutral: 'bg-pos-canvas text-pos-ink-2',
  ok: 'bg-pos-ok-bg text-pos-ok',
  warn: 'bg-pos-warn-bg text-pos-warn',
  err: 'bg-pos-err-bg text-pos-err',
}
</script>

<template>
  <div class="pos-surface flex items-start gap-4 p-5">
    <span v-if="icon" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" :class="WELLS[tone]">
      <component :is="icon" class="h-[18px] w-[18px]" />
    </span>
    <div class="min-w-0">
      <p class="truncate text-[12.5px] font-medium text-pos-muted">{{ label }}</p>
      <p class="mt-1 flex items-baseline gap-1.5 text-pos-ink">
        <span class="truncate text-[22px] leading-tight font-semibold tracking-[-0.02em] pos-num">{{ value }}</span>
        <span v-if="unit" class="text-[12px] font-medium text-pos-muted">{{ unit }}</span>
      </p>
      <p v-if="hint" class="mt-1 text-[12px] text-pos-muted">{{ hint }}</p>
    </div>
  </div>
</template>
