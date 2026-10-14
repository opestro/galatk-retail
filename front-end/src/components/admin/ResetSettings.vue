<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { AlertTriangle } from 'lucide-vue-next'
import { apiErrorMessage } from '@/services/products'
import { resetData, type ResetSelection } from '@/services/siteSettings'
import { useToast } from '@/composables/useToast'

/**
 * Owner-only data reset. Some choices imply others (products → orders → credit,
 * clients → their orders and credit); `implied` shows what will be removed too.
 */
const { t } = useI18n()
const toast = useToast()

const CONFIRM_WORD = 'RESET'
const selection = ref<ResetSelection>({
  staff: false,
  stock: '',
  products: '',
  orders: false,
  clients: false,
  credit: false,
})
const confirmation = ref('')
const busy = ref(false)
const error = ref('')

const hasSelection = computed(() => {
  const s = selection.value
  return s.staff || !!s.stock || !!s.products || s.orders || s.clients || s.credit
})

const implied = computed(() => {
  const s = selection.value
  const list: string[] = []
  const allOrders = s.orders || s.products === 'delete'
  if (s.products === 'delete') list.push(t('admin.settings.reset.impliedProducts'))
  if (allOrders && !s.orders) list.push(t('admin.settings.reset.impliedOrders'))
  if (s.clients && !allOrders) list.push(t('admin.settings.reset.impliedClientOrders'))
  if ((allOrders || s.clients) && !s.credit) list.push(t('admin.settings.reset.impliedCredit'))
  return list
})

const canSubmit = computed(() => hasSelection.value && confirmation.value.trim() === CONFIRM_WORD && !busy.value)

async function submit() {
  if (!canSubmit.value) return
  busy.value = true
  error.value = ''
  try {
    await resetData(selection.value, confirmation.value.trim())
    toast.success(t('admin.settings.reset.done'))
    selection.value = { staff: false, stock: '', products: '', orders: false, clients: false, credit: false }
    confirmation.value = ''
  } catch (e) {
    error.value = apiErrorMessage(e, t('admin.settings.reset.failed'))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="pos-surface flex max-w-2xl flex-col">
    <div class="px-6 pt-6 pb-2">
      <h2 class="section-title">{{ t('admin.settings.reset.title') }}</h2>
      <p class="mt-1 text-[13px] text-pos-muted">{{ t('admin.settings.reset.hint') }}</p>
    </div>

    <form class="flex flex-col" @submit.prevent="submit">
      <div class="flex flex-col gap-5 p-6">
        <label class="flex items-start gap-3">
          <input v-model="selection.staff" type="checkbox" class="mt-1 h-4 w-4" />
          <span>
            <span class="block text-[14px] font-medium text-pos-ink">{{ t('admin.settings.reset.staff') }}</span>
            <span class="block text-[12px] text-pos-muted">{{ t('admin.settings.reset.staffHint') }}</span>
          </span>
        </label>

        <div v-for="key in ['stock', 'products'] as const" :key="key" class="pos-field">
          <span class="pos-label">{{ t(`admin.settings.reset.${key}`) }}</span>
          <select v-model="selection[key]" class="pos-input">
            <option value="">{{ t('admin.settings.reset.keep') }}</option>
            <option value="zero">{{ t(`admin.settings.reset.${key}Zero`) }}</option>
            <option value="delete">{{ t(`admin.settings.reset.${key}Delete`) }}</option>
          </select>
        </div>

        <label v-for="key in ['orders', 'clients', 'credit'] as const" :key="key" class="flex items-start gap-3">
          <input v-model="selection[key]" type="checkbox" class="mt-1 h-4 w-4" />
          <span>
            <span class="block text-[14px] font-medium text-pos-ink">{{ t(`admin.settings.reset.${key}`) }}</span>
            <span class="block text-[12px] text-pos-muted">{{ t(`admin.settings.reset.${key}Hint`) }}</span>
          </span>
        </label>

        <ul v-if="implied.length" class="pos-notice flex-col items-start bg-pos-sunken text-pos-ink-2">
          <li v-for="line in implied" :key="line">• {{ line }}</li>
        </ul>

        <p class="pos-notice bg-pos-err-bg text-pos-err">
          <AlertTriangle class="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          {{ t('admin.settings.reset.warning') }}
        </p>

        <label class="pos-field">
          <span class="pos-label">{{ t('admin.settings.reset.confirmLabel', { word: CONFIRM_WORD }) }}</span>
          <input v-model="confirmation" class="pos-input" autocomplete="off" :placeholder="CONFIRM_WORD" />
        </label>
        <p v-if="error" class="pos-notice bg-pos-err-bg text-pos-err" role="alert">{{ error }}</p>
      </div>
      <div class="flex justify-end border-t border-pos-line bg-pos-sunken/60 px-6 py-4">
        <button type="submit" class="pos-btn-danger" :disabled="!canSubmit">
          {{ busy ? t('common.saving') : t('admin.settings.reset.submit') }}
        </button>
      </div>
    </form>
  </section>
</template>
