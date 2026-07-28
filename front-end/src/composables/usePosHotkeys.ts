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

// Match a logical action regardless of the physical key pressed.
// macOS intercepts raw F2/F4/F12 (brightness, Launchpad, Dashboard) unless the
// user enables "Use F1, F2 etc. as standard function keys", so we also accept
// Option/Alt + digit fallbacks that always reach the browser.
//
// Crucially, the digit fallback uses `event.code` (physical key, layout-independent)
// instead of `event.key`, because on macOS Option+digit produces special chars
// (™, ¢) so `event.key === '2'` would never match.
function resolveAction(event: KeyboardEvent): 'search' | 'payment' | 'sale' | 'clear' | null {
  if (event.key === 'Escape') return 'clear'

  // F-keys (work when macOS fn-mode is on)
  if (event.key === 'F2') return 'search'
  if (event.key === 'F4') return 'payment'
  if (event.key === 'F12') return 'sale'

  // Cmd/Ctrl + Enter completes a sale (familiar pattern)
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') return 'sale'

  // Alt/Option + digit fallbacks that always work on macOS.
  // `event.code` reflects the physical key regardless of the produced character.
  if (event.altKey && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
    if (event.code === 'Digit2') return 'search'
    if (event.code === 'Digit4') return 'payment'
  }

  return null
}

export function usePosHotkeys(handlers: PosHotkeyHandlers) {
  function onKeyDown(event: KeyboardEvent) {
    const action = resolveAction(event)
    if (!action) return

    const editable = isEditableTarget(event.target)
    if (editable) {
      // Allow F-keys, Cmd/Ctrl+Enter, and Esc through while typing.
      // Block the Alt-digit fallbacks inside fields so typing isn't hijacked.
      const isForceAllowed =
        action === 'clear' ||
        event.key.startsWith('F') ||
        ((event.metaKey || event.ctrlKey) && event.key === 'Enter')
      if (!isForceAllowed) return
    }

    event.preventDefault()
    if (action === 'search') handlers.onFocusSearch?.()
    else if (action === 'payment') handlers.onRecordPayment?.()
    else if (action === 'sale') handlers.onCompleteSale?.()
    else if (action === 'clear') handlers.onClearCart?.()
  }

  onMounted(() => window.addEventListener('keydown', onKeyDown))
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
}
