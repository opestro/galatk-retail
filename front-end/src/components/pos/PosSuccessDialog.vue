<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Check, Printer } from 'lucide-vue-next'
import PosModal from '@/components/pos/PosModal.vue'

defineProps<{
  title: string
  message: string
}>()

const emit = defineEmits<{ close: []; print: [] }>()
const { t } = useI18n()
const printError = ref('')

function onPrint() {
  printError.value = ''
  try {
    emit('print')
  } catch (err) {
    printError.value = err instanceof Error ? err.message : t('pos.receipt.printError')
  }
}
</script>

<template>
  <PosModal :title="title" size="sm" headless raised @close="emit('close')">
    <div class="flex flex-col items-center gap-4 text-center">
      <span class="pos-bump flex h-14 w-14 items-center justify-center rounded-full bg-pos-ok-bg">
        <Check class="h-7 w-7 text-pos-ok" stroke-width="2.25" />
      </span>
      <div>
        <h3 class="text-[17px] font-semibold text-pos-ink" aria-hidden="true">{{ title }}</h3>
        <p class="mt-1.5 text-[14px] leading-relaxed text-pos-muted pos-num">{{ message }}</p>
      </div>
      <p v-if="printError" class="pos-notice w-full bg-pos-err-bg text-pos-err">{{ printError }}</p>
    </div>
    <template #footer>
      <button type="button" class="pos-btn-ghost flex-1" @click="onPrint">
        <Printer class="h-4 w-4" />
        {{ $t('pos.success.printReceipt') }}
      </button>
      <button type="button" class="pos-btn-primary flex-1" data-autofocus @click="emit('close')">{{ $t('pos.success.done') }}</button>
    </template>
  </PosModal>
</template>
