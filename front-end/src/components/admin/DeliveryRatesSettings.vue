<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import { apiErrorMessage } from '@/services/products'
import { getDeliveryRates, updateDeliveryRates } from '@/services/siteSettings'
import type { WilayaDeliveryRate } from '@/types/api'

/**
 * Editable row for one wilaya. Checking “free” stores 0 for that service
 * and remembers the previous amount so unchecking can restore it.
 */
interface DraftRate {
  wilaya: string
  stopdeskFee: number
  homeFee: number
  stopdeskFree: boolean
  homeFree: boolean
  prevStopdesk: number
  prevHome: number
}

const { t } = useI18n()

const loading = ref(true)
const saving = ref(false)
const message = ref('')
const error = ref('')
const search = ref('')
const rows = ref<DraftRate[]>([])
const savedSnapshot = ref('')

const bulkStopdesk = ref(0)
const bulkHome = ref(0)

const isDirty = computed(() => snapshot(rows.value) !== savedSnapshot.value)
useUnsavedChanges(isDirty)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter((row) => row.wilaya.toLowerCase().includes(q))
})

function snapshot(list: DraftRate[]): string {
  return JSON.stringify(
    list.map((row) => ({
      wilaya: row.wilaya,
      stopdeskFee: row.stopdeskFree ? 0 : Number(row.stopdeskFee) || 0,
      homeFee: row.homeFree ? 0 : Number(row.homeFee) || 0,
    })),
  )
}

function toDraft(rate: WilayaDeliveryRate): DraftRate {
  const stopdeskFee = Number(rate.stopdeskFee) || 0
  const homeFee = Number(rate.homeFee) || 0
  return {
    wilaya: rate.wilaya,
    stopdeskFee,
    homeFee,
    stopdeskFree: stopdeskFee === 0,
    homeFree: homeFee === 0,
    prevStopdesk: stopdeskFee,
    prevHome: homeFee,
  }
}

function setFromServer(list: WilayaDeliveryRate[]) {
  rows.value = list.map(toDraft)
  savedSnapshot.value = snapshot(rows.value)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    setFromServer(await getDeliveryRates())
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.settings.deliveryRates.loadError'))
  } finally {
    loading.value = false
  }
}

function onStopdeskFree(row: DraftRate, free: boolean) {
  row.stopdeskFree = free
  if (free) {
    row.prevStopdesk = Number(row.stopdeskFee) || 0
    row.stopdeskFee = 0
  } else {
    row.stopdeskFee = row.prevStopdesk > 0 ? row.prevStopdesk : 0
  }
}

function onHomeFree(row: DraftRate, free: boolean) {
  row.homeFree = free
  if (free) {
    row.prevHome = Number(row.homeFee) || 0
    row.homeFee = 0
  } else {
    row.homeFee = row.prevHome > 0 ? row.prevHome : 0
  }
}

function onStopdeskAmount(row: DraftRate, value: number) {
  row.stopdeskFee = Number.isFinite(value) && value >= 0 ? value : 0
  row.stopdeskFree = row.stopdeskFee === 0
}

function onHomeAmount(row: DraftRate, value: number) {
  row.homeFee = Number.isFinite(value) && value >= 0 ? value : 0
  row.homeFree = row.homeFee === 0
}

function applyStopdeskToAll() {
  const amount = Number(bulkStopdesk.value) || 0
  for (const row of rows.value) {
    row.stopdeskFee = amount
    row.stopdeskFree = amount === 0
    row.prevStopdesk = amount
  }
}

function applyHomeToAll() {
  const amount = Number(bulkHome.value) || 0
  for (const row of rows.value) {
    row.homeFee = amount
    row.homeFree = amount === 0
    row.prevHome = amount
  }
}

