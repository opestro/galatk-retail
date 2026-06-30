<script setup lang="ts">
import Skeleton from './Skeleton.vue'

const { count = 3 } = defineProps<{ count?: number }>()
</script>

<template>
  <div class="grid gap-6 md:grid-cols-3" role="status">
    <span class="sr-only">Loading…</span>
    <div v-for="i in count" :key="i" class="card flex flex-col gap-3">
      <Skeleton height="h-4" width="w-1/2" />
      <Skeleton height="h-8" width="w-1/3" />
    </div>
  </div>
</template>
