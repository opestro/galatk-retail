<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon?: Component
  title: string
  body?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center px-6 py-20 text-center md:py-28">
    <div v-if="icon" class="mb-7 flex h-14 w-14 items-center justify-center border border-line">
      <component :is="icon" class="h-6 w-6 text-taupe" stroke-width="1.25" />
    </div>
    <h2 class="sf-title text-2xl md:text-3xl">{{ title }}</h2>
    <p v-if="body" class="mt-3 max-w-sm text-sm leading-relaxed text-mute">{{ body }}</p>
    <div v-if="$slots.default" class="mt-8 flex flex-wrap items-center justify-center gap-3">
      <slot />
    </div>
  </div>
</template>
