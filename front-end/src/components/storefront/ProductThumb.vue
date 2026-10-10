<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/** Small product image with an initial-letter fallback for missing or broken photos. */
const props = withDefaults(
  defineProps<{
    src?: string | null
    name: string
    /** `sand` reads against cream panels (order summaries). */
    surface?: 'cream' | 'sand'
  }>(),
  { surface: 'cream' },
)

const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)

const initial = computed(() => props.name.trim().charAt(0).toUpperCase())
</script>

<template>
  <span class="flex h-full w-full items-center justify-center overflow-hidden" :class="surface === 'sand' ? 'bg-sand/70' : 'bg-cream'">
    <img
      v-if="src && !failed"
      :src="src"
      alt=""
      loading="lazy"
      decoding="async"
      class="h-full w-full object-cover"
      @error="failed = true"
    />
    <span v-else class="font-display text-2xl font-light text-taupe/60" aria-hidden="true">{{ initial }}</span>
  </span>
</template>
