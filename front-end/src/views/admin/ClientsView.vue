<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { AlertCircle, ChevronRight, Plus, Search, UserRound } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { listClients, createClient } from '@/services/clientApi'
import type { Client } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import PosModal from '@/components/pos/PosModal.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { useToast } from '@/composables/useToast'
import { formatCount, formatMoney } from '@/utils/formatMoney'

const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()
const clients = ref<Client[]>([])
const search = ref('')
const loading = ref(true)
/** Background refresh after the first load (search / filters). */
const refreshing = ref(false)
const showForm = ref(false)
const saving = ref(false)
const error = ref('')

function emptyForm() {
  return { name: '', phone: '', email: '', address: '', notes: '', creditLimit: '' as string | number }
}
const form = ref(emptyForm())

async function load() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = !clients.value.length
  refreshing.value = !loading.value
  try {
    const { data } = await listClients(shopId, search.value || undefined)
    clients.value = data.data
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

function openForm() {
  form.value = emptyForm()
  error.value = ''
  showForm.value = true
}

async function handleCreate() {
  const shopId = auth.selectedShopId
  if (!shopId || saving.value) return
  error.value = ''
  saving.value = true
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
    showForm.value = false
    toast.success(t('admin.clients.created'))
    await load()
  } catch {
    error.value = t('admin.clients.createFailed')
  } finally {
    saving.value = false
  }
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

/** Share of the credit limit already used, 0–100. */
function limitUsage(client: Client): number {
  const limit = Number(client.creditLimit)
  if (!limit) return 0
  return Math.min(100, Math.round((Number(client.balance) / limit) * 100))
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(load, 300)
})
onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

onMounted(load)
watch(() => auth.selectedShopId, load)
</script>

