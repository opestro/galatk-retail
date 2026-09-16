import { onBeforeUnmount, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

const LEAVE_MESSAGE = 'You have unsaved changes. Are you sure you want to leave?'

/**
 * Warns before leaving a dirty admin form via in-app navigation or browser unload.
 */
export function useUnsavedChanges(isDirty: Ref<boolean>) {
  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!isDirty.value) return
    event.preventDefault()
    event.returnValue = LEAVE_MESSAGE
  }

  window.addEventListener('beforeunload', onBeforeUnload)
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

  onBeforeRouteLeave(() => {
    if (!isDirty.value) return true
    return window.confirm(LEAVE_MESSAGE)
  })
}
