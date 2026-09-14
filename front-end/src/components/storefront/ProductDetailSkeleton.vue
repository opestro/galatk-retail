<script setup lang="ts">
import Skeleton from '@/components/ui/Skeleton.vue'
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-2" role="status">
    <span class="sr-only">Loading product…</span>
    <div class="flex flex-col gap-3">
      <Skeleton height="h-80" rounded="rounded-xl" />
      <div class="flex gap-2">
        <Skeleton height="h-16" width="w-16" />
        <Skeleton height="h-16" width="w-16" />
        <Skeleton height="h-16" width="w-16" />
      </div>
    </div>
    <div class="flex flex-col gap-4">
      <Skeleton height="h-8" width="w-1/2" />
      <Skeleton height="h-4" width="w-full" />
      <Skeleton height="h-4" width="w-3/4" />
      <Skeleton height="h-6" width="w-1/3" />
      <div class="flex gap-2">
        <Skeleton height="h-10" width="w-20" rounded="rounded-full" />
        <Skeleton height="h-10" width="w-20" rounded="rounded-full" />
      </div>
      <div class="flex gap-2">
        <Skeleton height="h-10" width="w-12" rounded="rounded-full" />
        <Skeleton height="h-10" width="w-12" rounded="rounded-full" />
        <Skeleton height="h-10" width="w-12" rounded="rounded-full" />
      </div>
      <Skeleton height="h-12" />
    </div>
  </div>
</template>
