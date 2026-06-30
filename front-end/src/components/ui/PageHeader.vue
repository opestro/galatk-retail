<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <div class="page-header">
    <h2 v-if="title" class="page-title">{{ title }}</h2>
    <slot name="actions" />
  </div>
</template>
