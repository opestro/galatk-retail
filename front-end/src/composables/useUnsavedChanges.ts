import { onBeforeUnmount, type Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { translate } from '@/i18n/translate'

function leaveMessage() {
  return translate('common.unsavedChanges')
}

/**
 * Warns before leaving a dirty admin form via in-app navigation or browser unload.
 */
export function useUnsavedChanges(isDirty: Ref<boolean>) {
  function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!isDirty.value) return
    event.preventDefault()
    event.returnValue = leaveMessage()
  }

  window.addEventListener('beforeunload', onBeforeUnload)
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

  onBeforeRouteLeave(() => {
    if (!isDirty.value) return true
    return window.confirm(leaveMessage())
  })
}
