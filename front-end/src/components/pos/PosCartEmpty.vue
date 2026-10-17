<script setup lang="ts">
/** Friendly empty-cart illustration: a shopping bag that floats gently (transform-only animation). */
defineProps<{ title: string; body?: string }>()
</script>

<template>
  <div class="flex flex-col items-center gap-2 py-8 text-center">
    <svg class="pos-float h-28 w-28" viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <ellipse cx="60" cy="108" rx="28" ry="5" fill="#6366f1" opacity="0.12" />
      <circle cx="22" cy="30" r="3" fill="#a5b4fc" />
      <circle cx="100" cy="42" r="4" fill="#fcd34d" />
      <path d="M96 20l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#6ee7b7" />
      <path d="M26 44h68l-6 56a8 8 0 0 1-8 7H40a8 8 0 0 1-8-7z" fill="#eef2ff" stroke="#6366f1" stroke-width="3" stroke-linejoin="round" />
      <path d="M46 44v-8a14 14 0 0 1 28 0v8" stroke="#6366f1" stroke-width="3" stroke-linecap="round" />
      <path d="M48 74c3 5 8 8 12 8s9-3 12-8" stroke="#6366f1" stroke-width="3" stroke-linecap="round" />
      <circle cx="49" cy="62" r="2.5" fill="#6366f1" />
      <circle cx="71" cy="62" r="2.5" fill="#6366f1" />
    </svg>
    <p class="text-[14px] font-medium text-pos-ink">{{ title }}</p>
    <p v-if="body" class="max-w-64 text-[13px] leading-relaxed text-pos-muted">{{ body }}</p>
  </div>
</template>
