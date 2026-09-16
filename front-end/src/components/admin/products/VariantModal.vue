<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import VariantForm, { type VariantDraft } from './VariantForm.vue'

const props = defineProps<{
  title: string
  modelValue: VariantDraft
  extraColors?: string[]
  extraSizes?: string[]
  quantityLabel?: string
  showQuantity?: boolean
  quantityHint?: string
  submitting?: boolean
  submitLabel?: string
  error?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: VariantDraft]
  cancel: []
  submit: []
}>()

const draft = computed({
  get: () => props.modelValue,
  set: (value: VariantDraft) => emit('update:modelValue', value),
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16" @click.self="emit('cancel')">
    <div class="w-full max-w-lg rounded-lg border border-gray-200 bg-white">
      <header class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ title }}</h2>
        <button type="button" class="rounded-md p-2 text-gray-500 hover:bg-gray-50" aria-label="Close" @click="emit('cancel')">
          <X class="h-5 w-5" />
        </button>
      </header>
      <div class="flex flex-col gap-4 p-5">
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <VariantForm
          v-model="draft"
          stacked
          :extra-colors="extraColors"
          :extra-sizes="extraSizes"
          :show-quantity="showQuantity"
          :quantity-label="quantityLabel"
        />
        <p v-if="quantityHint" class="text-xs text-gray-500">{{ quantityHint }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn-secondary" :disabled="submitting" @click="emit('cancel')">Cancel</button>
          <button type="button" class="btn-primary" :disabled="submitting" @click="emit('submit')">
            {{ submitting ? 'Saving…' : (submitLabel ?? 'Save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
