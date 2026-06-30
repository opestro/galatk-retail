<script setup lang="ts">
import Skeleton from './Skeleton.vue'

const { rows = 5 } = defineProps<{ rows?: number }>()
</script>

<template>
  <div class="list-panel" role="status">
    <span class="sr-only">Loading…</span>
    <div v-for="i in rows" :key="i" class="list-row">
      <div class="flex flex-1 flex-col gap-2">
        <Skeleton height="h-4" width="w-1/3" />
        <Skeleton height="h-3" width="w-1/2" />
      </div>
      <Skeleton height="h-4" width="w-16" />
    </div>
  </div>
</template>
