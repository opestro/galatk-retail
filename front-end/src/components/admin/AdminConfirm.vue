<script setup lang="ts">
import { ref } from 'vue'
import { AlertTriangle } from 'lucide-vue-next'
import PosModal from '@/components/pos/PosModal.vue'

/**
 * In-app confirmation that replaces `window.confirm` / `prompt`. Destructive
 * confirmations are red; an optional note field is sent with `confirm`.
 */
const props = withDefaults(
  defineProps<{
    title: string
    body?: string
    confirmLabel: string
    danger?: boolean
    busy?: boolean
    /** Show a free-text field (e.g. reason, contact note). */
    noteLabel?: string
    notePlaceholder?: string
    error?: string
  }>(),
  { body: '', danger: false, busy: false, noteLabel: '', notePlaceholder: '', error: '' },
)

const emit = defineEmits<{ close: []; confirm: [note: string] }>()
const note = ref('')
</script>

<template>
  <PosModal :title="props.title" size="sm" raised @close="emit('close')">
    <form id="admin-confirm-form" class="flex flex-col gap-4" @submit.prevent="emit('confirm', note.trim())">
      <p v-if="body" class="text-[14px] leading-relaxed text-pos-ink-2">{{ body }}</p>
      <p v-if="danger" class="pos-notice bg-pos-err-bg text-pos-err">
        <AlertTriangle class="mt-px h-4 w-4 shrink-0" />
        {{ $t('admin.confirm.irreversible') }}
      </p>
      <div v-if="noteLabel" class="pos-field">
        <label for="admin-confirm-note" class="pos-label">{{ noteLabel }}</label>
        <textarea
          id="admin-confirm-note"
          v-model="note"
          data-autofocus
          class="pos-input h-auto min-h-24 resize-none py-3"
          :placeholder="notePlaceholder"
        />
      </div>
      <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <button type="button" class="pos-btn-ghost" @click="emit('close')">{{ $t('common.cancel') }}</button>
      <button
        type="submit"
        form="admin-confirm-form"
        :class="danger ? 'pos-btn-danger' : 'pos-btn-primary'"
        :disabled="busy"
        :data-autofocus="noteLabel ? undefined : ''"
      >
        <span v-if="busy" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
        {{ confirmLabel }}
      </button>
    </template>
  </PosModal>
</template>
