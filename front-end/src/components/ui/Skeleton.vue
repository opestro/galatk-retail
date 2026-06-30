<script setup lang="ts">
const { width = 'w-full', height = 'h-4', rounded = 'rounded-md' } = defineProps<{
  width?: string
  height?: string
  rounded?: string
}>()
</script>

<template>
  <div class="skeleton" :class="[width, height, rounded]" aria-hidden="true" />
</template>