async function save() {
  saving.value = true
  message.value = ''
  error.value = ''
  try {
    const payload = rows.value.map((row) => ({
      wilaya: row.wilaya,
      stopdeskFee: row.stopdeskFree ? 0 : Number(row.stopdeskFee) || 0,
      homeFee: row.homeFree ? 0 : Number(row.homeFee) || 0,
    }))
    setFromServer(await updateDeliveryRates(payload))
    message.value = t('admin.settings.deliveryRates.saved')
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.settings.deliveryRates.saveError'))
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="flex flex-col gap-4">
    <div>
      <h3 class="section-title">{{ t('admin.settings.deliveryRates.title') }}</h3>
      <p class="mt-1 max-w-3xl text-sm text-gray-600">{{ t('admin.settings.deliveryRates.hint') }}</p>
    </div>

    <div v-if="loading" class="card h-48 animate-pulse bg-gray-50" />

    <form v-else class="flex flex-col gap-4" @submit.prevent="save">
      <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <input
          v-model="search"
          type="search"
          class="input max-w-sm"
          :placeholder="t('admin.settings.deliveryRates.search')"
        />
        <div class="flex flex-wrap items-end gap-3">
          <label class="flex flex-col gap-1 text-xs text-gray-600">
            {{ t('admin.settings.deliveryRates.colStopdesk') }}
            <input v-model.number="bulkStopdesk" type="number" min="0" step="1" class="input w-28" />
          </label>
          <button type="button" class="btn-secondary" @click="applyStopdeskToAll">
            {{ t('admin.settings.deliveryRates.applyStopdeskAll') }}
          </button>
          <label class="flex flex-col gap-1 text-xs text-gray-600">
            {{ t('admin.settings.deliveryRates.colHome') }}
            <input v-model.number="bulkHome" type="number" min="0" step="1" class="input w-28" />
          </label>
          <button type="button" class="btn-secondary" @click="applyHomeToAll">
            {{ t('admin.settings.deliveryRates.applyHomeAll') }}
          </button>
        </div>
      </div>

      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="min-w-full text-start text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-4 py-3 text-start">{{ t('admin.settings.deliveryRates.colWilaya') }}</th>
              <th class="px-4 py-3 text-start">{{ t('admin.settings.deliveryRates.colStopdesk') }}</th>
              <th class="px-4 py-3 text-start">{{ t('admin.settings.deliveryRates.free') }}</th>
              <th class="px-4 py-3 text-start">{{ t('admin.settings.deliveryRates.colHome') }}</th>
              <th class="px-4 py-3 text-start">{{ t('admin.settings.deliveryRates.free') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="row in filtered" :key="row.wilaya" class="hover:bg-gray-50">
              <td class="px-4 py-2 font-medium text-gray-900">{{ row.wilaya }}</td>
              <td class="px-4 py-2">
                <input
                  :value="row.stopdeskFee"
                  type="number"
                  min="0"
                  step="1"
                  class="input w-28"
                  :disabled="row.stopdeskFree"
                  @input="onStopdeskAmount(row, Number(($event.target as HTMLInputElement).value))"
                />
              </td>
              <td class="px-4 py-2">
                <label class="inline-flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    class="h-4 w-4"
                    :checked="row.stopdeskFree"
                    @change="onStopdeskFree(row, ($event.target as HTMLInputElement).checked)"
                  />
                  {{ t('admin.settings.deliveryRates.free') }}
                </label>
              </td>
              <td class="px-4 py-2">
                <input
                  :value="row.homeFee"
                  type="number"
                  min="0"
                  step="1"
                  class="input w-28"
                  :disabled="row.homeFree"
                  @input="onHomeAmount(row, Number(($event.target as HTMLInputElement).value))"
                />
              </td>
              <td class="px-4 py-2">
                <label class="inline-flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    class="h-4 w-4"
                    :checked="row.homeFree"
                    @change="onHomeFree(row, ($event.target as HTMLInputElement).checked)"
                  />
                  {{ t('admin.settings.deliveryRates.free') }}
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-else-if="message" class="text-sm text-green-600">{{ message }}</p>

      <div>
        <button type="submit" class="btn-primary" :disabled="saving || !isDirty">
          {{ saving ? t('common.saving') : t('admin.settings.deliveryRates.save') }}
        </button>
      </div>
    </form>
  </section>
</template>