<template>
  <div class="page-shell">
    <PageHeader
      :title="t('admin.clients.title')"
      :subtitle="loading ? '' : t('admin.clients.subtitle', { n: formatCount(clients.length) }, clients.length)"
    >
      <template #actions>
        <button v-if="auth.isManager" type="button" class="pos-btn-primary" @click="openForm">
          <Plus class="h-4 w-4" />
          {{ t('admin.clients.add') }}
        </button>
      </template>
    </PageHeader>

    <div class="relative sm:max-w-md">
      <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pos-faint" aria-hidden="true" />
      <input
        v-model="search"
        type="search"
        :placeholder="t('admin.clients.searchPlaceholder')"
        :aria-label="t('admin.clients.searchPlaceholder')"
        class="pos-input pos-input-icon"
      />
    </div>

    <div class="pos-surface overflow-hidden transition-opacity duration-200" :class="refreshing ? 'opacity-60' : ''" :aria-busy="loading || refreshing">
      <div v-if="loading" class="flex flex-col gap-4 p-5" role="status">
        <span class="sr-only">{{ t('common.loading') }}</span>
        <div v-for="i in 5" :key="i" class="flex items-center gap-4">
          <div class="pos-skeleton h-9 w-9 rounded-full" />
          <div class="pos-skeleton h-4 flex-1" />
          <div class="pos-skeleton h-4 w-24" />
        </div>
      </div>

      <div v-else-if="clients.length" class="overflow-x-auto">
        <table class="pos-table min-w-[680px]">
          <thead>
            <tr>
              <th scope="col">{{ t('pos.table.client') }}</th>
              <th scope="col">{{ t('pos.table.phone') }}</th>
              <th scope="col" class="pos-cell-num">{{ t('pos.table.balance') }}</th>
              <th scope="col">{{ t('admin.clients.colLimit') }}</th>
              <th scope="col" class="pos-cell-actions"><span class="sr-only">{{ t('common.actions') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="client in clients" :key="client.id" class="pos-row-link" @click="router.push(`/admin/clients/${client.id}`)">
              <td>
                <div class="flex items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pos-canvas text-[12px] font-semibold text-pos-ink-2">{{ initials(client.name) }}</span>
                  <div class="min-w-0">
                    <RouterLink :to="`/admin/clients/${client.id}`" class="block font-medium whitespace-nowrap text-pos-ink hover:underline" @click.stop>
                      {{ client.name }}
                    </RouterLink>
                    <span v-if="client.email" class="block truncate text-[12px] text-pos-muted">{{ client.email }}</span>
                  </div>
                  <span v-if="!client.isActive" class="pos-badge-neutral h-5 px-2 text-[11px]">{{ t('admin.clients.inactive') }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap text-pos-ink-2"><bdi>{{ client.phone }}</bdi></td>
              <td class="pos-cell-num font-semibold" :class="Number(client.balance) > 0 ? 'text-pos-warn' : 'text-pos-ink'">{{ formatMoney(client.balance) }}</td>
              <td>
                <div v-if="client.creditLimit" class="flex min-w-36 flex-col gap-1">
                  <span class="text-[12px] text-pos-muted pos-num">{{ formatMoney(client.creditLimit) }}</span>
                  <span class="h-1 w-full overflow-hidden rounded-full bg-pos-canvas" role="meter" :aria-valuenow="limitUsage(client)" aria-valuemin="0" aria-valuemax="100" :aria-label="t('admin.clients.limitUsed')">
                    <span
                      class="block h-full rounded-full"
                      :class="limitUsage(client) >= 90 ? 'bg-pos-err' : limitUsage(client) >= 60 ? 'bg-[#d97706]' : 'bg-pos-espresso'"
                      :style="{ width: `${limitUsage(client)}%` }"
                    />
                  </span>
                </div>
                <span v-else class="text-[12.5px] text-pos-muted">{{ t('admin.clientProfile.unlimited') }}</span>
              </td>
              <td class="pos-cell-actions">
                <ChevronRight class="ms-auto h-4 w-4 text-pos-faint rtl:rotate-180" aria-hidden="true" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <PosEmptyState v-else :icon="UserRound" :title="t('admin.clients.empty')" :body="search ? t('admin.clients.emptySearch') : ''" />
    </div>

    <PosModal v-if="showForm" :title="t('admin.clients.addTitle')" @close="showForm = false">
      <form id="client-create-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="handleCreate">
        <label class="pos-field sm:col-span-2">
          <span class="pos-label">{{ t('admin.clients.nameLabel') }}</span>
          <input v-model="form.name" required class="pos-input" data-autofocus :placeholder="t('admin.clients.namePlaceholder')" />
        </label>
        <label class="pos-field">
          <span class="pos-label">{{ t('admin.clients.phoneLabel') }}</span>
          <input v-model="form.phone" required type="tel" class="pos-input" :placeholder="t('admin.clients.phonePlaceholder')" />
        </label>
        <label class="pos-field">
          <span class="pos-label">{{ t('admin.clients.emailLabel') }}</span>
          <input v-model="form.email" type="email" class="pos-input" :placeholder="t('admin.clients.optional')" />
        </label>
        <label class="pos-field sm:col-span-2">
          <span class="pos-label">{{ t('admin.clients.addressLabel') }}</span>
          <input v-model="form.address" class="pos-input" :placeholder="t('admin.clients.optional')" />
        </label>
        <label class="pos-field sm:col-span-2">
          <span class="pos-label">{{ t('admin.clients.creditLimitLabel') }}</span>
          <span class="relative">
            <input v-model="form.creditLimit" type="number" inputmode="decimal" min="0" class="pos-input pe-12 pos-num" :placeholder="t('admin.clientProfile.unlimited')" />
            <span class="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-[12px] text-pos-muted">{{ t('common.currency') }}</span>
          </span>
        </label>
        <label class="pos-field sm:col-span-2">
          <span class="pos-label">{{ t('admin.clients.notesLabel') }}</span>
          <textarea v-model="form.notes" class="pos-input h-auto min-h-20 resize-none py-3" :placeholder="t('admin.clients.optional')" />
        </label>
        <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err sm:col-span-2" role="alert">
          <AlertCircle class="mt-px h-4 w-4 shrink-0" />
          {{ error }}
        </p>
      </form>
      <template #footer>
        <button type="button" class="pos-btn-ghost" @click="showForm = false">{{ t('common.cancel') }}</button>
        <button type="submit" form="client-create-form" class="pos-btn-primary" :disabled="saving">
          {{ saving ? t('common.saving') : t('admin.clients.add') }}
        </button>
      </template>
    </PosModal>
  </div>
</template>
