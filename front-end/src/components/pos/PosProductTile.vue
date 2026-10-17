<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Shirt } from 'lucide-vue-next'
import { formatCount } from '@/utils/formatMoney'

/** Catalog tile: photo (or icon fallback), title, subtitle, stock and price. */
const props = defineProps<{
  title: string
  subtitle: string
  price: string
  stock: number
  imageUrl?: string | null
  /** Units of this tile already in the cart (variant tiles). */
  inCart?: number
  highlighted?: boolean
  /** Tighter tile for variant grids. */
  dense?: boolean
}>()

const { t } = useI18n()
const LOW_STOCK = 3

const stockPill = computed(() => (props.stock <= 0 ? 'pos-pill-out' : props.stock <= LOW_STOCK ? 'pos-pill-low' : 'pos-pill-ok'))
const stockLabel = computed(() => {
  const n = formatCount(props.stock)
  if (props.stock <= 0) return t('pos.register.outOfStock')
  return props.stock <= LOW_STOCK ? t('pos.register.lowStock', { n }) : t('pos.register.stock', { n })
})

const failed = ref(false)
watch(
  () => props.imageUrl,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <button type="button" class="pos-tile group" :data-highlight="highlighted ? 'true' : undefined">
    <div
      class="relative flex w-full items-center justify-center overflow-hidden bg-pos-sunken"
      :class="dense ? 'aspect-[16/10]' : 'aspect-[4/3]'"
    >
      <img
        v-if="imageUrl && !failed"
        :src="imageUrl"
        alt=""
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-pos)] group-hover:scale-[1.03]"
        @error="failed = true"
      />
      <span v-else class="flex h-12 w-12 items-center justify-center rounded-full bg-white" style="box-shadow: var(--pos-shadow-sm) !important">
        <Shirt class="h-5 w-5 text-pos-faint" aria-hidden="true" />
      </span>

      <span class="absolute start-2.5 top-2.5" :class="stockPill">
        <span class="pos-dot" aria-hidden="true" />
        {{ stockLabel }}
      </span>

      <span
        v-if="inCart"
        :key="inCart"
        class="pos-bump absolute end-2.5 top-2.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-pos-accent px-2 text-[12px] font-semibold text-white pos-num shadow-md"
        :aria-label="$t('pos.register.inCart', { n: inCart })"
      >
        {{ formatCount(inCart) }}
      </span>
    </div>

    <div class="flex w-full flex-1 flex-col gap-0.5" :class="dense ? 'p-3' : 'p-4'">
      <p class="truncate text-[15px] font-medium text-pos-ink">{{ title }}</p>
      <p class="truncate text-[13px] text-pos-muted">{{ subtitle }}</p>
      <p class="pos-price mt-2">{{ price }}</p>
    </div>
  </button>
</template>
