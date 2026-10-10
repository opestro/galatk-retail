<script setup lang="ts">
import { onMounted, ref, useId } from 'vue'
import { X } from 'lucide-vue-next'
import { useDialogA11y } from '@/composables/useDialogA11y'

/**
 * POS dialog shell: blurred backdrop, elevated panel (bottom sheet on phones),
 * focus trap, Escape to close. Parents mount it with `v-if`; mark the control
 * that should receive focus with `data-autofocus`.
 */
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    size?: 'sm' | 'md' | 'lg'
    /** Hide the close button (e.g. success screens with their own Done). */
    hideClose?: boolean
    /** Keep the title for screen readers only; the body draws its own heading. */
    headless?: boolean
    /** Stack above another open dialog. */
    raised?: boolean
  }>(),
  { size: 'md', subtitle: '' },
)

const emit = defineEmits<{ close: [] }>()

const titleId = useId()
const open = ref(false)
const panel = ref<HTMLElement | null>(null)
const focusTarget = ref<HTMLElement | null>(null)

useDialogA11y(open, panel, () => emit('close'), focusTarget)

onMounted(() => {
  focusTarget.value = panel.value?.querySelector<HTMLElement>('[data-autofocus]') ?? null
  open.value = true
})

const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-2xl' }
</script>

<template>
  <Transition name="pos-modal" appear>
    <div class="pos-backdrop" :class="raised ? 'z-[60]' : ''" @click.self="emit('close')">
      <div
        ref="panel"
        class="pos-dialog"
        :class="widths[size]"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <header :class="headless ? 'sr-only' : 'flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-2'">
          <div class="min-w-0">
            <h2 :id="titleId" class="text-[17px] font-semibold tracking-[-0.01em] text-pos-ink">{{ title }}</h2>
            <p v-if="subtitle" class="mt-1 text-[13px] text-pos-muted">{{ subtitle }}</p>
          </div>
          <button
            v-if="!hideClose"
            type="button"
            class="pos-icon-btn -me-2 -mt-1"
            :aria-label="$t('common.close')"
            @click="emit('close')"
          >
            <X class="h-[18px] w-[18px]" />
          </button>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto px-6 pb-6" :class="headless ? 'pt-8' : 'pt-3'">
          <slot />
        </div>

        <footer
          v-if="$slots.footer"
          class="flex shrink-0 flex-col-reverse gap-2 border-t border-pos-line bg-pos-sunken/60 px-6 py-4 sm:flex-row sm:justify-end"
          style="padding-bottom: max(1rem, env(safe-area-inset-bottom))"
        >
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Transition>
</template>
