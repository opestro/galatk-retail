<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle, Tags } from 'lucide-vue-next'
import type { Product } from '@/types/api'
import { compareSizes } from '@/services/products'
import { formatCount } from '@/utils/formatMoney'

type Rule = 'all' | 'size' | 'color'

interface Group {
  key: string
  label: string
  variants: Product[]
}

const { t } = useI18n()

const props = defineProps<{ variants: Product[]; busy?: boolean }>()
const emit = defineEmits<{ apply: [changes: { id: string; sellPrice: number }[]] }>()

const rule = ref<Rule>('all')
// One text value per group key. Empty = leave that group untouched.
const draft = ref<Record<string, string>>({})

const RULES: { value: Rule; label: string; hint: string }[] = [
  { value: 'all', label: 'admin.pricing.ruleAll', hint: 'admin.pricing.hintAll' },
  { value: 'size', label: 'admin.pricing.ruleSize', hint: 'admin.pricing.hintSize' },
  { value: 'color', label: 'admin.pricing.ruleColor', hint: 'admin.pricing.hintColor' },
]

function groupBy(attribute: 'size' | 'color', emptyLabel: string): Group[] {
  const map = new Map<string, Group>()
  for (const variant of props.variants) {
    const raw = (variant.attributes?.[attribute] ?? '').trim()
    const key = raw.toLowerCase()
    const group = map.get(key)
    if (group) group.variants.push(variant)
    else map.set(key, { key, label: raw || emptyLabel, variants: [variant] })
  }
  return [...map.values()]
}

const sizeGroups = computed(() => groupBy('size', t('admin.variant.noSize')).sort((a, b) => compareSizes(a.key, b.key)))
const colorGroups = computed(() => groupBy('color', t('admin.variant.noColor')))

/** Number-type inputs hand back numbers (or ''), so accept both. Empty/invalid -> null. */
function num(raw: unknown): number | null {
  const text = String(raw ?? '').trim()
  if (!text) return null
  const value = Number(text)
  return Number.isFinite(value) && value >= 0 ? value : null
}

const filled = (raw: unknown) => String(raw ?? '').trim() !== ''

const groups = computed<Group[]>(() => {
  if (rule.value === 'all') {
    return [{ key: 'all', label: t('admin.pricing.wholeProduct'), variants: props.variants }]
  }
  return rule.value === 'size' ? sizeGroups.value : colorGroups.value
})

/** The shared price of a group, or null when its variants disagree. */
function currentPrice(group: Group): number | null {
  const prices = new Set(group.variants.map((v) => Number(v.sellPrice)))
  return prices.size === 1 ? [...prices][0]! : null
}

// Start from the current prices whenever the rule or the data changes.
watch(
  [rule, () => props.variants],
  () => {
    const next: Record<string, string> = {}
    for (const group of groups.value) {
      const price = currentPrice(group)
      next[group.key] = price === null ? '' : String(price)
    }
    draft.value = next
  },
  { immediate: true },
)

const changes = computed(() => {
  const out: { id: string; sellPrice: number }[] = []
  for (const group of groups.value) {
    const price = num(draft.value[group.key])
    if (price === null) continue
    for (const variant of group.variants) {
      if (Number(variant.sellPrice) !== price) out.push({ id: variant.id, sellPrice: price })
    }
  }
  return out
})

const belowCost = computed(() => {
  const next = new Map(changes.value.map((c) => [c.id, c.sellPrice]))
  return props.variants.filter((v) => next.has(v.id) && next.get(v.id)! < Number(v.unitCost)).length
})

function rowState(group: Group): 'ok' | 'invalid' {
  const raw = draft.value[group.key]
  return filled(raw) && num(raw) === null ? 'invalid' : 'ok'
}

const hasInvalid = computed(() => groups.value.some((g) => rowState(g) === 'invalid'))
const activeHint = computed(() => RULES.find((r) => r.value === rule.value)!.hint)

function submit() {
  if (changes.value.length && !hasInvalid.value) emit('apply', changes.value)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="section-title flex items-center gap-2"><Tags class="h-4 w-4 text-pos-muted" aria-hidden="true" />{{ t('admin.pricing.title') }}</h2>
        <p class="mt-0.5 text-[12.5px] text-pos-muted">{{ t(activeHint) }}</p>
      </div>
      <div class="inline-flex rounded-xl bg-pos-line/40 p-1" role="radiogroup" :aria-label="t('admin.pricing.title')">
        <button
          v-for="r in RULES"
          :key="r.value"
          type="button"
          role="radio"
          :aria-checked="rule === r.value"
          class="h-8 rounded-lg px-3 text-[13px] font-medium transition-colors"
          :class="rule === r.value ? 'bg-white text-pos-ink shadow-sm' : 'text-pos-muted hover:text-pos-ink'"
          @click="rule = r.value"
        >
          {{ t(r.label) }}
        </button>
      </div>
    </div>

    <ul class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      <li
        v-for="group in groups"
        :key="`${rule}-${group.key}`"
        class="flex items-center gap-3 rounded-xl border border-pos-line px-3 py-2"
        :class="rowState(group) === 'invalid' ? 'border-pos-err' : ''"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate text-[13.5px] font-semibold text-pos-ink">{{ group.label }}</p>
          <p class="text-[12px] text-pos-muted">
            {{ t('admin.pricing.variantCount', { n: formatCount(group.variants.length) }, group.variants.length) }}
          </p>
        </div>
        <div class="relative w-32 shrink-0">
          <input
            v-model="draft[group.key]"
            type="number"
            inputmode="decimal"
            min="0"
            step="any"
            class="pos-input h-9 pos-num pe-12"
            :placeholder="currentPrice(group) === null ? t('admin.pricing.mixed') : ''"
            :aria-label="t('admin.pricing.priceFor', { name: group.label })"
            @keydown.enter="submit"
          />
          <span class="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[12px] text-pos-faint">{{ t('common.currency') }}</span>
        </div>
      </li>
    </ul>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <p v-if="belowCost" class="flex items-center gap-1.5 text-[12.5px] text-amber-700" role="status">
        <AlertTriangle class="h-4 w-4" aria-hidden="true" />
        {{ t('admin.pricing.belowCost', { n: formatCount(belowCost) }, belowCost) }}
      </p>
      <p v-else class="text-[12.5px] text-pos-muted" aria-live="polite">
        {{ changes.length ? t('admin.pricing.willChange', { n: formatCount(changes.length) }, changes.length) : t('admin.pricing.noChange') }}
      </p>
      <button type="button" class="pos-btn-primary ms-auto" :disabled="busy || hasInvalid || !changes.length" @click="submit">
        <span v-if="busy" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
        {{ t('admin.pricing.apply') }}
      </button>
    </div>
  </div>
</template>
