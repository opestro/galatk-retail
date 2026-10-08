<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertCircle } from 'lucide-vue-next'
import PosModal from '@/components/pos/PosModal.vue'
import VariantForm, { type VariantDraft } from './VariantForm.vue'

const { t } = useI18n()

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
  <PosModal :title="title" @close="emit('cancel')">
    <form id="variant-form" class="flex flex-col gap-4" @submit.prevent="emit('submit')">
      <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">
        <AlertCircle class="mt-px h-4 w-4 shrink-0" />
        {{ error }}
      </p>
      <VariantForm
        v-model="draft"
        stacked
        :extra-colors="extraColors"
        :extra-sizes="extraSizes"
        :show-quantity="showQuantity"
        :quantity-label="quantityLabel"
      />
      <p v-if="quantityHint" class="pos-field-hint">{{ quantityHint }}</p>
    </form>
    <template #footer>
      <button type="button" class="pos-btn-ghost" :disabled="submitting" @click="emit('cancel')">{{ t('common.cancel') }}</button>
      <button type="submit" form="variant-form" class="pos-btn-primary" :disabled="submitting">
        <span v-if="submitting" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
        {{ submitting ? t('common.saving') : (submitLabel ?? t('common.save')) }}
      </button>
    </template>
  </PosModal>
</template>
