<script setup lang="ts">
import { computed } from 'vue'

/** Soft status chip. Tone follows the status; the label is already translated. */
const props = defineProps<{
  status: string
  label: string
}>()

const TONES: Record<string, string> = {
  COMPLETED: 'pos-badge-ok',
  PAID: 'pos-badge-ok',
  PLACED: 'pos-badge-warn',
  PARTIAL: 'pos-badge-warn',
  CREDIT: 'pos-badge-warn',
  CANCELLED: 'pos-badge-err',
}

const tone = computed(() => TONES[props.status] ?? 'pos-badge-neutral')
</script>

<template>
  <span :class="tone">
    <span class="pos-dot" aria-hidden="true" />
    {{ label }}
  </span>
</template>
