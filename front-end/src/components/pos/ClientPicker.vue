<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
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
let debounceTimer: ReturnType<typeof setTimeout> | null = null

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
    <label class="text-sm font-medium text-gray-700">
      {{ props.debtOnly ? 'Client with outstanding credit' : 'Client (optional)' }}
    </label>
    <div class="relative">
      <input
        ref="inputRef"
        v-model="search"
        placeholder="Search by name or phone…"
        class="input"
        @focus="searchClients(search)"
        @keydown="onKeydown"
      />
      <button
        v-if="props.modelValue"
        type="button"
        class="absolute top-1/2 right-2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
        @click="clearClient"
      >
        Clear
      </button>
    </div>
    <p v-if="loading" class="text-sm text-gray-500">Searching…</p>
    <ul v-else-if="results.length && !props.modelValue" class="list-panel max-h-40 overflow-y-auto">
      <li
        v-for="(client, i) in results"
        :key="client.id"
        class="list-row cursor-pointer hover:bg-gray-50"
        :class="i === highlight ? 'bg-gray-100' : ''"
        @click="selectClient(client)"
      >
        <div>
          <p class="font-medium text-gray-900">{{ client.name }}</p>
          <p class="text-xs text-gray-500">{{ client.phone }}</p>
        </div>
        <span class="text-sm text-gray-600">{{ client.balance }} DZD</span>
      </li>
    </ul>
    <div v-if="props.modelValue" class="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
      <p class="font-medium text-gray-900">{{ props.modelValue.name }}</p>
      <p class="text-gray-500">
        Balance: {{ props.modelValue.balance }} DZD
        <span v-if="props.modelValue.creditLimit"> · Limit: {{ props.modelValue.creditLimit }} DZD</span>
      </p>
    </div>
  </div>
</template>
