import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Open dialogs, innermost last — only the top one reacts to keys. */
const stack: symbol[] = []

/**
 * Modal behaviour for overlays: traps Tab inside `container`, closes on
 * Escape, locks page scroll, and restores focus to the trigger.
 */
export function useDialogA11y(
  open: Ref<boolean>,
  container: Ref<HTMLElement | null>,
  onClose: () => void,
  initialFocus?: Ref<HTMLElement | null>,
) {
  let previous: HTMLElement | null = null
  const id = Symbol('dialog')

  function focusables(): HTMLElement[] {
    return container.value ? Array.from(container.value.querySelectorAll<HTMLElement>(FOCUSABLE)) : []
  }

  function onKeydown(event: KeyboardEvent) {
    if (stack[stack.length - 1] !== id || event.defaultPrevented) return
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
    stack.push(id)
    document.documentElement.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeydown)
    void nextTick(() => {
      ;(initialFocus?.value ?? focusables()[0])?.focus()
    })
  }

  function deactivate() {
    const index = stack.indexOf(id)
    if (index !== -1) stack.splice(index, 1)
    if (!stack.length) document.documentElement.style.overflow = ''
    document.removeEventListener('keydown', onKeydown)
    previous?.focus?.()
    previous = null
  }

  watch(open, (value) => (value ? activate() : deactivate()))
  onBeforeUnmount(() => {
    if (open.value) deactivate()
  })
}
