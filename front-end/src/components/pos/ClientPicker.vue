<script setup lang="ts">
import { ref, watch, useId } from 'vue'
import { Search, UserRound, X } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { formatMoney } from '@/utils/formatMoney'
import { listClients } from '@/services/clientApi'
import type { Client } from '@/types/api'

const props = defineProps<{
  modelValue: Client | null
  debtOnly?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [client: Client | null]
  confirm: [client: Client | null]
}>()

const auth = useAuthStore()
const search = ref('')
const results = ref<Client[]>([])
const loading = ref(false)
const highlight = ref<number | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const focused = ref(false)
const inputId = useId()
const listId = useId()
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

async function searchClients(q: string) {
  const shopId = auth.selectedShopId
  if (!shopId) return
  loading.value = true
  try {
    const { data } = await listClients(shopId, q || undefined, true, props.debtOnly ?? false)
    results.value = data.data
    highlight.value = results.value.length ? 0 : null
  } finally {
    loading.value = false
  }
}

watch(search, (q) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => searchClients(q), 300)
})

watch(
  () => auth.selectedShopId,
  () => {
    search.value = ''
    results.value = []
    highlight.value = null
    emit('update:modelValue', null)
  },
)

function selectClient(client: Client) {
  emit('update:modelValue', client)
  search.value = client.name
  results.value = []
  highlight.value = null
}

function clearClient() {
  emit('update:modelValue', null)
  search.value = ''
  results.value = []
  highlight.value = null
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!results.value.length) return
    highlight.value = highlight.value === null ? 0 : Math.min(results.value.length - 1, highlight.value + 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!results.value.length) return
    highlight.value = highlight.value === null ? 0 : Math.max(0, highlight.value - 1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const chosen = highlight.value !== null ? results.value[highlight.value] ?? null : null
    if (chosen) selectClient(chosen)
    emit('confirm', chosen)
  }
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  clear: clearClient,
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <label :for="inputId" class="pos-label">
      {{ props.debtOnly ? $t('pos.clientPicker.labelDebtOnly') : $t('pos.clientPicker.labelOptional') }}
    </label>

    <div v-if="props.modelValue" class="flex items-center gap-3 rounded-xl bg-pos-sunken p-2.5 ps-3">
      <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pos-espresso text-[12px] font-semibold text-white">
        {{ initials(props.modelValue.name) }}
      </span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-[14px] font-medium text-pos-ink">{{ props.modelValue.name }}</p>
        <p class="truncate text-[12px] text-pos-muted pos-num">
          {{ $t('pos.clientPicker.balance', { balance: formatMoney(props.modelValue.balance) }) }}
          <span v-if="props.modelValue.creditLimit">{{ $t('pos.clientPicker.limit', { limit: formatMoney(props.modelValue.creditLimit) }) }}</span>
        </p>
      </div>
      <button type="button" class="pos-icon-btn h-9 w-9" :aria-label="$t('pos.clientPicker.clear')" @click="clearClient">
        <X class="h-4 w-4" />
      </button>
    </div>

    <div v-else class="relative">
      <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pos-faint" aria-hidden="true" />
      <input
        :id="inputId"
        ref="inputRef"
        v-model="search"
        :placeholder="$t('pos.clientPicker.searchPlaceholder')"
        class="pos-input pos-input-icon"
        role="combobox"
        autocomplete="off"
        :aria-expanded="focused && results.length > 0"
        :aria-controls="listId"
        :aria-activedescendant="highlight !== null ? `${listId}-${highlight}` : undefined"
        data-autofocus
        @focus="focused = true; searchClients(search)"
        @blur="focused = false"
        @keydown="onKeydown"
      />
      <span v-if="loading" class="absolute end-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-pos-line border-t-pos-ink" :aria-label="$t('pos.clientPicker.searching')" />

      <Transition name="pos-pop">
        <ul
          v-if="focused && results.length"
          :id="listId"
          role="listbox"
          class="pos-menu start-0 end-0 top-full mt-1.5 max-h-60 overflow-y-auto"
        >
          <li
            v-for="(client, i) in results"
            :id="`${listId}-${i}`"
            :key="client.id"
            role="option"
            :aria-selected="i === highlight"
            class="pos-menu-item cursor-pointer justify-between"
            :class="i === highlight ? 'bg-pos-canvas' : ''"
            @mousedown.prevent="selectClient(client)"
            @mouseenter="highlight = i"
          >
            <span class="flex min-w-0 items-center gap-2.5">
              <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pos-canvas text-pos-muted">
                <UserRound class="h-3.5 w-3.5" />
              </span>
              <span class="min-w-0">
                <span class="block truncate font-medium text-pos-ink">{{ client.name }}</span>
                <span class="block truncate text-[12px] text-pos-muted"><bdi>{{ client.phone }}</bdi></span>
              </span>
            </span>
            <span class="shrink-0 text-[12px] text-pos-muted pos-num">{{ formatMoney(client.balance) }}</span>
          </li>
        </ul>
      </Transition>
    </div>
  </div>
</template>
