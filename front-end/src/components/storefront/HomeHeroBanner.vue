<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { mediaUrl } from '@/services/products'
import type { SiteBannerImage } from '@/types/api'

const props = defineProps<{
  enabled: boolean
  title: string
  subtitle: string
  images: SiteBannerImage[]
  intervalMs: number
}>()

const index = ref(0)
const reduceMotion = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const slides = computed(() => props.images.filter((image) => Boolean(image.url)))
const hasSlides = computed(() => slides.value.length > 0)
const canRotate = computed(() => slides.value.length > 1)

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
  if (!canRotate.value || reduceMotion.value) return
  const wait = Math.max(2000, props.intervalMs || 5000)
  timer = setInterval(() => {
    goTo(index.value + 1)
  }, wait)
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
  startTimer()
})

onUnmounted(clearTimer)
</script>

<template>
  <section
    v-if="enabled"
    class="overflow-hidden border-b border-gray-200"
    aria-label="Store banner"
    @mouseenter="clearTimer"
    @mouseleave="startTimer"
  >
    <!-- Compact strip; uploads stay 16:9 (YouTube 2560×1440). Center of the image is shown. -->
    <div
      v-if="hasSlides"
      class="relative w-full overflow-hidden bg-gray-100 h-36 sm:h-44 md:h-52 lg:h-56"
    >
      <img
        v-for="(slide, i) in slides"
        :key="slide.id"
        :src="mediaUrl(slide.url)"
        alt=""
        class="absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-700"
        :class="i === index ? 'opacity-100' : 'opacity-0'"
      />
      <div
        v-if="canRotate"
        class="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-2"
        role="tablist"
        aria-label="Banner slides"
      >
        <button
          v-for="(slide, i) in slides"
          :key="slide.id"
          type="button"
          class="h-2.5 w-2.5 rounded-full border border-white/80"
          :class="i === index ? 'bg-white' : 'bg-white/30'"
          :aria-label="`Show banner ${i + 1}`"
          :aria-selected="i === index"
          role="tab"
          @click="goTo(i); startTimer()"
        />
      </div>
    </div>

    <div v-else class="bg-gradient-to-br from-gray-50 to-gray-100">
      <div class="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div class="text-center">
          <h1 class="text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl">
            {{ title }}
          </h1>
          <p v-if="subtitle" class="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            {{ subtitle }}
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
