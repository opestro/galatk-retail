<script setup lang="ts">
import Skeleton from '@/components/ui/Skeleton.vue'

defineProps<{
  count?: number
}>()
</script>

<template>
  <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" role="status">
    <span class="sr-only">Loading products…</span>
    <div
      v-for="i in count ?? 8"
      :key="i"
      class="overflow-hidden rounded-xl border border-gray-200 bg-white"
    >
      <Skeleton height="h-48" rounded="rounded-none" />
      <div class="flex flex-col gap-3 p-4">
        <Skeleton height="h-5" width="w-2/3" />
        <Skeleton height="h-4" width="w-1/3" />
        <Skeleton height="h-10" />
      </div>
    </div>
  </div>
</template>
