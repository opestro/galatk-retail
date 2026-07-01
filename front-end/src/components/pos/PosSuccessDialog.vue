<script setup lang="ts">
import { CheckCircle2, Printer } from 'lucide-vue-next'

defineProps<{
  title: string
  message: string
}>()

const emit = defineEmits<{ close: []; print: [] }>()
</script>

<template>
  <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
    <div class="card flex w-full max-w-sm flex-col items-center gap-4 text-center">
      <div class="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 class="h-8 w-8 text-green-700" />
      </div>
      <div>
        <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
        <p class="mt-1 text-sm text-gray-600">{{ message }}</p>
      </div>
      <div class="flex w-full gap-2">
        <button type="button" class="btn-secondary flex flex-1 items-center justify-center gap-2" @click="emit('print')">
          <Printer class="h-4 w-4" />
          Print receipt
        </button>
        <button type="button" class="btn-primary flex-1" @click="emit('close')">Done</button>
      </div>
    </div>
  </div>
</template>
