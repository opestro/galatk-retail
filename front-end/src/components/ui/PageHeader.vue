<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

/** Page title row: optional back link above, subtitle below, actions at the end. */
defineProps<{
  title?: string
  subtitle?: string
  back?: RouteLocationRaw
  backLabel?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <RouterLink
      v-if="back"
      :to="back"
      class="inline-flex w-fit items-center gap-1.5 rounded-md text-[13px] font-medium text-pos-muted transition-colors hover:text-pos-ink"
    >
      <ArrowLeft class="h-4 w-4 rtl:rotate-180" />
      {{ backLabel }}
    </RouterLink>
    <div class="page-header">
      <div class="min-w-0">
        <h1 v-if="title" class="page-title truncate">{{ title }}</h1>
        <p v-if="subtitle || $slots.subtitle" class="pos-page-sub">
          <slot name="subtitle">{{ subtitle }}</slot>
        </p>
      </div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
