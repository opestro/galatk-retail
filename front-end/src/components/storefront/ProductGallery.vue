<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { PublicCatalogImage } from '@/services/globalStore'
import { mediaUrl } from '@/services/products'

const props = defineProps<{
  images: PublicCatalogImage[]
  productName: string
  selectedId?: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const ordered = computed(() => [...props.images].sort((a, b) => a.sortOrder - b.sortOrder))

const activeIndex = computed(() => {
  const index = ordered.value.findIndex((image) => image.id === props.selectedId)
  return index >= 0 ? index : 0
})
const active = computed(() => ordered.value[activeIndex.value])
const initial = computed(() => props.productName.trim().charAt(0).toUpperCase())

function step(delta: number) {
  const count = ordered.value.length
  if (count < 2) return
  const next = ordered.value[(activeIndex.value + delta + count) % count]
  if (next) emit('select', next.id)
}

/** Mobile swipe carousel: sync the visible slide back to `selectedId`. */
const track = ref<HTMLElement | null>(null)
let scrollFrame = 0
function onTrackScroll() {
  cancelAnimationFrame(scrollFrame)
  scrollFrame = requestAnimationFrame(() => {
    const el = track.value
    if (!el || el.clientWidth === 0) return
    // scrollLeft is negative in RTL; the magnitude gives the slide index either way.
    const index = Math.round(Math.abs(el.scrollLeft) / el.clientWidth)
    const image = ordered.value[index]
    if (image && image.id !== props.selectedId) emit('select', image.id)
  })
}
</script>

<template>
  <div>
    <!-- Mobile: full-bleed swipe carousel -->
    <div class="relative -mx-5 sm:-mx-8 md:hidden">
      <div
        v-if="ordered.length"
        ref="track"
        class="sf-scroll-x flex snap-x snap-mandatory overflow-x-auto"
        @scroll.passive="onTrackScroll"
      >
        <div v-for="(image, i) in ordered" :key="image.id" class="aspect-[3/4] w-full shrink-0 snap-center bg-cream">
          <img
            :src="mediaUrl(image.url)"
            :alt="i === 0 ? productName : `${productName} — ${$t('shop.product.imageOf', { n: i + 1, total: ordered.length })}`"
            :loading="i === 0 ? 'eager' : 'lazy'"
            decoding="async"
            class="h-full w-full object-cover"
          />
        </div>
      </div>
      <div v-else class="flex aspect-[3/4] items-center justify-center bg-cream font-display text-8xl font-light text-taupe/50">
        {{ initial }}
      </div>
      <p
        v-if="ordered.length > 1"
        class="absolute bottom-4 end-4 bg-ivory/90 px-2.5 py-1 text-[11px] font-medium text-ink tabular-nums"
        aria-hidden="true"
      >
        {{ activeIndex + 1 }} / {{ ordered.length }}
      </p>
    </div>

    <!-- Tablet/desktop: thumbnail rail + main image (3:4 portrait, matching product cards) -->
    <div class="hidden gap-4 md:flex">
      <div v-if="ordered.length > 1" class="flex w-20 shrink-0 flex-col gap-3">
        <button
          v-for="(image, i) in ordered"
          :key="image.id"
          type="button"
          class="aspect-[3/4] overflow-hidden bg-cream transition-opacity"
          :class="active?.id === image.id ? 'outline outline-1 outline-offset-2 outline-ink' : 'opacity-60 hover:opacity-100'"
          :aria-label="$t('shop.product.imageOf', { n: i + 1, total: ordered.length })"
          :aria-current="active?.id === image.id"
          @click="emit('select', image.id)"
        >
          <img :src="mediaUrl(image.url)" alt="" loading="lazy" class="h-full w-full object-cover" />
        </button>
      </div>

      <div class="group relative aspect-[3/4] flex-1 overflow-hidden bg-cream">
        <Transition
          enter-active-class="transition-opacity duration-500"
          leave-active-class="transition-opacity duration-300 absolute inset-0"
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
        >
          <img
            v-if="active"
            :key="active.id"
            :src="mediaUrl(active.url)"
            :alt="productName"
            fetchpriority="high"
            class="h-full w-full object-cover"
          />
          <span v-else class="flex h-full w-full items-center justify-center font-display text-9xl font-light text-taupe/50">
            {{ initial }}
          </span>
        </Transition>

        <template v-if="ordered.length > 1">
          <button
            type="button"
            class="absolute start-4 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center bg-ivory/90 text-ink opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            :aria-label="$t('shop.product.previousImage')"
            @click="step(-1)"
          >
            <ChevronLeft class="h-5 w-5 rtl:-scale-x-100" stroke-width="1.25" />
          </button>
          <button
            type="button"
            class="absolute end-4 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center bg-ivory/90 text-ink opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            :aria-label="$t('shop.product.nextImage')"
            @click="step(1)"
          >
            <ChevronRight class="h-5 w-5 rtl:-scale-x-100" stroke-width="1.25" />
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
