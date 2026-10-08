<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { MoreHorizontal } from 'lucide-vue-next'

/**
 * "⋯" overflow menu for table rows. Secondary and destructive actions live
 * here so they are never one stray tap away. The menu is teleported and
 * positioned against the trigger so scrolling table wrappers cannot clip it.
 * Slot content should be `.pos-menu-item` buttons with `role="menuitem"`.
 */
defineProps<{ label: string }>()

const open = ref(false)
const trigger = ref<HTMLButtonElement | null>(null)
const menu = ref<HTMLElement | null>(null)
const position = ref<Record<string, string>>({})

function place() {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  const rtl = document.documentElement.dir === 'rtl'
  const below = window.innerHeight - rect.bottom > 180
  position.value = {
    top: below ? `${rect.bottom + 6}px` : 'auto',
    bottom: below ? 'auto' : `${window.innerHeight - rect.top + 6}px`,
    ...(rtl ? { left: `${rect.left}px` } : { right: `${window.innerWidth - rect.right}px` }),
  }
}

function items(): HTMLElement[] {
  return menu.value ? Array.from(menu.value.querySelectorAll<HTMLElement>('[role="menuitem"]')) : []
}

async function show() {
  place()
  open.value = true
  window.addEventListener('scroll', close, true)
  window.addEventListener('resize', close)
  await nextTick()
  items()[0]?.focus()
}

function close() {
  if (!open.value) return
  open.value = false
  window.removeEventListener('scroll', close, true)
  window.removeEventListener('resize', close)
}

function toggle() {
  if (open.value) close()
  else void show()
}

function onMenuKeydown(event: KeyboardEvent) {
  const list = items()
  const index = list.indexOf(document.activeElement as HTMLElement)
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    list[(index + 1) % list.length]?.focus()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    list[(index - 1 + list.length) % list.length]?.focus()
  } else if (event.key === 'Escape' || event.key === 'Tab') {
    event.preventDefault()
    close()
    trigger.value?.focus()
  }
}

/** Any item click closes the menu after its own handler runs. */
function onMenuClick(event: MouseEvent) {
  if ((event.target as HTMLElement).closest('[role="menuitem"]')) close()
}

onBeforeUnmount(close)
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="pos-icon-btn h-9 w-9"
    :class="open ? 'bg-black/[0.05] text-pos-ink' : ''"
    :aria-label="label"
    aria-haspopup="menu"
    :aria-expanded="open"
    @click="toggle"
  >
    <MoreHorizontal class="h-[18px] w-[18px]" />
  </button>

  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[70]" @click="close" />
    <Transition name="pos-pop">
      <div
        v-if="open"
        ref="menu"
        role="menu"
        class="pos pos-menu fixed z-[71] bg-white"
        :style="position"
        @keydown="onMenuKeydown"
        @click="onMenuClick"
      >
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>
