<script setup lang="ts">
import Skeleton from './Skeleton.vue'

const { rows = 6 } = defineProps<{ rows?: number }>()
</script>

<template>
  <div class="list-panel overflow-hidden" role="status">
    <span class="sr-only">Loading…</span>
    <div class="flex gap-4 border-b border-gray-200 bg-gray-50 px-5 py-3">
      <Skeleton height="h-4" width="w-1/3" />
      <Skeleton height="h-4" width="w-1/4" />
      <Skeleton height="h-4" width="w-1/6" />
    </div>
    <div v-for="i in rows" :key="i" class="flex items-center gap-4 px-5 py-4">
      <Skeleton height="h-4" width="w-1/3" />
      <Skeleton height="h-4" width="w-1/4" />
      <Skeleton height="h-4" width="w-1/6" />
    </div>
  </div>
</template>
