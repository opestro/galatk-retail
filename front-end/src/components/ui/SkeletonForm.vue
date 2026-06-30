<script setup lang="ts">
import Skeleton from './Skeleton.vue'

const { fields = 4 } = defineProps<{ fields?: number }>()
</script>

<template>
  <div class="card flex max-w-lg flex-col gap-4" role="status">
    <span class="sr-only">Loading…</span>
    <Skeleton v-for="i in fields" :key="i" height="h-10" width="w-full" />
    <Skeleton height="h-10" width="w-32" />
  </div>
</template>
