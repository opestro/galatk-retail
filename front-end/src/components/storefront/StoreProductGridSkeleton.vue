<script setup lang="ts">
defineProps<{
  count?: number
}>()
</script>

<template>
  <div class="sf-grid" role="status">
    <span class="sr-only">{{ $t('shop.catalog.loading') }}</span>
    <div v-for="i in count ?? 8" :key="i" aria-hidden="true">
      <div class="sf-skeleton aspect-[3/4]" />
      <div class="mt-4">
        <div class="sf-skeleton h-3 w-3/4" />
        <div class="sf-skeleton mt-2.5 h-3 w-1/3" />
        <div class="sf-skeleton mt-3 h-3 w-16" />
      </div>
    </div>
  </div>
</template>
