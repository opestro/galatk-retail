<script setup lang="ts">
import { computed } from 'vue'
import { Calendar } from 'lucide-vue-next'

/**
 * Period picker: one-tap presets plus a custom from/to pair. Emits ISO
 * `YYYY-MM-DD` strings (empty = open-ended) and `change` once per pick.
 */
const range = defineModel<{ from: string; to: string }>({ required: true })
const emit = defineEmits<{ change: [] }>()

type Preset = 'all' | 'today' | '7d' | '30d'

function iso(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function presetRange(preset: Preset): { from: string; to: string } {
  if (preset === 'all') return { from: '', to: '' }
  const today = new Date()
  const from = new Date(today)
  if (preset === '7d') from.setDate(today.getDate() - 6)
  if (preset === '30d') from.setDate(today.getDate() - 29)
  return { from: iso(from), to: iso(today) }
}

const presets: Preset[] = ['all', 'today', '7d', '30d']

const active = computed<Preset | 'custom'>(() => {
  for (const preset of presets) {
    const r = presetRange(preset)
    if (r.from === range.value.from && r.to === range.value.to) return preset
  }
  return 'custom'
})

function pick(preset: Preset) {
  range.value = presetRange(preset)
  emit('change')
}

function setDate(key: 'from' | 'to', value: string) {
  range.value = { ...range.value, [key]: value }
  emit('change')
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <div class="pos-segmented bg-black/[0.045]" role="group" :aria-label="$t('admin.range.label')">
      <button
        v-for="preset in presets"
        :key="preset"
        type="button"
        class="pos-segment"
        :aria-pressed="active === preset"
        @click="pick(preset)"
      >
        {{ $t(`admin.range.${preset}`) }}
      </button>
    </div>
    <div class="flex h-11 items-center gap-1 rounded-xl bg-white ps-3 pe-1" style="box-shadow: inset 0 0 0 1px var(--color-pos-line) !important">
      <Calendar class="h-4 w-4 shrink-0 text-pos-faint" aria-hidden="true" />
      <input
        type="date"
        class="h-9 rounded-lg bg-transparent px-1.5 text-[13px] text-pos-ink pos-num focus:bg-pos-canvas focus:outline-none"
        :value="range.from"
        :max="range.to || undefined"
        :aria-label="$t('admin.range.from')"
        @change="setDate('from', ($event.target as HTMLInputElement).value)"
      />
      <span class="text-pos-faint" aria-hidden="true">–</span>
      <input
        type="date"
        class="h-9 rounded-lg bg-transparent px-1.5 text-[13px] text-pos-ink pos-num focus:bg-pos-canvas focus:outline-none"
        :value="range.to"
        :min="range.from || undefined"
        :aria-label="$t('admin.range.to')"
        @change="setDate('to', ($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>
