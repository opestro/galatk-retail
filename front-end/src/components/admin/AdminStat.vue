<script setup lang="ts">
import type { Component } from 'vue'

/** KPI tile: semantically tinted icon well, small label, large tabular figure, optional hint. */
withDefaults(
  defineProps<{
    label: string
    value: string
    /** Unit shown smaller after the figure (e.g. the currency). */
    unit?: string
    icon?: Component
    /**
     * ok/revenue → emerald · warn → amber · err → rose · credit → violet ·
     * cash (money in) → cyan · expense (money out) → slate.
     */
    tone?: 'neutral' | 'ok' | 'warn' | 'err' | 'credit' | 'cash' | 'expense'
    hint?: string
    /** Position in the grid; drives the staggered entrance (capped so late cards never feel slow). */
    index?: number
  }>(),
  { tone: 'neutral', unit: '', hint: '', index: 0 },
)

const WELLS = {
  neutral: 'bg-slate-100 text-slate-600',
  ok: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60',
  warn: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200/60',
  err: 'bg-rose-50 text-rose-600 ring-1 ring-rose-200/60',
  credit: 'bg-purple-50 text-purple-600 ring-1 ring-purple-200/60',
  cash: 'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-200/60',
  expense: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/70',
}
</script>

<template>
  <div class="pos-surface pos-lift pos-rise flex items-start gap-4 p-5" :style="{ '--i': Math.min(index, 8) }">
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
