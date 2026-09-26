<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { listClients, createClient } from '@/services/clientApi'
import type { Client } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'

const { t } = useI18n()
const auth = useAuthStore()
const clients = ref<Client[]>([])
const search = ref('')
const loading = ref(true)
const showForm = ref(false)
const message = ref('')
const error = ref('')
const form = ref({
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
  creditLimit: '' as string | number,
})

async function load() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const { data } = await listClients(shopId, search.value || undefined)
    clients.value = data.data
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  const shopId = auth.selectedShopId
  if (!shopId) return
  error.value = ''
  try {
    const body: Record<string, unknown> = {
      name: form.value.name,
      phone: form.value.phone,
      email: form.value.email || undefined,
      address: form.value.address || undefined,
      notes: form.value.notes || undefined,
    }
    if (form.value.creditLimit !== '') {
      body.creditLimit = Number(form.value.creditLimit)
    }
    await createClient(shopId, body)
    form.value = { name: '', phone: '', email: '', address: '', notes: '', creditLimit: '' }
    showForm.value = false
    message.value = t('admin.clients.created')
    await load()
  } catch {
    error.value = t('admin.clients.createFailed')
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(load, 300)
})

onMounted(load)
watch(() => auth.selectedShopId, load)
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="t('admin.clients.title')">
      <template #actions>
        <button v-if="auth.isManager" class="btn-primary" @click="showForm = !showForm">
          {{ t('admin.clients.add') }}
        </button>
      </template>
    </PageHeader>

    <input v-model="search" :placeholder="t('admin.clients.searchPlaceholder')" class="input max-w-md" />

    <form v-if="showForm && auth.isManager" class="card flex max-w-md flex-col gap-4" @submit.prevent="handleCreate">
      <input v-model="form.name" :placeholder="t('admin.clients.namePlaceholder')" required class="input" />
      <input v-model="form.phone" :placeholder="t('admin.clients.phonePlaceholder')" required class="input" />
      <input v-model="form.email" type="email" :placeholder="t('admin.clients.emailOptional')" class="input" />
      <input v-model="form.address" :placeholder="t('admin.clients.addressOptional')" class="input" />
      <textarea v-model="form.notes" :placeholder="t('admin.clients.notesOptional')" class="input min-h-20" />
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700">{{ t('admin.clients.creditLimitLabel') }}</label>
        <input v-model="form.creditLimit" type="number" min="0" class="input" />
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" class="btn-primary">{{ t('common.create') }}</button>
    </form>

    <p v-if="message" class="text-sm text-green-600">{{ message }}</p>

    <SkeletonList v-if="loading" />
    <ul v-else class="list-panel">
      <li v-for="client in clients" :key="client.id" class="list-row">
        <div>
          <RouterLink :to="`/admin/clients/${client.id}`" class="font-medium text-gray-900 hover:underline">
            {{ client.name }}
          </RouterLink>
          <p class="text-sm text-gray-500">{{ client.phone }}</p>
        </div>
        <div class="text-end">
          <p class="font-medium text-gray-900">{{ client.balance }} {{ t('common.currency') }}</p>
          <p v-if="client.creditLimit" class="text-xs text-gray-500">{{ t('admin.clients.limit', { n: client.creditLimit }) }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>
