<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, Pause, Play } from 'lucide-vue-next'
import { mediaUrl } from '@/services/products'
import type { SiteBannerImage } from '@/types/api'

const props = withDefaults(
  defineProps<{
    title: string
    subtitle: string
    images: SiteBannerImage[]
    intervalMs: number
    /** Product photography used when no banner images are uploaded. */
    fallbackImages?: string[]
  }>(),
  { fallbackImages: () => [] },
)

const index = ref(0)
const reduceMotion = ref(false)
const paused = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const slides = computed(() => props.images.filter((image) => Boolean(image.url)))
const hasSlides = computed(() => slides.value.length > 0)
const canRotate = computed(() => slides.value.length > 1)
const mosaic = computed(() => (hasSlides.value ? [] : props.fallbackImages.slice(0, 3)))

/** Splits "First part, second part." so the second clause can take the accent colour. */
const titleParts = computed(() => {
  const match = props.title.match(/^(.+?[,،])\s*(.+)$/)
  return match ? [match[1]!, match[2]!] : [props.title, '']
})

function clearTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function goTo(next: number) {
  const count = slides.value.length
  if (count === 0) {
    index.value = 0
    return
  }
  index.value = ((next % count) + count) % count
}

function startTimer() {
  clearTimer()
  if (!canRotate.value || reduceMotion.value || paused.value) return
  const wait = Math.max(2000, props.intervalMs || 5000)
  timer = setInterval(() => {
    goTo(index.value + 1)
  }, wait)
}

function togglePause() {
  paused.value = !paused.value
  startTimer()
}

watch(
  () => [slides.value.length, props.intervalMs] as const,
  () => {
    if (index.value >= slides.value.length) index.value = 0
    startTimer()
  },
)

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  paused.value = reduceMotion.value
  startTimer()
})

onUnmounted(clearTimer)
</script>

<template>
  <section class="relative overflow-hidden bg-cream" :aria-label="$t('shop.hero.ariaBanner')">
    <div class="grid lg:grid-cols-12">
      <!-- Copy -->
      <div
        class="relative z-10 flex flex-col justify-center px-5 py-14 sm:px-8 md:py-20 lg:col-span-5 lg:py-24 lg:ps-12 lg:pe-14 xl:ps-[max(3rem,calc((100vw-90rem)/2+3rem))]"
        :class="hasSlides || mosaic.length ? '' : 'lg:col-span-12 lg:items-center lg:text-center'"
      >
        <p class="sf-eyebrow sf-reveal">{{ $t('shop.hero.eyebrow') }}</p>
        <h1 class="sf-display sf-reveal mt-6 text-[3.1rem] sm:text-7xl xl:text-[6.25rem] rtl:text-[2.6rem] rtl:sm:text-6xl rtl:xl:text-[4.5rem]" style="animation-delay: 80ms">
          {{ titleParts[0] }}
          <span v-if="titleParts[1]" class="block italic text-clay rtl:not-italic">{{ titleParts[1] }}</span>
        </h1>
        <p
          v-if="subtitle"
          class="sf-reveal mt-7 max-w-sm text-[15px] leading-[1.75] text-ink-soft"
          style="animation-delay: 160ms"
        >
          {{ subtitle }}
        </p>
        <div class="sf-reveal mt-10 flex flex-wrap items-center gap-x-10 gap-y-5 lg:mt-12" style="animation-delay: 240ms">
          <RouterLink :to="{ name: 'global-store-shop' }" class="sf-btn">
            {{ $t('shop.hero.primaryCta') }}
          </RouterLink>
          <RouterLink :to="{ name: 'global-store-shop', query: { sort: 'new' } }" class="sf-link">
            {{ $t('shop.hero.secondaryCta') }}
            <ArrowRight class="h-4 w-4 rtl:-scale-x-100" />
          </RouterLink>
        </div>
      </div>

      <!-- Banner slideshow -->
      <div
        v-if="hasSlides"
        class="relative order-first aspect-[4/5] sm:aspect-[16/10] lg:order-none lg:col-span-7 lg:aspect-auto lg:min-h-[min(86dvh,54rem)]"
        @mouseenter="clearTimer"
        @mouseleave="startTimer"
      >
        <img
          v-for="(slide, i) in slides"
          :key="slide.id"
          :src="mediaUrl(slide.url)"
          alt=""
          :loading="i === 0 ? 'eager' : 'lazy'"
          :fetchpriority="i === 0 ? 'high' : 'auto'"
          decoding="async"
          class="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-[1200ms] ease-[var(--ease-store)]"
          :class="i === index ? 'opacity-100' : 'opacity-0'"
        />
        <div v-if="canRotate" class="absolute inset-x-0 bottom-0 z-10 flex items-center justify-end gap-4 bg-gradient-to-t from-black/25 to-transparent px-6 pb-6 pt-16 text-white">
          <div class="flex items-center gap-2" role="tablist" :aria-label="$t('shop.hero.ariaSlides')">
            <button
              v-for="(slide, i) in slides"
              :key="slide.id"
              type="button"
              role="tab"
              class="relative h-[2px] transition-all duration-500"
              :class="i === index ? 'w-10 bg-paper' : 'w-5 bg-paper/45 hover:bg-paper/80'"
              :aria-label="$t('shop.hero.ariaShowSlide', { n: i + 1 })"
              :aria-selected="i === index"
              @click="goTo(i); startTimer()"
            >
              <span class="absolute -inset-y-3 inset-x-0" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-full border border-white/50 text-white transition-colors hover:bg-paper/15"
            :aria-label="paused ? $t('shop.hero.play') : $t('shop.hero.pause')"
            @click="togglePause"
          >
            <Play v-if="paused" class="h-3.5 w-3.5" />
            <Pause v-else class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <!-- Product photography collage when no banner is uploaded -->
      <div
        v-else-if="mosaic.length"
        class="order-first grid gap-1.5 lg:order-none lg:col-span-7 lg:h-[min(86dvh,54rem)] lg:gap-2"
        :class="mosaic.length >= 3 ? 'grid-cols-5 grid-rows-2' : 'grid-cols-1'"
      >
        <img
          v-for="(src, i) in mosaic"
          :key="src"
          :src="src"
          alt=""
          :loading="i === 0 ? 'eager' : 'lazy'"
          decoding="async"
          class="h-full min-h-0 w-full object-cover"
          :class="
            mosaic.length >= 3
              ? i === 0
                ? 'col-span-3 row-span-2 aspect-[4/5] lg:aspect-auto'
                : 'col-span-2 aspect-[4/5] lg:aspect-auto'
              : 'aspect-[4/5] lg:aspect-auto'
          "
        />
      </div>
    </div>
  </section>
</template>
