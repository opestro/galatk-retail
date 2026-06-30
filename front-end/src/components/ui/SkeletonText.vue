<script setup lang="ts">
import Skeleton from './Skeleton.vue'

const { lines = 3 } = defineProps<{ lines?: number }>()
</script>

<template>
  <div class="flex flex-col gap-2" role="status">
    <span class="sr-only">Loading…</span>
    <Skeleton v-for="i in lines" :key="i" :height="i === lines ? 'h-3' : 'h-4'" :width="i === lines ? 'w-2/3' : 'w-full'" />
  </div>
</template>
