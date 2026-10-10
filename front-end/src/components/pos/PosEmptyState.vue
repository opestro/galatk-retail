<script setup lang="ts">
import type { Component } from 'vue'

/** Quiet empty state: soft icon medallion, one line of title, one of guidance. */
defineProps<{
  icon: Component
  title: string
  body?: string
  compact?: boolean
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center" :class="compact ? 'gap-2 py-8' : 'gap-3 py-16'">
    <div class="relative mb-1 flex items-center justify-center" aria-hidden="true">
      <span class="absolute h-20 w-20 rounded-full bg-pos-canvas" />
      <span class="absolute h-14 w-14 rounded-full bg-white" style="box-shadow: var(--pos-shadow-sm) !important" />
      <span class="relative flex h-20 w-20 items-center justify-center">
        <component :is="icon" class="h-6 w-6 text-pos-faint" />
      </span>
    </div>
    <p class="text-[14px] font-medium text-pos-ink">{{ title }}</p>
    <p v-if="body" class="max-w-64 text-[13px] leading-relaxed text-pos-muted">{{ body }}</p>
    <slot />
  </div>
</template>
