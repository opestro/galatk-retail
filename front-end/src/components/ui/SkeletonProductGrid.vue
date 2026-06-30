<script setup lang="ts">
import Skeleton from './Skeleton.vue'

const { count = 6, columns = 2 } = defineProps<{ count?: number; columns?: number }>()
</script>

<template>
  <div
    class="grid gap-4"
    :class="columns === 3 ? 'sm:grid-cols-2 md:grid-cols-3' : 'sm:grid-cols-2'"
    role="status"
  >
    <span class="sr-only">Loading…</span>
    <div v-for="i in count" :key="i" class="card flex flex-col gap-3">
      <Skeleton height="h-5" width="w-2/3" />
      <Skeleton height="h-3" width="w-full" />
      <div class="flex items-center justify-between pt-2">
        <Skeleton height="h-4" width="w-1/4" />
        <Skeleton height="h-8" width="w-16" rounded="rounded-md" />
      </div>
    </div>
  </div>
</template>
