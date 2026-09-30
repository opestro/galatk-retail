<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { listCharges, createCharge, voidCharge } from '@/services/clientApi'
import type { ShopCharge } from '@/types/api'
import PageHeader from '@/components/ui/PageHeader.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'

const { t } = useI18n()
const auth = useAuthStore()
const charges = ref<ShopCharge[]>([])
const loading = ref(true)
const showForm = ref(false)
const message = ref('')
const error = ref('')

const dateRange = ref({ from: '', to: '' })
const form = ref({
  category: 'TEAM_FOOD',
  amount: 0,
  chargeDate: new Date().toISOString().slice(0, 10),
  note: '',
})

const voidTarget = ref<ShopCharge | null>(null)
const voidReason = ref('')

const categoryValues = ['TEAM_FOOD', 'PETTY_CASH', 'TRANSPORT', 'OTHER'] as const

const categories = computed(() =>
  categoryValues.map((value) => ({
    value,
    label: t(`admin.charges.category.${value}`),
  })),
)

function categoryLabel(category: string) {
  const key = `admin.charges.category.${category}`
  const label = t(key)
  return label !== key ? label : category
}

async function load() {
  const shopId = auth.selectedShopId
  if (!shopId) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const { data } = await listCharges(
      shopId,
      dateRange.value.from || undefined,
      dateRange.value.to || undefined,
    )
    charges.value = data.data
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  const shopId = auth.selectedShopId
  if (!shopId) return
  error.value = ''
  try {
    await createCharge(shopId, {
      category: form.value.category,
      amount: form.value.amount,
      chargeDate: form.value.chargeDate,
      note: form.value.note || undefined,
    })
    form.value = { category: 'TEAM_FOOD', amount: 0, chargeDate: new Date().toISOString().slice(0, 10), note: '' }
    showForm.value = false
    message.value = t('admin.charges.recorded')
    await load()
  } catch {
    error.value = t('admin.charges.createFailed')
  }
}

async function confirmVoid() {
  const shopId = auth.selectedShopId
  if (!shopId || !voidTarget.value) return
  await voidCharge(shopId, voidTarget.value.id, voidReason.value || undefined)
  voidTarget.value = null
  voidReason.value = ''
  message.value = t('admin.charges.voided')
  await load()
}

onMounted(load)
watch(() => auth.selectedShopId, load)
</script>

<template>
  <div class="page-shell">
    <PageHeader :title="t('admin.charges.title')">
      <template #actions>
        <button v-if="auth.isManager" class="btn-primary" @click="showForm = !showForm">
          {{ t('admin.charges.add') }}
        </button>
      </template>
    </PageHeader>

    <div class="flex flex-wrap gap-4">
      <input v-model="dateRange.from" type="date" class="input max-w-40" />
      <input v-model="dateRange.to" type="date" class="input max-w-40" />
      <button class="btn-secondary" @click="load">{{ t('common.filter') }}</button>
    </div>

    <form v-if="showForm && auth.isManager" class="card flex max-w-md flex-col gap-4" @submit.prevent="handleCreate">
      <select v-model="form.category" class="input">
        <option v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</option>
      </select>
      <input v-model.number="form.amount" type="number" min="0" step="0.01" :placeholder="t('admin.charges.amountPlaceholder')" required class="input" />
      <input v-model="form.chargeDate" type="date" required class="input" />
      <textarea v-model="form.note" :placeholder="t('admin.charges.notePlaceholder')" class="input min-h-20" />
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" class="btn-primary">{{ t('admin.charges.record') }}</button>
    </form>

    <p v-if="message" class="text-sm text-green-600">{{ message }}</p>

    <SkeletonList v-if="loading" />
    <ul v-else class="list-panel">
      <li v-for="charge in charges" :key="charge.id" class="list-row flex-col items-start gap-1 sm:flex-row sm:items-center">
        <div>
          <p class="font-medium text-gray-900">{{ categoryLabel(charge.category) }} · {{ charge.amount }} {{ t('common.currency') }}</p>
          <p class="text-sm text-gray-500">{{ charge.chargeDate }} · {{ charge.recordedBy.name }}</p>
          <p v-if="charge.note" class="text-sm text-gray-500">{{ charge.note }}</p>
          <p v-if="charge.status !== 'ACTIVE'" class="text-sm text-red-600">{{ charge.status }}</p>
        </div>
        <button
          v-if="charge.status === 'ACTIVE' && auth.isManager"
          class="btn-danger text-xs"
          @click="voidTarget = charge"
        >
          {{ t('admin.charges.void') }}
        </button>
      </li>
    </ul>

    <div v-if="voidTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
      <div class="flex w-full max-w-md flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6">
        <h3 class="text-lg font-medium text-gray-900">{{ t('admin.charges.voidTitle') }}</h3>
        <p class="text-sm text-gray-600">{{ categoryLabel(voidTarget.category) }} · {{ voidTarget.amount }} {{ t('common.currency') }}</p>
        <textarea v-model="voidReason" :placeholder="t('admin.charges.voidReason')" class="input min-h-20" />
        <div class="flex justify-end gap-3">
          <button class="btn-secondary" @click="voidTarget = null">{{ t('common.cancel') }}</button>
          <button class="btn-danger" @click="confirmVoid">{{ t('admin.charges.voidTitle') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
