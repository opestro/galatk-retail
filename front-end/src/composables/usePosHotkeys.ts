import { onMounted, onUnmounted } from 'vue'

export interface PosHotkeyHandlers {
  onFocusSearch?: () => void
  onRecordPayment?: () => void
  onCompleteSale?: () => void
  onClearCart?: () => void
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return target.isContentEditable
}

export function usePosHotkeys(handlers: PosHotkeyHandlers) {
  function onKeyDown(event: KeyboardEvent) {
    const key = event.key

    if (key === 'Escape' && handlers.onClearCart) {
      event.preventDefault()
      handlers.onClearCart()
      return
    }

    const allowInField = key.startsWith('F')
    if (isEditableTarget(event.target) && !allowInField) return

    switch (key) {
      case 'F2':
        if (handlers.onFocusSearch) {
          event.preventDefault()
          handlers.onFocusSearch()
        }
        break
      case 'F4':
        if (handlers.onRecordPayment) {
          event.preventDefault()
          handlers.onRecordPayment()
        }
        break
      case 'F12':
        if (handlers.onCompleteSale) {
          event.preventDefault()
          handlers.onCompleteSale()
        }
        break
      default:
        break
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
}
