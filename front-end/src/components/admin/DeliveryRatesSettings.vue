<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'
import { apiErrorMessage } from '@/services/products'
import { getDeliveryRates, updateDeliveryRates } from '@/services/siteSettings'
import type { WilayaDeliveryRate } from '@/types/api'
import { Search } from 'lucide-vue-next'

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
    <div class="pos-surface flex flex-col gap-4 p-6">
      <div>
        <h2 class="section-title">{{ t('admin.settings.deliveryRates.title') }}</h2>
        <p class="mt-1 max-w-3xl text-[13px] text-pos-muted">{{ t('admin.settings.deliveryRates.hint') }}</p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="flex items-end gap-2 rounded-xl bg-pos-sunken p-3">
          <label class="pos-field flex-1">
            <span class="pos-label">{{ t('admin.settings.deliveryRates.colStopdesk') }}</span>
            <input v-model.number="bulkStopdesk" type="number" inputmode="numeric" min="0" step="1" class="pos-input pos-num" />
          </label>
          <button type="button" class="pos-btn-soft" @click="applyStopdeskToAll">{{ t('admin.settings.deliveryRates.applyStopdeskAll') }}</button>
        </div>
        <div class="flex items-end gap-2 rounded-xl bg-pos-sunken p-3">
          <label class="pos-field flex-1">
            <span class="pos-label">{{ t('admin.settings.deliveryRates.colHome') }}</span>
            <input v-model.number="bulkHome" type="number" inputmode="numeric" min="0" step="1" class="pos-input pos-num" />
          </label>
          <button type="button" class="pos-btn-soft" @click="applyHomeToAll">{{ t('admin.settings.deliveryRates.applyHomeAll') }}</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="pos-skeleton h-64 rounded-2xl" />

    <form v-else class="pos-surface flex flex-col overflow-hidden" @submit.prevent="save">
      <div class="p-4">
        <div class="relative max-w-sm">
          <Search class="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-pos-faint" aria-hidden="true" />
          <input v-model="search" type="search" class="pos-input pos-input-icon" :placeholder="t('admin.settings.deliveryRates.search')" :aria-label="t('admin.settings.deliveryRates.search')" />
        </div>
      </div>
      <div class="max-h-[60vh] overflow-auto border-t border-pos-line">
        <table class="pos-table min-w-[560px]">
          <thead>
            <tr>
              <th scope="col">{{ t('admin.settings.deliveryRates.colWilaya') }}</th>
              <th scope="col">{{ t('admin.settings.deliveryRates.colStopdesk') }}</th>
              <th scope="col">{{ t('admin.settings.deliveryRates.colHome') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in filtered" :key="row.wilaya">
              <td class="font-medium text-pos-ink">{{ row.wilaya }}</td>
              <td>
                <div class="flex items-center gap-3">
                  <input
                    :value="row.stopdeskFee"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    step="1"
                    class="pos-input h-9 w-28 pos-num disabled:bg-pos-sunken disabled:text-pos-faint"
                    :disabled="row.stopdeskFree"
                    :aria-label="`${row.wilaya} · ${t('admin.settings.deliveryRates.colStopdesk')}`"
                    @input="onStopdeskAmount(row, Number(($event.target as HTMLInputElement).value))"
                  />
                  <label class="inline-flex cursor-pointer items-center gap-2 text-[13px] text-pos-ink-2">
                    <input type="checkbox" class="h-4 w-4" :checked="row.stopdeskFree" @change="onStopdeskFree(row, ($event.target as HTMLInputElement).checked)" />
                    {{ t('admin.settings.deliveryRates.free') }}
                  </label>
                </div>
              </td>
              <td>
                <div class="flex items-center gap-3">
                  <input
                    :value="row.homeFee"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    step="1"
                    class="pos-input h-9 w-28 pos-num disabled:bg-pos-sunken disabled:text-pos-faint"
                    :disabled="row.homeFree"
                    :aria-label="`${row.wilaya} · ${t('admin.settings.deliveryRates.colHome')}`"
                    @input="onHomeAmount(row, Number(($event.target as HTMLInputElement).value))"
                  />
                  <label class="inline-flex cursor-pointer items-center gap-2 text-[13px] text-pos-ink-2">
                    <input type="checkbox" class="h-4 w-4" :checked="row.homeFree" @change="onHomeFree(row, ($event.target as HTMLInputElement).checked)" />
                    {{ t('admin.settings.deliveryRates.free') }}
                  </label>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-col gap-3 border-t border-pos-line bg-pos-sunken/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p v-if="error" class="text-[13px] text-pos-err" role="alert">{{ error }}</p>
        <p v-else-if="isDirty" class="text-[13px] text-pos-warn">{{ t('admin.product.unsavedChanges') }}</p>
        <p v-else class="text-[13px] text-pos-ok" aria-live="polite">{{ message }}</p>
        <button type="submit" class="pos-btn-primary" :disabled="saving || !isDirty">
          {{ saving ? t('common.saving') : t('admin.settings.deliveryRates.save') }}
        </button>
      </div>
    </form>
  </section>
</template>
