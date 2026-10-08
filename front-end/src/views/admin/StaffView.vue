<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertCircle, Plus, Users } from 'lucide-vue-next'
import { api } from '@/services/api'
import { apiErrorMessage } from '@/services/products'
import type { Shop } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import PosModal from '@/components/pos/PosModal.vue'
import PosEmptyState from '@/components/pos/PosEmptyState.vue'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { formatCount } from '@/utils/formatMoney'

interface StaffMember {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  shopAssignments: Array<{ shop: { id: string; name: string } }>
}

const ROLES = ['CASHIER', 'MANAGER', 'OWNER'] as const

const { t } = useI18n()
const auth = useAuthStore()
const toast = useToast()
const staff = ref<StaffMember[]>([])
const shops = ref<Shop[]>([])
const loading = ref(true)
const showForm = ref(false)
const saving = ref(false)
const error = ref('')

function emptyForm() {
  return { email: '', password: '', name: '', role: 'CASHIER' as string, shopIds: [] as string[] }
}
const form = ref(emptyForm())

function roleLabel(role: string) {
  const key = `admin.staff.role.${role}`
  const label = t(key)
  return label !== key ? label : role
}

const ROLE_TONES: Record<string, string> = {
  OWNER: 'pos-badge bg-pos-espresso text-white',
  MANAGER: 'pos-badge-warn',
  CASHIER: 'pos-badge-neutral',
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

async function load() {
  loading.value = !staff.value.length
  try {
    const [staffRes, shopsRes] = await Promise.all([
      api.get<{ data: StaffMember[] }>('/staff'),
      api.get<{ data: Shop[] }>('/shops'),
    ])
    staff.value = staffRes.data.data
    shops.value = shopsRes.data.data
  } finally {
    loading.value = false
  }
}

function openForm() {
  form.value = emptyForm()
  if (auth.selectedShopId) form.value.shopIds = [auth.selectedShopId]
  error.value = ''
  showForm.value = true
}

async function createStaff() {
  if (saving.value) return
  if (!form.value.shopIds.length && form.value.role !== 'OWNER') {
    error.value = t('admin.staff.needShop')
    return
  }
  saving.value = true
  error.value = ''
  try {
    await api.post('/staff', form.value)
    showForm.value = false
    toast.success(t('admin.staff.created'))
    await load()
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.staff.createFailed'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page-shell">
    <PageHeader
      :title="t('admin.staff.title')"
      :subtitle="loading ? '' : t('admin.staff.subtitle', { n: formatCount(staff.length) }, staff.length)"
    >
      <template #actions>
        <button type="button" class="pos-btn-primary" @click="openForm">
          <Plus class="h-4 w-4" />
          {{ t('admin.staff.add') }}
        </button>
      </template>
    </PageHeader>

    <div class="pos-surface overflow-hidden">
      <div v-if="loading" class="flex flex-col gap-4 p-5" role="status">
        <span class="sr-only">{{ t('common.loading') }}</span>
        <div v-for="i in 4" :key="i" class="flex items-center gap-4">
          <div class="pos-skeleton h-9 w-9 rounded-full" />
          <div class="pos-skeleton h-4 flex-1" />
          <div class="pos-skeleton h-6 w-20 rounded-full" />
        </div>
      </div>
      <div v-else-if="staff.length" class="overflow-x-auto">
        <table class="pos-table min-w-[640px]">
          <thead>
            <tr>
              <th scope="col">{{ t('admin.staff.colMember') }}</th>
              <th scope="col">{{ t('admin.staff.colRole') }}</th>
              <th scope="col">{{ t('admin.staff.colShops') }}</th>
              <th scope="col">{{ t('pos.table.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in staff" :key="member.id">
              <td>
                <div class="flex items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pos-canvas text-[12px] font-semibold text-pos-ink-2">{{ initials(member.name) }}</span>
                  <div class="min-w-0">
                    <span class="block font-medium whitespace-nowrap text-pos-ink">
                      {{ member.name }}
                      <span v-if="member.id === auth.staff?.id" class="text-[12px] font-normal text-pos-muted">· {{ t('admin.staff.you') }}</span>
                    </span>
                    <span class="block truncate text-[12px] text-pos-muted">{{ member.email }}</span>
                  </div>
                </div>
              </td>
              <td><span :class="ROLE_TONES[member.role] ?? 'pos-badge-neutral'">{{ roleLabel(member.role) }}</span></td>
              <td>
                <div class="flex flex-wrap gap-1">
                  <span v-for="assignment in member.shopAssignments" :key="assignment.shop.id" class="pos-badge-neutral h-5 px-2 text-[11px]">{{ assignment.shop.name }}</span>
                  <span v-if="!member.shopAssignments.length" class="text-[12.5px] text-pos-muted">{{ t('common.emDash') }}</span>
                </div>
              </td>
              <td>
                <span :class="member.isActive ? 'pos-badge-ok' : 'pos-badge-neutral'"><span class="pos-dot" />{{ member.isActive ? t('common.active') : t('admin.clients.inactive') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <PosEmptyState v-else :icon="Users" :title="t('admin.staff.empty')" />
    </div>

    <PosModal v-if="showForm" :title="t('admin.staff.addTitle')" @close="showForm = false">
      <form id="staff-create-form" class="flex flex-col gap-4" @submit.prevent="createStaff">
        <label class="pos-field">
          <span class="pos-label">{{ t('admin.staff.nameLabel') }}</span>
          <input v-model="form.name" required class="pos-input" data-autofocus :placeholder="t('admin.staff.namePlaceholder')" />
        </label>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="pos-field">
            <span class="pos-label">{{ t('admin.staff.email') }}</span>
            <input v-model="form.email" type="email" required autocomplete="off" class="pos-input" />
          </label>
          <label class="pos-field">
            <span class="pos-label">{{ t('admin.staff.password') }}</span>
            <input v-model="form.password" type="password" required minlength="6" autocomplete="new-password" class="pos-input" />
          </label>
        </div>
        <div class="pos-field">
          <span class="pos-label">{{ t('admin.staff.colRole') }}</span>
          <div class="pos-segmented" role="group" :aria-label="t('admin.staff.colRole')">
            <button
              v-for="role in ROLES"
              :key="role"
              type="button"
              class="pos-segment"
              :aria-pressed="form.role === role"
              @click="form.role = role"
            >
              {{ roleLabel(role) }}
            </button>
          </div>
          <p class="pos-field-hint">{{ t(`admin.staff.roleHint.${form.role}`) }}</p>
        </div>
        <fieldset class="pos-field">
          <legend class="pos-label mb-1.5">{{ t('admin.staff.colShops') }}</legend>
          <div class="flex flex-wrap gap-2">
            <label v-for="shop in shops" :key="shop.id" class="cursor-pointer">
              <input v-model="form.shopIds" type="checkbox" :value="shop.id" class="peer sr-only" />
              <span class="pos-chip peer-checked:bg-pos-espresso peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-pos-ink">{{ shop.name }}</span>
            </label>
          </div>
        </fieldset>
        <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert"><AlertCircle class="mt-px h-4 w-4 shrink-0" />{{ error }}</p>
      </form>
      <template #footer>
        <button type="button" class="pos-btn-ghost" @click="showForm = false">{{ t('common.cancel') }}</button>
        <button type="submit" form="staff-create-form" class="pos-btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('admin.staff.add') }}</button>
      </template>
    </PosModal>
  </div>
</template>
