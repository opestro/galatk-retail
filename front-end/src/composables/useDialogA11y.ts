import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal behaviour for storefront overlays: traps Tab inside `container`,
 * closes on Escape, locks page scroll, and restores focus to the trigger.
 */
export function useDialogA11y(
  open: Ref<boolean>,
  container: Ref<HTMLElement | null>,
  onClose: () => void,
  initialFocus?: Ref<HTMLElement | null>,
) {
  let previous: HTMLElement | null = null

  function focusables(): HTMLElement[] {
    return container.value ? Array.from(container.value.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const items = focusables()
    if (items.length === 0) return
    const first = items[0]!
    const last = items[items.length - 1]!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function activate() {
    previous = document.activeElement as HTMLElement | null
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeydown)
    void nextTick(() => {
      ;(initialFocus?.value ?? focusables()[0])?.focus()
    })
  }

  function deactivate() {
    document.documentElement.style.overflow = ''
    document.removeEventListener('keydown', onKeydown)
    previous?.focus?.()
    previous = null
  }

  watch(open, (value) => (value ? activate() : deactivate()))
  onBeforeUnmount(() => {
    if (open.value) deactivate()
  })
}
