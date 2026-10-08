<script setup lang="ts">
import { CheckCircle2, AlertCircle, X } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
    aria-live="polite"
    role="status"
  >
    <TransitionGroup name="pos-list">
      <div v-for="toast in toasts" :key="toast.id" class="pos-toast">
        <CheckCircle2 v-if="toast.tone === 'success'" class="mt-px h-4 w-4 shrink-0 text-[#86efac]" />
        <AlertCircle v-else class="mt-px h-4 w-4 shrink-0 text-[#fca5a5]" />
        <span class="flex-1">{{ toast.message }}</span>
        <button type="button" class="-me-1 -mt-0.5 rounded-md p-0.5 text-white/60 hover:text-white" :aria-label="$t('common.close')" @click="dismiss(toast.id)">
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
