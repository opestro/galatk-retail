import { readonly, ref } from 'vue'

export interface Toast {
  id: number
  message: string
  tone: 'success' | 'error'
}

const toasts = ref<Toast[]>([])
let nextId = 1

/**
 * App-wide transient feedback ("Saved", "Payment recorded"). Replaces inline
 * success text that used to linger under forms. Errors stay longer.
 */
export function useToast() {
  function dismiss(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function show(message: string, tone: Toast['tone'] = 'success') {
    const id = nextId++
    toasts.value = [...toasts.value.slice(-2), { id, message, tone }]
    setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3200)
  }

  return {
    toasts: readonly(toasts),
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error'),
    dismiss,
  }
}
