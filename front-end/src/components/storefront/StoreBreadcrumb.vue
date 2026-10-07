<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

defineProps<{
  items: Array<{ label: string; to?: RouteLocationRaw }>
}>()
</script>

<template>
  <nav :aria-label="$t('shop.breadcrumb.label')">
    <ol class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] tracking-[0.06em] text-mute">
      <li v-for="(item, i) in items" :key="i" class="flex items-center gap-2">
        <RouterLink v-if="item.to && i < items.length - 1" :to="item.to" class="transition-colors hover:text-ink">
          {{ item.label }}
        </RouterLink>
        <span v-else class="text-ink" aria-current="page">{{ item.label }}</span>
        <span v-if="i < items.length - 1" aria-hidden="true" class="text-line">/</span>
      </li>
    </ol>
  </nav>
</template>
