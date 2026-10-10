<script setup lang="ts">
</script>

<template>
  <div class="grid gap-10 lg:grid-cols-12 lg:gap-16" role="status">
    <span class="sr-only">{{ $t('shop.product.loading') }}</span>
    <div class="flex gap-3 lg:col-span-7" aria-hidden="true">
      <div class="hidden w-20 shrink-0 flex-col gap-3 md:flex">
        <div v-for="i in 4" :key="i" class="sf-skeleton aspect-[3/4]" />
      </div>
      <div class="sf-skeleton aspect-[3/4] flex-1" />
    </div>
    <div class="flex flex-col gap-5 lg:col-span-5 lg:pt-6" aria-hidden="true">
      <div class="sf-skeleton h-3 w-24" />
      <div class="sf-skeleton h-10 w-3/4" />
      <div class="sf-skeleton h-5 w-28" />
      <div class="sf-skeleton mt-4 h-4 w-full" />
      <div class="sf-skeleton h-4 w-2/3" />
      <div class="mt-4 flex gap-2">
        <div v-for="i in 4" :key="i" class="sf-skeleton h-11 w-14" />
      </div>
      <div class="sf-skeleton mt-4 h-12 w-full" />
    </div>
  </div>
</template>
